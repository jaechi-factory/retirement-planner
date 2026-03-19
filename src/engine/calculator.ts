import type { PlannerInputs } from '../types/inputs';
import type { YearlySnapshot } from '../types/calculation';
import { calcFinancialWeightedReturn, calcFinancialTotalAsset, calcDebtAnnualPayment, calcRemainingDebt } from './assetWeighting';
import { getAnnualPensionIncomeForAge } from './pensionEstimation';

/**
 * 연간 시뮬레이션 실행 (2버킷: 금융자산 / 부동산 분리)
 *
 * - 금융자산: 금융자산 기대수익률로 성장, 소득/지출/연금/부채상환 모두 반영
 * - 부동산: 별도 기대수익률로 성장, 생활비 재원으로 자동 인출하지 않음
 * - 지속 가능성 판단: 금융자산이 0 미만이 되지 않아야 함
 * - 순자산(netAssetEnd): 금융자산 + 부동산 - 잔여부채
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

  // 금융자산 전용 수익률 (부동산 제외)
  const financialReturnDecimal = calcFinancialWeightedReturn(assets) / 100;
  // 부동산 수익률
  const housingReturnDecimal = assets.realEstate.expectedReturn / 100;

  const annualChildExpense = children.hasChildren
    ? children.count * children.monthlyPerChild * 12
    : 0;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementMonthlyNominal =
    testMonthlyInCurrentValue * Math.pow(1 + inflationDecimal, yearsToRetirement);

  // 2버킷 초기값
  let currentFinancialAsset = calcFinancialTotalAsset(assets);
  let currentHousingAsset = assets.realEstate.amount;

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
      // 금융자산 투자수익 (지출 반영 전 기준)
      investReturn = currentFinancialAsset * financialReturnDecimal;

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

      // 금융자산 업데이트: 수익 + 소득 + 연금 - 지출 - 부채상환 - 자녀비용
      currentFinancialAsset =
        currentFinancialAsset * (1 + financialReturnDecimal) +
        incomeThisYear +
        pensionThisYear -
        expenseThisYear -
        debtRepayThisYear -
        childExpThisYear;

      // 부동산 별도 성장 (현금흐름 미반영)
      currentHousingAsset = currentHousingAsset * (1 + housingReturnDecimal);
    }

    const remainingDebt = Object.values(debts).reduce((sum, debtItem) => {
      return sum + calcRemainingDebt(debtItem, yearsFromNow);
    }, 0);

    const grossAssetEnd = currentFinancialAsset + currentHousingAsset;
    const netAssetEnd = grossAssetEnd - remainingDebt;
    const netCashflow = investReturn + incomeThisYear + pensionThisYear - expenseThisYear - debtRepayThisYear - childExpThisYear;

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
    });
  }

  return snapshots;
}

/** 전 구간에서 순자산(금융자산 + 부동산 - 부채)이 0 미만이 되지 않아야 지속 가능 */
export function isSustainable(snapshots: YearlySnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  return snapshots.every(s => s.netAssetEnd >= 0);
}

/** 순자산이 처음 0 미만이 되는 나이 (기대수명까지 버티면 null) */
export function findDepletionAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.netAssetEnd < 0);
  return snapshot ? snapshot.age : null;
}
