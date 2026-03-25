/**
 * V2 월 단위 시뮬레이터
 *
 * 설계 원칙:
 * - 3버킷: cashLike(현금+예금) / financialInvestable(주식+채권+코인) / realEstate
 * - 유동성 버퍼: 목표 월 생활비 × liquidityBufferMonths 를 cashLike 최솟값으로 유지
 * - 매도 정책: LiquidationPolicy에 따라 투자자산을 필요분만 매도 (기본 = pro_rata)
 * - 부동산 전략: keep / secured_loan / sell
 * - 지속가능성: 전 기간 shortfallThisMonth === 0
 * - 모든 잔고: max(0, value) 클램핑, 음수 그래프 없음
 */

import type { PlannerInputs } from '../types/inputs';
import type { MonthlySnapshotV2, SnapshotEventFlags, YearlyAggregateV2 } from '../types/calculationV2';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
import type { PropertyStrategyV2 } from './propertyStrategiesV2';
import {
  PROPERTY_SALE_HAIRCUT,
  POST_SALE_RENTAL_ANNUAL_YIELD,
  SECURED_LOAN_LTV,
  SECURED_LOAN_ANNUAL_RATE,
} from './propertyStrategiesV2';
import { precomputeDebtSchedules } from './assetWeighting';
import type { DebtSchedules } from './debtSchedule';
import { getAnnualPensionIncomeForAge } from './pensionEstimation';

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

/** 연 수익률 → 월 수익률 (복리 기준) */
function annualToMonthlyRate(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

/** cashLike / financialInvestable 각각의 월 수익률 */
function computeMonthlyRates(assets: PlannerInputs['assets']): {
  cashLikeMonthlyRate: number;
  financialMonthlyRate: number;
  propertyMonthlyRate: number;
} {
  const cashTotal = assets.cash.amount + assets.deposit.amount;
  const cashWeighted =
    cashTotal > 0
      ? (assets.cash.amount * assets.cash.expectedReturn +
          assets.deposit.amount * assets.deposit.expectedReturn) /
        cashTotal
      : 0;

  const finAssets = [assets.stock_kr, assets.stock_us, assets.bond, assets.crypto];
  const finTotal = finAssets.reduce((s, a) => s + a.amount, 0);
  const finWeighted =
    finTotal > 0
      ? finAssets.reduce((s, a) => s + a.amount * a.expectedReturn, 0) / finTotal
      : 0;

  return {
    cashLikeMonthlyRate: annualToMonthlyRate(cashWeighted),
    financialMonthlyRate: annualToMonthlyRate(finWeighted),
    propertyMonthlyRate: annualToMonthlyRate(assets.realEstate.expectedReturn),
  };
}

/** 월 부채 상환액 — totalMonthIndex 기준 */
function getMonthlyDebtService(schedules: DebtSchedules, totalMonthIndex: number): number {
  const get = (rows: { payment: number }[]) => rows[totalMonthIndex]?.payment ?? 0;
  return get(schedules.mortgage) + get(schedules.creditLoan) + get(schedules.otherLoan);
}

/** 월 잔여 부채 합계 (연도말 기준) */
function getRemainingDebt(schedules: DebtSchedules, totalMonthIndex: number): number {
  const get = (rows: { remainingBalance: number }[]) =>
    rows[totalMonthIndex]?.remainingBalance ?? 0;
  return get(schedules.mortgage) + get(schedules.creditLoan) + get(schedules.otherLoan);
}

/** 투자자산 매도: 필요금액만 매도, LiquidationPolicy에 따라 분기 */
function sellFromFinancial(
  needed: number,
  financialInvestable: number,
  _policy: LiquidationPolicy,
): number {
  // V2 첫 버전: pro_rata = 단일 버킷이므로 "필요분만 매도"와 동일
  // high_volatility_first / low_return_first는 추후 서브버킷 분리 시 구현
  return Math.min(needed, Math.max(0, financialInvestable));
}

// ─── 메인 시뮬레이터 ──────────────────────────────────────────────────────────

/** V2 월별 시뮬레이션 실행 */
export function simulateMonthlyV2(
  inputs: PlannerInputs,
  testMonthlyInCurrentValue: number,
  propertyStrategy: PropertyStrategyV2,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
  prebuiltSchedules?: DebtSchedules,
): MonthlySnapshotV2[] {
  const { goal, status, assets, debts, children, pension } = inputs;
  const { retirementAge, lifeExpectancy, inflationRate } = goal;
  const { currentAge, annualIncome, incomeGrowthRate, annualExpense, expenseGrowthRate } = status;

  const monthlyInflation = annualToMonthlyRate(inflationRate);
  const monthlyIncomeGrowth = annualToMonthlyRate(incomeGrowthRate);
  const monthlyExpenseGrowth = annualToMonthlyRate(expenseGrowthRate);
  const securedLoanMonthlyRate = SECURED_LOAN_ANNUAL_RATE / 12;

  const { cashLikeMonthlyRate, financialMonthlyRate, propertyMonthlyRate } =
    computeMonthlyRates(assets);

  const debtSchedules = prebuiltSchedules ?? precomputeDebtSchedules(debts);

  // 버킷 초기값
  let cashLike = assets.cash.amount + assets.deposit.amount;
  let financialInvestable =
    assets.stock_kr.amount +
    assets.stock_us.amount +
    assets.bond.amount +
    assets.crypto.amount;
  let propertyValue = assets.realEstate.amount;

  // 부동산 전략 상태
  let securedLoanBalance = 0;
  let propertySaleProceedsBucket = 0;
  let propertySold = false;
  let propertyInterventionStarted = false;
  let baseRentalMonthlyAtSale = 0; // 매각 시점 기준 월 임대비 (이후 물가 연동)
  let propertySaleMonthIndex = -1; // 매각 발생 월 인덱스

  // 이벤트 플래그 (처음 발생 여부 추적)
  let financialSellEverStarted = false;
  let financialEverExhausted = false;

  // 은퇴 시점 명목 월 생활비 (현재가치 → 은퇴 시점 명목화)
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementMonthlyNominal =
    testMonthlyInCurrentValue * Math.pow(1 + inflationRate / 100, yearsToRetirement);

  // 자녀 월 지출 (현재가치 기준, 이후 물가 연동)
  const annualChildExpense =
    children.hasChildren ? children.count * children.monthlyPerChild * 12 : 0;

  const snapshots: MonthlySnapshotV2[] = [];

  for (let ageYear = currentAge; ageYear <= lifeExpectancy; ageYear++) {
    for (let ageMonthIndex = 0; ageMonthIndex < 12; ageMonthIndex++) {
      // 마지막 연도 월 보정 (lifeExpectancy 연도의 12월까지만)
      if (ageYear === lifeExpectancy && ageMonthIndex > 0) break;

      const totalMonthIndex = (ageYear - currentAge) * 12 + ageMonthIndex;
      const isRetired = ageYear >= retirementAge;
      const monthsFromNow = totalMonthIndex; // 현재로부터 경과 개월 수

      const flags: SnapshotEventFlags = {};

      // ── 1. 자산별 수익 발생 ─────────────────────────────────────────────
      const cashReturn = Math.max(0, cashLike) * cashLikeMonthlyRate;
      const financialReturn = Math.max(0, financialInvestable) * financialMonthlyRate;

      cashLike += cashReturn;
      financialInvestable += financialReturn;

      // 부동산: 매각 전까지 성장 (담보대출 전략에서는 계속 성장)
      if (!propertySold) {
        propertyValue *= 1 + propertyMonthlyRate;
      }

      // ── 2. 소득 / 연금 입금 ────────────────────────────────────────────
      let incomeThisMonth = 0;
      if (!isRetired && ageYear > currentAge) {
        incomeThisMonth =
          (annualIncome / 12) * Math.pow(1 + monthlyIncomeGrowth, monthsFromNow);
      } else if (!isRetired && ageYear === currentAge && ageMonthIndex === 0) {
        // 첫 달은 스냅샷 기준 — 소득 없음 (V1과 동일)
        incomeThisMonth = 0;
      }

      const pensionThisMonth =
        ageYear > currentAge
          ? getAnnualPensionIncomeForAge(
              pension,
              currentAge,
              ageYear,
              inflationRate,
              annualIncome,
              retirementAge,
            ) / 12
          : 0;

      cashLike += incomeThisMonth + pensionThisMonth;

      // ── 3. 지출 차감 ────────────────────────────────────────────────────
      let expenseThisMonth = 0;
      if (ageYear > currentAge) {
        if (!isRetired) {
          expenseThisMonth =
            (annualExpense / 12) * Math.pow(1 + monthlyExpenseGrowth, monthsFromNow);
        } else {
          const monthsAfterRetirement =
            (ageYear - retirementAge) * 12 + ageMonthIndex;
          expenseThisMonth =
            retirementMonthlyNominal * Math.pow(1 + monthlyInflation, monthsAfterRetirement);
        }
      }

      const debtServiceThisMonth = ageYear > currentAge
        ? getMonthlyDebtService(debtSchedules, totalMonthIndex - 1)
        : 0;

      const childExpenseThisMonth =
        children.hasChildren && ageYear > currentAge && ageYear <= children.independenceAge
          ? (annualChildExpense / 12) * Math.pow(1 + monthlyInflation, monthsFromNow)
          : 0;

      // 매각 후 임대비 (매각 시점 기준액에 물가 연동)
      let rentalCostThisMonth = 0;
      if (propertySold && propertySaleMonthIndex >= 0) {
        const monthsSinceSale = totalMonthIndex - propertySaleMonthIndex;
        rentalCostThisMonth = baseRentalMonthlyAtSale * Math.pow(1 + monthlyInflation, monthsSinceSale);
      }

      cashLike -= expenseThisMonth + debtServiceThisMonth + childExpenseThisMonth + rentalCostThisMonth;

      // ── 4. 투자자산 매도 (버퍼 유지) ────────────────────────────────────
      // 목표 월 생활비 명목치 기준 버퍼
      const monthsAfterRetirementForBuffer = isRetired
        ? (ageYear - retirementAge) * 12 + ageMonthIndex
        : 0;
      const targetMonthlyNominal = isRetired
        ? retirementMonthlyNominal * Math.pow(1 + monthlyInflation, monthsAfterRetirementForBuffer)
        : (annualExpense / 12) * Math.pow(1 + monthlyExpenseGrowth, monthsFromNow);
      const buffer = targetMonthlyNominal * fundingPolicy.liquidityBufferMonths;

      // cashLike가 음수거나 버퍼 이하이면 투자자산 매도
      if (cashLike < buffer && financialInvestable > 0) {
        const needed = buffer - cashLike;
        const sold = sellFromFinancial(needed, financialInvestable, liquidationPolicy);

        if (sold > 0) {
          financialInvestable -= sold;
          cashLike += sold;

          if (!financialSellEverStarted) {
            financialSellEverStarted = true;
            flags.financialSellStarted = true;
          }
        }
      }

      if (financialInvestable <= 0 && !financialEverExhausted && financialSellEverStarted) {
        financialEverExhausted = true;
        flags.financialExhausted = true;
      }

      // ── 5. 부동산 전략 적용 ─────────────────────────────────────────────
      if (cashLike < 0 && propertyValue > 0) {
        const stillNeeded = -cashLike;

        if (propertyStrategy === 'secured_loan') {
          // 담보대출 draw
          if (!propertyInterventionStarted) {
            propertyInterventionStarted = true;
            flags.propertyInterventionStarted = true;
          }
          const maxLoan = propertyValue * SECURED_LOAN_LTV;
          const availableHeadroom = Math.max(0, maxLoan - securedLoanBalance);
          const draw = Math.min(stillNeeded, availableHeadroom);
          if (draw > 0) {
            securedLoanBalance += draw;
            cashLike += draw;
          }
          // 담보대출 이자 (기존 잔고 기준)
          securedLoanBalance *= 1 + securedLoanMonthlyRate;

        } else if (propertyStrategy === 'sell' && !propertySold) {
          // 집 매각 (한 번만)
          if (!propertyInterventionStarted) {
            propertyInterventionStarted = true;
            flags.propertyInterventionStarted = true;
          }
          flags.propertySold = true;

          const remainingMortgage = getRemainingDebt(debtSchedules, totalMonthIndex);
          const grossProceeds = propertyValue * (1 - PROPERTY_SALE_HAIRCUT);
          const netProceeds = Math.max(0, grossProceeds - remainingMortgage);

          propertySaleProceedsBucket = netProceeds;
          baseRentalMonthlyAtSale = (netProceeds * POST_SALE_RENTAL_ANNUAL_YIELD) / 12;
          propertySaleMonthIndex = totalMonthIndex;
          cashLike += netProceeds;
          propertyValue = 0;
          propertySold = true;
        }
      } else if (cashLike < 0 && propertyStrategy === 'secured_loan' && securedLoanBalance > 0) {
        // 담보대출 이자 계속 발생 (부동산 없어도 대출 잔고 있으면)
        securedLoanBalance *= 1 + securedLoanMonthlyRate;
      }

      if (cashLike < buffer && !propertyInterventionStarted) {
        flags.cashBufferHit = true;
      }

      // ── 6. 프로씨즈 버킷 감소 ────────────────────────────────────────────
      if (propertySold && propertySaleProceedsBucket > 0) {
        // 매월 순지출(지출 - 수입)만큼 버킷 감소
        const netOutflow = Math.max(
          0,
          expenseThisMonth + debtServiceThisMonth + childExpenseThisMonth + rentalCostThisMonth -
            incomeThisMonth - pensionThisMonth,
        );
        propertySaleProceedsBucket = Math.max(0, propertySaleProceedsBucket - netOutflow);
      }

      // ── 7. 최종 정리 ─────────────────────────────────────────────────────
      const shortfallThisMonth = Math.max(0, -cashLike);
      if (shortfallThisMonth > 0) flags.failureOccurred = true;

      cashLike = Math.max(0, cashLike);
      financialInvestable = Math.max(0, financialInvestable);

      snapshots.push({
        ageYear,
        ageMonthIndex,
        cashLikeEnd: cashLike,
        financialInvestableEnd: financialInvestable,
        propertyValueEnd: propertyValue,
        propertyDebtEnd: ageYear > currentAge ? getRemainingDebt(debtSchedules, totalMonthIndex - 1) : getRemainingDebt(debtSchedules, 0),
        securedLoanBalanceEnd: securedLoanBalance,
        propertySaleProceedsBucketEnd: propertySaleProceedsBucket,
        shortfallThisMonth,
        incomeThisMonth,
        pensionThisMonth,
        expenseThisMonth,
        debtServiceThisMonth,
        childExpenseThisMonth,
        rentalCostThisMonth,
        eventFlags: flags,
      });
    }
  }

  return snapshots;
}

// ─── 지속가능성 판단 ──────────────────────────────────────────────────────────

/** V2 지속가능성: 전 기간 shortfallThisMonth === 0 */
export function isSustainableV2(snapshots: MonthlySnapshotV2[]): boolean {
  if (snapshots.length === 0) return false;
  return snapshots.every((s) => s.shortfallThisMonth === 0);
}

// ─── 이벤트 나이 추출 ────────────────────────────────────────────────────────

/** 현금성 버퍼 최초 미달 나이 (= 투자자산 매도 시작) */
export function findCashRunoutAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.eventFlags.financialSellStarted);
  return s ? s.ageYear : null;
}

/** 투자자산 최초 매도 나이 */
export function findFinancialSellStartAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.eventFlags.financialSellStarted);
  return s ? s.ageYear : null;
}

/** 투자자산 소진 나이 */
export function findFinancialExhaustionAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.eventFlags.financialExhausted);
  return s ? s.ageYear : null;
}

/** 부동산 전략 개시 나이 */
export function findPropertyInterventionAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.eventFlags.propertyInterventionStarted);
  return s ? s.ageYear : null;
}

/** 최종 실패 나이 (첫 shortfall 발생) */
export function findFailureAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.shortfallThisMonth > 0);
  return s ? s.ageYear : null;
}

// ─── 연도별 집계 ──────────────────────────────────────────────────────────────

/** 월별 스냅샷 → 연도별 집계 변환 */
export function aggregateToYearly(snapshots: MonthlySnapshotV2[]): YearlyAggregateV2[] {
  const byYear = new Map<number, MonthlySnapshotV2[]>();

  for (const s of snapshots) {
    if (!byYear.has(s.ageYear)) byYear.set(s.ageYear, []);
    byYear.get(s.ageYear)!.push(s);
  }

  const result: YearlyAggregateV2[] = [];

  for (const [ageYear, months] of byYear) {
    const last = months[months.length - 1];

    const eventSummary: string[] = [];
    if (months.some((m) => m.eventFlags.financialSellStarted)) eventSummary.push('주식·채권 팔기 시작');
    if (months.some((m) => m.eventFlags.financialExhausted)) eventSummary.push('주식·채권 소진');
    if (months.some((m) => m.eventFlags.propertyInterventionStarted)) eventSummary.push('집 활용 시작');
    if (months.some((m) => m.eventFlags.propertySold)) eventSummary.push('집 팔기');
    if (months.some((m) => m.eventFlags.failureOccurred)) eventSummary.push('자금 부족');

    result.push({
      ageYear,
      cashLikeEnd: last.cashLikeEnd,
      financialInvestableEnd: last.financialInvestableEnd,
      propertyValueEnd: last.propertyValueEnd,
      securedLoanBalanceEnd: last.securedLoanBalanceEnd,
      propertySaleProceedsBucketEnd: last.propertySaleProceedsBucketEnd,
      totalShortfall: months.reduce((s, m) => s + m.shortfallThisMonth, 0),
      totalIncome: months.reduce((s, m) => s + m.incomeThisMonth, 0),
      totalPension: months.reduce((s, m) => s + m.pensionThisMonth, 0),
      totalExpense: months.reduce((s, m) => s + m.expenseThisMonth, 0),
      totalDebtService: months.reduce((s, m) => s + m.debtServiceThisMonth, 0),
      totalChildExpense: months.reduce((s, m) => s + m.childExpenseThisMonth, 0),
      eventSummary,
      months,
    });
  }

  return result.sort((a, b) => a.ageYear - b.ageYear);
}
