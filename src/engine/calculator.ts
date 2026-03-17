import type { PlannerInputs } from '../types/inputs';
import type { YearlySnapshot } from '../types/calculation';
import { calcWeightedReturn, calcDebtAnnualPayment } from './assetWeighting';

/**
 * 연간 시뮬레이션 실행
 * @param inputs - 전체 입력값
 * @param testMonthlyInCurrentValue - 테스트할 월 생활비 (만원, 현재가치 기준)
 * @returns 연도별 스냅샷 배열
 */
export function simulate(
  inputs: PlannerInputs,
  testMonthlyInCurrentValue: number
): YearlySnapshot[] {
  const { goal, status, assets, debts, children } = inputs;
  const {
    retirementAge,
    lifeExpectancy,
    inflationRate,
  } = goal;
  const {
    currentAge,
    annualIncome,
    incomeGrowthRate,
    annualExpense,
  } = status;

  const inflationDecimal = inflationRate / 100;
  const incomeGrowthDecimal = incomeGrowthRate / 100;
  const weightedReturnDecimal = calcWeightedReturn(assets) / 100;

  // 자녀 연지출 (현재, 은퇴 전)
  const annualChildExpense = children.hasChildren
    ? children.count * children.monthlyPerChild * 12
    : 0;

  // 은퇴 시점 목표 월생활비 (명목가치)
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementMonthlyNominal =
    testMonthlyInCurrentValue * Math.pow(1 + inflationDecimal, yearsToRetirement);

  // 순자산을 초기 자산으로 사용
  const totalAssetNow = Object.values(assets).reduce((s, a) => s + a.amount, 0);
  const totalDebtNow = Object.values(debts).reduce((s, d) => s + d.balance, 0);
  let currentAsset = totalAssetNow - totalDebtNow;

  const snapshots: YearlySnapshot[] = [];

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const yearsFromNow = age - currentAge;
    const isRetired = age >= retirementAge;

    if (age > currentAge) {
      // 자녀 지출 (독립 전까지)
      const childExpenseThisYear =
        children.hasChildren && age <= children.independenceAge
          ? annualChildExpense
          : 0;

      // 부채 상환: 각 부채 항목의 연도별 상환액 합산
      const debtRepaymentThisYear = Object.values(debts).reduce((sum, debtItem) => {
        return sum + calcDebtAnnualPayment(debtItem, yearsFromNow);
      }, 0);

      if (!isRetired) {
        // ── 은퇴 전 ──
        const thisYearIncome =
          annualIncome * Math.pow(1 + incomeGrowthDecimal, yearsFromNow - 1);
        const thisYearExpense = annualExpense; // 현재 소비는 고정 (물가 반영 안 함, PRD 명세)

        currentAsset =
          currentAsset * (1 + weightedReturnDecimal) +
          thisYearIncome -
          thisYearExpense -
          debtRepaymentThisYear -
          childExpenseThisYear;
      } else {
        // ── 은퇴 후 ──
        const yearsAfterRetirement = age - retirementAge;
        const thisYearExpense =
          retirementMonthlyNominal *
          12 *
          Math.pow(1 + inflationDecimal, yearsAfterRetirement);

        currentAsset =
          currentAsset * (1 + weightedReturnDecimal) -
          thisYearExpense -
          debtRepaymentThisYear -
          childExpenseThisYear;
      }
    }

    snapshots.push({
      age,
      totalAsset: currentAsset,
      isRetired,
    });
  }

  return snapshots;
}

/** 기대수명 시점에서 자산이 남아있는지 확인 */
export function isSustainable(snapshots: YearlySnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  return snapshots[snapshots.length - 1].totalAsset >= 0;
}
