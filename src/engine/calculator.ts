import type { PlannerInputs } from '../types/inputs';
import type { YearlySnapshot } from '../types/calculation';
import { calcWeightedReturn, calcDebtAnnualPayment, calcRemainingDebt } from './assetWeighting';
import { getAnnualPensionIncomeForAge } from './pensionEstimation';

/**
 * 연간 시뮬레이션 실행 (Method B: 총자산/총부채 분리 추적)
 *
 * - 투자수익은 총자산(gross assets)에 적용
 * - 부채 상환액은 총자산에서 차감
 * - 연금 수입은 총자산에 가산 (은퇴 전후 모두 해당 나이에 개시되면 반영)
 * - 스냅샷의 totalAsset = 총자산 - 잔여부채 (순자산)
 */
export function simulate(
  inputs: PlannerInputs,
  testMonthlyInCurrentValue: number
): YearlySnapshot[] {
  const { goal, status, assets, debts, children, pension } = inputs;
  const { retirementAge, lifeExpectancy, inflationRate } = goal;
  const { currentAge, annualIncome, incomeGrowthRate, annualExpense, expenseGrowthRate } = status;

  const inflationDecimal = inflationRate / 100;
  const incomeGrowthDecimal = incomeGrowthRate / 100;
  const expenseGrowthDecimal = expenseGrowthRate / 100;
  const weightedReturnDecimal = calcWeightedReturn(assets) / 100;

  const annualChildExpense = children.hasChildren
    ? children.count * children.monthlyPerChild * 12
    : 0;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementMonthlyNominal =
    testMonthlyInCurrentValue * Math.pow(1 + inflationDecimal, yearsToRetirement);

  // Method B: 총자산(gross)으로 시작, 부채 잔액 별도 추적
  const totalAssetNow = Object.values(assets).reduce((s, a) => s + a.amount, 0);
  let currentGrossAsset = totalAssetNow;

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

    if (age > currentAge) {
      investReturn = currentGrossAsset * weightedReturnDecimal;

      childExpThisYear =
        children.hasChildren && age <= children.independenceAge
          ? annualChildExpense * Math.pow(1 + inflationDecimal, yearsFromNow - 1)
          : 0;

      debtRepayThisYear = Object.values(debts).reduce((sum, debtItem) => {
        return sum + calcDebtAnnualPayment(debtItem, yearsFromNow - 1);
      }, 0);

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

      currentGrossAsset =
        currentGrossAsset * (1 + weightedReturnDecimal) +
        incomeThisYear +
        pensionThisYear -
        expenseThisYear -
        debtRepayThisYear -
        childExpThisYear;
    }

    const remainingDebt = Object.values(debts).reduce((sum, debtItem) => {
      return sum + calcRemainingDebt(debtItem, yearsFromNow);
    }, 0);

    const netAssetEnd = currentGrossAsset - remainingDebt;
    const netCashflow = investReturn + incomeThisYear + pensionThisYear - expenseThisYear - debtRepayThisYear - childExpThisYear;

    snapshots.push({
      age,
      isRetired,
      grossAssetEnd: currentGrossAsset,
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
    });
  }

  return snapshots;
}

/** 전 구간에서 한 번도 자산이 0 미만이 되지 않아야 지속 가능 */
export function isSustainable(snapshots: YearlySnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  return snapshots.every(s => s.totalAsset >= 0);
}

/** 자산이 처음 0 미만이 되는 나이 (기대수명까지 버티면 null) */
export function findDepletionAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.totalAsset < 0);
  return snapshot ? snapshot.age : null;
}
