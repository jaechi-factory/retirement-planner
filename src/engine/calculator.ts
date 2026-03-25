import type { PlannerInputs } from '../types/inputs';
import type { YearlySnapshot } from '../types/calculation';
import type { DebtSchedules } from './debtSchedule';
import type { HousingPolicy } from './housingPolicy';
import { HOUSING_LIQUIDATION_HAIRCUT, POST_SALE_HOUSING_COST_YIELD } from './housingPolicy';
import { HOUSING_ANNUITY_MIN_AGE, getHousingAnnuityMonthlyRate } from './housingAnnuity';
import {
  calcFinancialWeightedReturn,
  calcFinancialTotalAsset,
  precomputeDebtSchedules,
  calcTotalAnnualRepaymentFromSchedules,
  calcTotalRemainingDebtFromSchedules,
} from './assetWeighting';
import { getAnnualPensionIncomeForAge } from './pensionEstimation';

/** 주택연금 최대 주택가격 상한 (만원: 12억 = 120,000만원) */
const HOUSING_ANNUITY_PRICE_CAP = 120_000;

/**
 * 연간 시뮬레이션 실행 (2버킷: 금융자산 / 부동산 분리 + 주택 활용 정책)
 *
 * - 금융자산: 현금+예금+주식+채권+코인 — 생활비·소득 모두 반영
 * - 부동산: 별도 기대수익률로 성장, 정책에 따라 활용
 * - 지속 가능성 판단: 금융자산이 0 미만이 되지 않아야 함
 *
 * 정책(HousingPolicy):
 *  - 'keep'      (A): 집 그대로 — 금융자산이 바닥나도 집은 건드리지 않음
 *  - 'annuity'   (B): 금융자산 고갈 시 주택연금 개시 (만 55세 이상)
 *  - 'liquidate' (C): 금융자산 고갈 시 집 매각 후 임대
 *
 * @param prebuiltSchedules 이진탐색 바깥에서 선계산된 스케줄 (있으면 재사용)
 */
export function simulate(
  inputs: PlannerInputs,
  testMonthlyInCurrentValue: number,
  policy: HousingPolicy = 'keep',
  prebuiltSchedules?: DebtSchedules,
): YearlySnapshot[] {
  const { goal, status, assets, debts, children, pension } = inputs;
  const { retirementAge, lifeExpectancy, inflationRate } = goal;
  const { currentAge, annualIncome, incomeGrowthRate, annualExpense, expenseGrowthRate } = status;

  const inflationDecimal = inflationRate / 100;
  const incomeGrowthDecimal = incomeGrowthRate / 100;
  const expenseGrowthDecimal = expenseGrowthRate / 100;

  // 금융자산 전용 수익률 (부동산 제외)
  const financialReturnDecimal = calcFinancialWeightedReturn(assets) / 100;
  // 부동산 수익률
  const housingReturnDecimal = assets.realEstate.expectedReturn / 100;

  // 부채 스케줄
  const debtSchedules = prebuiltSchedules ?? precomputeDebtSchedules(debts);

  const annualChildExpense = children.hasChildren
    ? children.count * children.monthlyPerChild * 12
    : 0;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementMonthlyNominal =
    testMonthlyInCurrentValue * Math.pow(1 + inflationDecimal, yearsToRetirement);

  // 2버킷 초기값
  let currentFinancialAsset = calcFinancialTotalAsset(assets);
  let currentHousingAsset = assets.realEstate.amount;

  // 주택 정책 상태
  let housingAnnuityActive = false;
  let housingAnnuityAnnualNominal = 0;
  let housingLiquidated = false;
  let postSaleAnnualCostNominal = 0;

  const snapshots: YearlySnapshot[] = [];

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const yearsFromNow = age - currentAge;
    const isRetired = age >= retirementAge;

    let investReturn = 0;
    let incomeThisYear = 0;
    let pensionThisYear = 0;
    let expenseThisYear = 0;
    let debtRepayThisYear = 0;
    let childExpThisYear = 0;
    let annuityIncomeThisYear = 0;
    let postSaleCostThisYear = 0;

    if (age > currentAge) {
      // 금융자산 투자수익
      investReturn = Math.max(0, currentFinancialAsset) * financialReturnDecimal;

      childExpThisYear =
        children.hasChildren && age <= children.independenceAge
          ? annualChildExpense * Math.pow(1 + inflationDecimal, yearsFromNow - 1)
          : 0;

      debtRepayThisYear = calcTotalAnnualRepaymentFromSchedules(debtSchedules, yearsFromNow - 1);

      pensionThisYear = getAnnualPensionIncomeForAge(
        pension,
        currentAge,
        age,
        inflationRate,
        annualIncome,
        retirementAge,
      );

      if (!isRetired) {
        incomeThisYear = annualIncome * Math.pow(1 + incomeGrowthDecimal, yearsFromNow - 1);
        expenseThisYear = annualExpense * Math.pow(1 + expenseGrowthDecimal, yearsFromNow - 1);
      } else {
        const yearsAfterRetirement = age - retirementAge;
        expenseThisYear = retirementMonthlyNominal * 12 * Math.pow(1 + inflationDecimal, yearsAfterRetirement);
      }

      // 금융자산 잠정 업데이트 (정책 반영 전)
      currentFinancialAsset =
        currentFinancialAsset +
        investReturn +
        incomeThisYear +
        pensionThisYear -
        expenseThisYear -
        debtRepayThisYear -
        childExpThisYear;

      // ── 주택 정책 적용 ──────────────────────────────────────────────

      if (policy === 'annuity' && !housingAnnuityActive && !housingLiquidated) {
        // 금융자산 고갈 + 55세 이상 + 부동산 있을 때 주택연금 개시
        if (currentFinancialAsset < 0 && age >= HOUSING_ANNUITY_MIN_AGE && currentHousingAsset > 0) {
          housingAnnuityActive = true;
          const cappedHousingValue = Math.min(currentHousingAsset, HOUSING_ANNUITY_PRICE_CAP);
          const monthlyRate = getHousingAnnuityMonthlyRate(age);
          housingAnnuityAnnualNominal = cappedHousingValue * monthlyRate * 12;
        }
      }

      if (housingAnnuityActive) {
        annuityIncomeThisYear = housingAnnuityAnnualNominal;
        currentFinancialAsset += annuityIncomeThisYear;
      }

      if (policy === 'liquidate' && !housingLiquidated && !housingAnnuityActive) {
        // 금융자산 고갈 + 부동산 있을 때 집 매각
        if (currentFinancialAsset < 0 && currentHousingAsset > 0) {
          housingLiquidated = true;
          const remainingDebtNow = calcTotalRemainingDebtFromSchedules(debtSchedules, yearsFromNow - 1);
          const grossProceeds = currentHousingAsset;
          const netProceeds = grossProceeds * (1 - HOUSING_LIQUIDATION_HAIRCUT) - Math.max(0, remainingDebtNow);
          const safeProceeds = Math.max(0, netProceeds);

          currentFinancialAsset += safeProceeds;
          currentHousingAsset = 0;

          // 매각 후 연 임대비 (명목값 — 이 나이 이후 물가 연동 없이 고정)
          postSaleAnnualCostNominal = safeProceeds * POST_SALE_HOUSING_COST_YIELD;
        }
      }

      if (housingLiquidated) {
        postSaleCostThisYear = postSaleAnnualCostNominal;
        currentFinancialAsset -= postSaleCostThisYear;
      }

      // 부동산 별도 성장 (연금 미개시 구간만, 매각 후 0)
      if (!housingAnnuityActive) {
        currentHousingAsset = currentHousingAsset * (1 + housingReturnDecimal);
      }
    }

    // 연도말 잔여 부채
    const remainingDebt = calcTotalRemainingDebtFromSchedules(debtSchedules, yearsFromNow - 1);

    const grossAssetEnd = currentFinancialAsset + currentHousingAsset;
    const netAssetEnd = grossAssetEnd - remainingDebt;
    const netCashflow =
      investReturn + incomeThisYear + pensionThisYear + annuityIncomeThisYear -
      expenseThisYear - debtRepayThisYear - childExpThisYear - postSaleCostThisYear;

    snapshots.push({
      age,
      isRetired,
      financialAssetEnd: currentFinancialAsset,
      housingAssetEnd: currentHousingAsset,
      grossAssetEnd,
      remainingDebtEnd: remainingDebt,
      netAssetEnd,
      totalAsset: netAssetEnd,
      annualInvestmentReturn: investReturn,
      annualIncomeThisYear: incomeThisYear,
      annualPensionIncomeThisYear: pensionThisYear,
      annualExpenseThisYear: expenseThisYear,
      annualDebtRepaymentThisYear: debtRepayThisYear,
      annualChildExpenseThisYear: childExpThisYear,
      annualNetCashflow: netCashflow,
      housingAnnuityIncomeThisYear: annuityIncomeThisYear || undefined,
      postSaleHousingCostThisYear: postSaleCostThisYear || undefined,
    });
  }

  return snapshots;
}

/**
 * 금융자산이 모든 기간에서 0 이상이면 지속 가능.
 * (주택 활용 시나리오에서는 정책 소득이 financialAsset에 반영되므로 이 기준으로 판단)
 */
export function isSustainable(snapshots: YearlySnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  return snapshots.every(s => s.financialAssetEnd >= 0);
}

/** 순자산이 처음 0 미만이 되는 나이 (전체 파산) */
export function findDepletionAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.netAssetEnd < 0);
  return snapshot ? snapshot.age : null;
}

/** 금융자산이 처음 0 미만이 되는 나이 (유동자산 고갈 경보) */
export function findFinancialStressAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.financialAssetEnd < 0);
  return snapshot ? snapshot.age : null;
}

/** 주택연금이 개시되는 나이 */
export function findHousingAnnuityStartAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.housingAnnuityIncomeThisYear && s.housingAnnuityIncomeThisYear > 0);
  return snapshot ? snapshot.age : null;
}

/** 집 매각이 발생하는 나이 */
export function findHousingLiquidationAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.postSaleHousingCostThisYear !== undefined && s.housingAssetEnd === 0);
  if (!snapshot) return null;
  // 매각 연도는 처음으로 housingAssetEnd가 0이 되는 시점
  const idx = snapshots.indexOf(snapshot);
  return idx > 0 ? snapshots[idx].age : null;
}
