/**
 * V2 월 단위 시뮬레이터 (정책 확정판)
 *
 * ── 확정 정책 ────────────────────────────────────────────────────────────────
 *
 * [P1] 6버킷 개별 수익률
 *   cash / deposit / stock_kr / stock_us / bond / crypto 각자 수익률 적용.
 *   realEstate는 별도 성장.
 *
 * [P2] 잉여 재투자 — 초기 비중 고정
 *   새로 남는 돈은 시뮬레이션 시작 시점의 초기 비중대로 계속 배분한다.
 *   중간에 자산 비율이 바뀌어도 자동 리밸런싱은 하지 않는다 (의도된 정책).
 *   분배 대상: cash, deposit, stock_kr, stock_us, bond, crypto (realEstate 제외).
 *
 * [P3] 매도 우선순위 (생활비 부족 시)
 *   cash → deposit → bond → stock_kr → stock_us → crypto
 *   가장 유동적·안전한 자산부터 차감.
 *
 * [P4] 첫 해 처리
 *   currentAge 연도도 일반 연도와 동일하게 처리.
 *   소득/지출/대출/자녀비용 모두 첫 달부터 반영.
 *   부채 스케줄 index = totalMonthIndex (offset 없음).
 *
 * [P5] 담보 활용 이자 정책
 *   draw 당월에는 이자를 붙이지 않는다.
 *   draw 다음 달부터 월 이자가 발생한다.
 *   구현: 이자 계산을 매월 루프 최상단(수익 발생 단계)에서 처리.
 *
 * [P6] 과매도 방지
 *   은퇴 후 부족 상황에서 "생활비 부족분 + 버퍼 부족분"을 합산해
 *   한 번의 인출 로직으로 처리한다. 같은 월에 이중 인출 없음.
 *   잉여 상황에서는 분배 후 버퍼 top-up(재배분)이 추가로 가능하다.
 *
 * [P7] 부동산 전략
 *   keep / secured_loan / sell — 변경 없음.
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { PlannerInputs } from '../types/inputs';
import type { MonthlySnapshotV2, SnapshotEventFlags, YearlyAggregateV2 } from '../types/calculationV2';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
import type { PropertyStrategyV2 } from './propertyStrategiesV2';
import { getPlannerPolicy } from '../policy/policyTable';
import { precomputeDebtSchedules } from './assetWeighting';
import type { DebtSchedules } from './debtSchedule';
import { getAnnualPensionIncomeForAge } from './pensionEstimation';

// ─── 버킷 타입 ────────────────────────────────────────────────────────────────

interface FinancialBuckets {
  cash: number;
  deposit: number;
  stock_kr: number;
  stock_us: number;
  bond: number;
  crypto: number;
}

/**
 * [P3] 매도 우선순위: 가장 유동적·안전한 자산부터
 * cash → deposit → bond → stock_kr → stock_us → crypto
 */
const LIQUIDATION_ORDER: (keyof FinancialBuckets)[] = [
  'cash', 'deposit', 'bond', 'stock_kr', 'stock_us', 'crypto',
];

/** 투자자산 버킷 (financialInvestableEnd 집계용) */
const FINANCIAL_KEYS: (keyof FinancialBuckets)[] = [
  'stock_kr', 'stock_us', 'bond', 'crypto',
];

// ─── 헬퍼 함수 ───────────────────────────────────────────────────────────────

/** 연 수익률(%) → 월 수익률 (복리 기준) */
function annualToMonthlyRate(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

/** 버킷별 월 수익률 맵 */
function computeBucketRates(assets: PlannerInputs['assets']): FinancialBuckets {
  return {
    cash:     annualToMonthlyRate(assets.cash.expectedReturn),
    deposit:  annualToMonthlyRate(assets.deposit.expectedReturn),
    stock_kr: annualToMonthlyRate(assets.stock_kr.expectedReturn),
    stock_us: annualToMonthlyRate(assets.stock_us.expectedReturn),
    bond:     annualToMonthlyRate(assets.bond.expectedReturn),
    crypto:   annualToMonthlyRate(assets.crypto.expectedReturn),
  };
}

/**
 * [P2] 초기 비중 계산
 * 분배 대상: cash + deposit + stock_kr + stock_us + bond + crypto (realEstate 제외)
 * 합이 0이면 cash 100%.
 */
function computeInitialRatios(assets: PlannerInputs['assets']): FinancialBuckets {
  const total =
    assets.cash.amount + assets.deposit.amount +
    assets.stock_kr.amount + assets.stock_us.amount +
    assets.bond.amount + assets.crypto.amount;

  if (total <= 0) {
    return { cash: 1, deposit: 0, stock_kr: 0, stock_us: 0, bond: 0, crypto: 0 };
  }
  return {
    cash:     assets.cash.amount / total,
    deposit:  assets.deposit.amount / total,
    stock_kr: assets.stock_kr.amount / total,
    stock_us: assets.stock_us.amount / total,
    bond:     assets.bond.amount / total,
    crypto:   assets.crypto.amount / total,
  };
}

/** [P2] 잉여금을 초기 비중대로 모든 버킷에 분배 */
function distributeSurplus(
  buckets: FinancialBuckets,
  amount: number,
  ratios: FinancialBuckets,
): void {
  for (const key of LIQUIDATION_ORDER) {
    buckets[key] += amount * ratios[key];
  }
}

/**
 * [P3][P6] 우선순위 순서로 버킷에서 인출.
 * 투자자산(bond/stock_kr/stock_us/crypto) 첫 매도 시 financialSellStarted 플래그.
 * @returns 미충당 잔액 (0 = 완전 충당)
 */
function drawFromBuckets(
  buckets: FinancialBuckets,
  needed: number,
  financialSellState: { everStarted: boolean },
  eventFlags: SnapshotEventFlags,
): number {
  let remaining = needed;
  for (const key of LIQUIDATION_ORDER) {
    if (remaining <= 0) break;
    const available = Math.max(0, buckets[key]);
    const drawn = Math.min(remaining, available);
    if (drawn > 0) {
      buckets[key] -= drawn;
      remaining -= drawn;
      if (FINANCIAL_KEYS.includes(key) && !financialSellState.everStarted) {
        financialSellState.everStarted = true;
        eventFlags.financialSellStarted = true;
      }
    }
  }
  return Math.max(0, remaining);
}

/**
 * [P6] 은퇴 후 유동성 버퍼 top-up.
 * cashLike < buffer일 때 투자자산(FINANCIAL_KEYS 순)을 팔아 cash에 보충.
 * 잉여 상황(netFlow >= 0) 이후 호출. 부족 상황에서는 drawFromBuckets로 통합 처리.
 */
function topUpCashBuffer(
  buckets: FinancialBuckets,
  buffer: number,
  financialSellState: { everStarted: boolean },
  eventFlags: SnapshotEventFlags,
): void {
  const cashLike = buckets.cash + buckets.deposit;
  if (cashLike >= buffer) return;

  let needed = buffer - cashLike;
  for (const key of FINANCIAL_KEYS) {
    if (needed <= 0) break;
    const available = Math.max(0, buckets[key]);
    const drawn = Math.min(needed, available);
    if (drawn > 0) {
      buckets[key] -= drawn;
      buckets.cash += drawn;
      needed -= drawn;
      if (!financialSellState.everStarted) {
        financialSellState.everStarted = true;
        eventFlags.financialSellStarted = true;
      }
    }
  }
}

/** 월 부채 상환액 (scheduleIndex = 0-based) */
function getMonthlyDebtService(schedules: DebtSchedules, scheduleIndex: number): number {
  const get = (rows: { payment: number }[]) => rows[scheduleIndex]?.payment ?? 0;
  return get(schedules.mortgage) + get(schedules.creditLoan) + get(schedules.otherLoan);
}

/** 주담대 월 납입액만 반환 (집 매각 후 이중 상환 방지용) */
function getMortgagePayment(schedules: DebtSchedules, scheduleIndex: number): number {
  return schedules.mortgage[scheduleIndex]?.payment ?? 0;
}

/** 잔여 부채 합계 */
function getRemainingDebt(schedules: DebtSchedules, scheduleIndex: number): number {
  const get = (rows: { remainingBalance: number }[]) =>
    rows[scheduleIndex]?.remainingBalance ?? 0;
  return get(schedules.mortgage) + get(schedules.creditLoan) + get(schedules.otherLoan);
}

/** 주담대 잔액만 반환 (집 매각 시 주담대만 상환하는 경우) */
function getRemainingMortgageBalance(schedules: DebtSchedules, scheduleIndex: number): number {
  return schedules.mortgage[scheduleIndex]?.remainingBalance ?? 0;
}

/** 비담보 대출(신용·기타) 잔액 합산 — A1b: finalNetWorth 차감 용 */
function getNonMortgageDebt(schedules: DebtSchedules, scheduleIndex: number): number {
  const get = (rows: { remainingBalance: number }[]) =>
    rows[scheduleIndex]?.remainingBalance ?? 0;
  return get(schedules.creditLoan) + get(schedules.otherLoan);
}

// ─── 메인 시뮬레이터 ──────────────────────────────────────────────────────────

/** V2 월별 시뮬레이션 */
export function simulateMonthlyV2(
  inputs: PlannerInputs,
  testMonthlyInCurrentValue: number,
  propertyStrategy: PropertyStrategyV2,
  fundingPolicy: FundingPolicy,
  _liquidationPolicy: LiquidationPolicy,
  prebuiltSchedules?: DebtSchedules,
): MonthlySnapshotV2[] {
  const { goal, status, assets, debts, children, pension } = inputs;
  const { retirementAge, lifeExpectancy, inflationRate } = goal;
  const { currentAge, annualIncome, incomeGrowthRate, annualExpense, expenseGrowthRate } = status;

  const monthlyInflation    = annualToMonthlyRate(inflationRate);
  const monthlyIncomeGrowth = annualToMonthlyRate(incomeGrowthRate);
  const monthlyExpenseGrowth = annualToMonthlyRate(expenseGrowthRate);

  const plannerPolicy          = getPlannerPolicy();
  const propertyPolicy         = plannerPolicy.property;

  // [P5] 담보대출 월 이자율 — draw 다음 달부터 적용
  // 【금리 컨벤션】 APR/12 단순 분할 방식을 의도적으로 사용한다.
  //   - 한국 대출 관행: 주담대·신용대출 금리는 APR 기준으로 고지·청구됨.
  //   - 부채 영역 일관성: debtSchedule.ts의 모기지·기타대출 스케줄도
  //     동일하게 interestRate / 100 / 12 방식을 사용한다.
  //   - 자산 수익률(annualToMonthlyRate, 월복리 동치)과 다른 컨벤션이지만,
  //     이는 자산/부채 도메인의 관행 차이를 반영한 의도적 설계다.
  //   - 실효 오차: 연 4.5% 기준 실효연이율 4.594% (과다 0.094%p, 보수적 방향).
  const securedLoanMonthlyRate = propertyPolicy.securedLoanAnnualRate / 12;
  const propertyMonthlyRate    = annualToMonthlyRate(assets.realEstate.expectedReturn);
  const saleInvestMonthlyRate  = annualToMonthlyRate(propertyPolicy.saleProceedsAnnualReturn * 100);

  const bucketRates   = computeBucketRates(assets);
  const initialRatios = computeInitialRatios(assets); // [P2] 고정 비중
  const debtSchedules = prebuiltSchedules ?? precomputeDebtSchedules(debts);

  // ── 버킷 초기값 ──────────────────────────────────────────────────────────
  const buckets: FinancialBuckets = {
    cash:     Math.max(0, assets.cash.amount),
    deposit:  Math.max(0, assets.deposit.amount),
    stock_kr: Math.max(0, assets.stock_kr.amount),
    stock_us: Math.max(0, assets.stock_us.amount),
    bond:     Math.max(0, assets.bond.amount),
    crypto:   Math.max(0, assets.crypto.amount),
  };

  let propertyValue            = Math.max(0, assets.realEstate.amount);
  let securedLoanBalance       = 0;
  let propertySaleProceedsBucket = 0;   // 시각화 전용 추적
  let saleInvestBalance        = 0;     // 매각 대금 운용 잔액 (이자 붙는 실제 잔고)
  let propertySold             = false;
  let propertyInterventionStarted = false;
  let baseRentalMonthlyAtSale  = 0;
  let propertySaleMonthIndex   = -1;

  const financialSellState = { everStarted: false };
  let financialEverExhausted = false;

  // 은퇴 시점 명목 월 생활비 (현재가치 → 은퇴 시점 명목)
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementMonthlyNominal =
    testMonthlyInCurrentValue * Math.pow(1 + inflationRate / 100, yearsToRetirement);

  // 자녀 연 지출 (현재가치)
  const annualChildExpense =
    children.hasChildren ? children.count * children.monthlyPerChild * 12 : 0;

  const snapshots: MonthlySnapshotV2[] = [];

  for (let ageYear = currentAge; ageYear <= lifeExpectancy; ageYear++) {
    // 연금은 ageYear만 달라지고 ageMonthIndex에는 무관 → 연도별 1회만 계산
    const annualPensionForYear = getAnnualPensionIncomeForAge(
      pension, currentAge, ageYear, inflationRate, annualIncome, retirementAge,
    );

    for (let ageMonthIndex = 0; ageMonthIndex < 12; ageMonthIndex++) {

      // [P4] totalMonthIndex = 0부터 시작, offset 없음
      const totalMonthIndex = (ageYear - currentAge) * 12 + ageMonthIndex;
      const isRetired = ageYear >= retirementAge;
      const monthsFromNow = totalMonthIndex;

      const eventFlags: SnapshotEventFlags = {};

      // ── 1. 수익 발생 + [P5] 담보대출 이자 (전월 draw분) ──────────────
      // [P5] 이자는 draw 다음 달부터 발생. 이전 달의 잔고에 이자 적용.
      if (propertyStrategy === 'secured_loan' && securedLoanBalance > 0) {
        securedLoanBalance *= 1 + securedLoanMonthlyRate;
      }

      for (const key of LIQUIDATION_ORDER) {
        buckets[key] = Math.max(0, buckets[key]) * (1 + bucketRates[key]);
      }
      if (!propertySold) {
        propertyValue *= 1 + propertyMonthlyRate;
      } else if (saleInvestBalance > 0) {
        // 매각 대금 운용: 연 4% 복리 (draw 이전 잔고에 적용)
        saleInvestBalance *= 1 + saleInvestMonthlyRate;
      }

      // ── 2. 소득 / 연금 계산 ──────────────────────────────────────────
      // [P4] 첫 해(currentAge)도 정상 처리 — 특수 처리 없음
      const incomeThisMonth = !isRetired
        ? (annualIncome / 12) * Math.pow(1 + monthlyIncomeGrowth, monthsFromNow)
        : 0;

      const pensionThisMonth = annualPensionForYear / 12;

      // ── 3. 지출 계산 ──────────────────────────────────────────────────
      let expenseThisMonth = 0;
      if (!isRetired) {
        expenseThisMonth =
          (annualExpense / 12) * Math.pow(1 + monthlyExpenseGrowth, monthsFromNow);
      } else {
        const monthsAfterRetirement = (ageYear - retirementAge) * 12 + ageMonthIndex;
        expenseThisMonth =
          retirementMonthlyNominal * Math.pow(1 + monthlyInflation, monthsAfterRetirement);
      }

      // [P4] 부채상환: schedule index = totalMonthIndex (offset 없음, 첫 달부터 적용)
      // sell 전략 + all_debts: 매각 시 전체 잔존부채를 일괄 상환 → 이후 월 납입 0.
      // sell 전략 + mortgage_only: 주담대만 일괄 상환 → 이후 신용/기타 대출 납입은 유지.
      // [W4] all_debts 모드에서 이미 정산된 신용/기타 대출의 이중 상환 방지.
      const debtServiceThisMonth = propertySold
        ? propertyPolicy.saleDebtSettlementMode === 'all_debts'
          ? 0
          : getMonthlyDebtService(debtSchedules, totalMonthIndex) - getMortgagePayment(debtSchedules, totalMonthIndex)
        : getMonthlyDebtService(debtSchedules, totalMonthIndex);

      const childExpenseThisMonth =
        children.hasChildren && ageYear <= children.independenceAge
          ? (() => {
              const growthMode = children.costGrowthMode ?? 'inflation';
              if (growthMode === 'fixed') return annualChildExpense / 12;
              const annualGrowth = growthMode === 'custom'
                ? (children.customGrowthRate ?? inflationRate)
                : inflationRate;
              const monthlyGrowth = annualToMonthlyRate(annualGrowth);
              return (annualChildExpense / 12) * Math.pow(1 + monthlyGrowth, monthsFromNow);
            })()
          : 0;

      let rentalCostThisMonth = 0;
      if (propertySold && propertySaleMonthIndex >= 0) {
        const monthsSinceSale = totalMonthIndex - propertySaleMonthIndex;
        rentalCostThisMonth =
          baseRentalMonthlyAtSale * Math.pow(1 + monthlyInflation, monthsSinceSale);
      }

      // ── 4. 순현금흐름 처리 ───────────────────────────────────────────
      const netFlow =
        incomeThisMonth + pensionThisMonth -
        expenseThisMonth - debtServiceThisMonth -
        childExpenseThisMonth - rentalCostThisMonth;

      let uncoveredAmount = 0;

      if (!isRetired) {
        // ── 은퇴 전: 단순 잉여/부족 처리, 버퍼 없음 ──────────────────
        if (netFlow >= 0) {
          distributeSurplus(buckets, netFlow, initialRatios);
        } else {
          uncoveredAmount = drawFromBuckets(buckets, -netFlow, financialSellState, eventFlags);
          // 금융 버킷 소진 후에도 부족하면 매각 대금 운용 잔액에서 추가 인출
          if (uncoveredAmount > 0 && propertySold && saleInvestBalance > 0) {
            const drawFromSale = Math.min(uncoveredAmount, saleInvestBalance);
            saleInvestBalance -= drawFromSale;
            uncoveredAmount -= drawFromSale;
          }
        }
      } else {
        // ── 은퇴 후: [P6] 과매도 방지 — 부족 시 통합 인출 ───────────
        const monthsAfterRetirement = (ageYear - retirementAge) * 12 + ageMonthIndex;
        const currentExpenseNominal =
          retirementMonthlyNominal * Math.pow(1 + monthlyInflation, monthsAfterRetirement);
        const buffer = currentExpenseNominal * fundingPolicy.liquidityBufferMonths;

        if (netFlow >= 0) {
          // 잉여: 버킷 분배 후, 버퍼 top-up (재배분이므로 이중 인출 아님)
          distributeSurplus(buckets, netFlow, initialRatios);
          topUpCashBuffer(buckets, buffer, financialSellState, eventFlags);
        } else {
          // 부족: shortfall은 생활비(deficit)만으로 판정 → 이진탐색 단조성 보장
          // 그 후 버퍼 top-up을 별도 수행 (shortfall 계산에 영향 없음)
          const deficit = -netFlow;
          uncoveredAmount = drawFromBuckets(buckets, deficit, financialSellState, eventFlags);
          // 금융 버킷 소진 후에도 부족하면 매각 대금 운용 잔액에서 추가 인출
          if (uncoveredAmount > 0 && propertySold && saleInvestBalance > 0) {
            const drawFromSale = Math.min(uncoveredAmount, saleInvestBalance);
            saleInvestBalance -= drawFromSale;
            uncoveredAmount -= drawFromSale;
          }
          topUpCashBuffer(buckets, buffer, financialSellState, eventFlags);
        }
      }

      // 투자자산 소진 이벤트
      const financialTotal = FINANCIAL_KEYS.reduce((s, k) => s + buckets[k], 0);
      if (financialTotal <= 0 && !financialEverExhausted && financialSellState.everStarted) {
        financialEverExhausted = true;
        eventFlags.financialExhausted = true;
      }

      // 타임라인 카드용 매각 이벤트 원시값(해당 월만 값 보유)
      let propertySaleGrossProceedsThisMonth = 0;
      let propertySaleDebtSettledThisMonth = 0;
      let propertySaleNetProceedsThisMonth = 0;

      // ── 5. 부동산 전략 (미충당 잔액 있을 때) ─────────────────────────
      if (uncoveredAmount > 0 && propertyValue > 0) {
        if (propertyStrategy === 'secured_loan') {
          if (!propertyInterventionStarted) {
            propertyInterventionStarted = true;
            eventFlags.propertyInterventionStarted = true;
          }
          const maxLoan = propertyValue * propertyPolicy.securedLoanLtv;
          const availableHeadroom = Math.max(0, maxLoan - securedLoanBalance);
          const draw = Math.min(uncoveredAmount, availableHeadroom);
          if (draw > 0) {
            // [P5] draw 당월 이자 없음. 잔고만 증가. 이자는 다음 달 스텝 1에서 발생.
            securedLoanBalance += draw;
            buckets.cash += draw;
            uncoveredAmount -= draw;
          }

        } else if (propertyStrategy === 'sell' && !propertySold) {
          if (!propertyInterventionStarted) {
            propertyInterventionStarted = true;
            eventFlags.propertyInterventionStarted = true;
          }
          eventFlags.propertySold = true;

          const remainingMortgage = plannerPolicy.property.saleDebtSettlementMode === 'all_debts'
            ? getRemainingDebt(debtSchedules, totalMonthIndex)
            : getRemainingMortgageBalance(debtSchedules, totalMonthIndex);
          const salePrice = propertyValue;
          const grossProceedsAfterHaircut = salePrice * (1 - propertyPolicy.propertySaleHaircut);
          const netProceeds = Math.max(0, grossProceedsAfterHaircut - remainingMortgage);

          propertySaleGrossProceedsThisMonth = salePrice;
          propertySaleDebtSettledThisMonth = remainingMortgage;
          propertySaleNetProceedsThisMonth = netProceeds;

          // 매각 대금: cash 버킷 대신 별도 운용 잔액으로 관리 (연 4% 복리)
          saleInvestBalance = netProceeds;
          propertySaleProceedsBucket = netProceeds;  // 시각화 초기값 동기화

          // 월세: 현재가치 200만원을 매각 시점 명목가로 전환
          // (이후 rentalCostThisMonth에서 추가 물가 연동 계속됨)
          baseRentalMonthlyAtSale =
            propertyPolicy.rentalBaseMonthlyToday * Math.pow(1 + monthlyInflation, totalMonthIndex);

          propertySaleMonthIndex = totalMonthIndex;
          propertyValue = 0;
          propertySold = true;

          // 이번 달 부족분을 운용 잔액에서 우선 충당
          const drawFromSale = Math.min(uncoveredAmount, saleInvestBalance);
          saleInvestBalance -= drawFromSale;
          uncoveredAmount = Math.max(0, uncoveredAmount - drawFromSale);
        }
      }

      // ── 6. 매각 대금 버킷 추적 (시각화용) — saleInvestBalance와 동기화
      if (propertySold) {
        propertySaleProceedsBucket = saleInvestBalance;
      }

      // ── 7. 최종 정리 ─────────────────────────────────────────────────
      const shortfallThisMonth = uncoveredAmount;
      if (shortfallThisMonth > 0) eventFlags.failureOccurred = true;

      for (const key of LIQUIDATION_ORDER) {
        buckets[key] = Math.max(0, buckets[key]);
      }

      const cashLikeEnd          = buckets.cash + buckets.deposit;
      const financialInvestableEnd = FINANCIAL_KEYS.reduce((s, k) => s + buckets[k], 0);
      // [W1] sell 전략에서 집 매각 시 주담대를 일괄 상환하므로
      // 매각 이후에는 스케줄 잔액과 무관하게 0으로 강제한다.
      const propertyDebtEnd      = propertySold
        ? 0
        : getRemainingMortgageBalance(debtSchedules, totalMonthIndex);
      const nonMortgageDebtEnd   = getNonMortgageDebt(debtSchedules, totalMonthIndex);

      snapshots.push({
        ageYear,
        ageMonthIndex,
        cashLikeEnd,
        financialInvestableEnd,
        propertyValueEnd: propertyValue,
        propertyDebtEnd,
        nonMortgageDebtEnd,
        securedLoanBalanceEnd: securedLoanBalance,
        propertySaleProceedsBucketEnd: propertySaleProceedsBucket,
        propertySaleGrossProceedsThisMonth,
        propertySaleDebtSettledThisMonth,
        propertySaleNetProceedsThisMonth,
        shortfallThisMonth,
        incomeThisMonth,
        pensionThisMonth,
        expenseThisMonth,
        debtServiceThisMonth,
        childExpenseThisMonth,
        rentalCostThisMonth,
        eventFlags,
        // 개별 버킷 잔고 — 매도 순서 검증용
        cashEnd:    buckets.cash,
        depositEnd: buckets.deposit,
        bondEnd:    buckets.bond,
        stockKrEnd: buckets.stock_kr,
        stockUsEnd: buckets.stock_us,
        cryptoEnd:  buckets.crypto,
      });
    }
  }

  return snapshots;
}

// ─── 지속가능성 판단 ──────────────────────────────────────────────────────────

export function isSustainableV2(snapshots: MonthlySnapshotV2[]): boolean {
  if (snapshots.length === 0) return false;
  return snapshots.every((s) => s.shortfallThisMonth === 0);
}

// ─── 이벤트 나이 추출 ────────────────────────────────────────────────────────

export function findFinancialSellStartAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.eventFlags.financialSellStarted);
  return s ? s.ageYear : null;
}

export function findFinancialExhaustionAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.eventFlags.financialExhausted);
  return s ? s.ageYear : null;
}

export function findPropertyInterventionAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.eventFlags.propertyInterventionStarted);
  return s ? s.ageYear : null;
}

export function findFailureAgeV2(snapshots: MonthlySnapshotV2[]): number | null {
  const s = snapshots.find((m) => m.shortfallThisMonth > 0);
  return s ? s.ageYear : null;
}

// ─── 연도별 집계 ──────────────────────────────────────────────────────────────

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
    if (months.some((m) => m.eventFlags.financialSellStarted))    eventSummary.push('주식·채권 팔기 시작');
    if (months.some((m) => m.eventFlags.financialExhausted))      eventSummary.push('주식·채권 소진');
    if (months.some((m) => m.eventFlags.propertyInterventionStarted)) eventSummary.push('집 활용 시작');
    if (months.some((m) => m.eventFlags.propertySold))            eventSummary.push('집 팔기');
    if (months.some((m) => m.eventFlags.failureOccurred))         eventSummary.push('자금 부족');

    result.push({
      ageYear,
      cashLikeEnd: last.cashLikeEnd,
      financialInvestableEnd: last.financialInvestableEnd,
      propertyValueEnd: last.propertyValueEnd,
      securedLoanBalanceEnd: last.securedLoanBalanceEnd,
      propertySaleProceedsBucketEnd: last.propertySaleProceedsBucketEnd,
      totalShortfall:    months.reduce((s, m) => s + m.shortfallThisMonth, 0),
      totalIncome:       months.reduce((s, m) => s + m.incomeThisMonth, 0),
      totalPension:      months.reduce((s, m) => s + m.pensionThisMonth, 0),
      totalExpense:      months.reduce((s, m) => s + m.expenseThisMonth, 0),
      totalDebtService:  months.reduce((s, m) => s + m.debtServiceThisMonth, 0),
      totalChildExpense: months.reduce((s, m) => s + m.childExpenseThisMonth, 0),
      totalRentalCost:   months.reduce((s, m) => s + m.rentalCostThisMonth, 0),
      eventSummary,
      months,
    });
  }

  return result.sort((a, b) => a.ageYear - b.ageYear);
}
