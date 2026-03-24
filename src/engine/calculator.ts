import type { PlannerInputs } from '../types/inputs';
import type { YearlySnapshot } from '../types/calculation';
import type { DebtSchedules } from './debtSchedule';
import { calcFinancialWeightedReturn, calcFinancialTotalAsset, precomputeDebtSchedules, calcTotalAnnualRepaymentFromSchedules, calcTotalRemainingDebtFromSchedules } from './assetWeighting';
import { getAnnualPensionIncomeForAge } from './pensionEstimation';

/**
 * 연간 시뮬레이션 실행 (2버킷: 금융자산 / 부동산 분리)
 *
 * - 금융자산: 금융자산 기대수익률로 성장, 소득/지출/연금/부채상환 모두 반영
 * - 부동산: 별도 기대수익률로 성장, 생활비 재원으로 자동 인출하지 않음
 * - 지속 가능성 판단: 순자산(금융+부동산-부채)이 0 미만이 되지 않아야 함
 *
 * @param prebuiltSchedules 이진탐색 바깥에서 선계산된 스케줄 (있으면 재사용, 없으면 내부 계산)
 */
export function simulate(
  inputs: PlannerInputs,
  testMonthlyInCurrentValue: number,
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

  // 부채 스케줄: 선계산본이 있으면 재사용, 없으면 여기서 생성
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
      // 금융자산 투자수익 — 잔액이 양수일 때만 발생 (음수 잔액에 수익률 적용 방지)
      investReturn = Math.max(0, currentFinancialAsset) * financialReturnDecimal;

      childExpThisYear =
        children.hasChildren && age <= children.independenceAge
          ? annualChildExpense * Math.pow(1 + inflationDecimal, yearsFromNow - 1)
          : 0;

      // 스케줄 기반 연간 부채 납입액 (yearsElapsed = yearsFromNow - 1)
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

      // 금융자산 업데이트: 수익 + 소득 + 연금 - 지출 - 부채상환 - 자녀비용
      currentFinancialAsset =
        currentFinancialAsset +
        investReturn +
        incomeThisYear +
        pensionThisYear -
        expenseThisYear -
        debtRepayThisYear -
        childExpThisYear;

      // 부동산 별도 성장 (현금흐름 미반영)
      currentHousingAsset = currentHousingAsset * (1 + housingReturnDecimal);
    }

    // 스케줄 기반 연도말 잔여 부채
    // yearsFromNow=0(현재 나이): yearIndex=-1 → 상환 시작 전 원래 잔액
    // yearsFromNow=1: yearIndex=0 → 1년차 말 잔액, ...
    const remainingDebt = calcTotalRemainingDebtFromSchedules(debtSchedules, yearsFromNow - 1);

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

/**
 * 순자산(금융자산 + 부동산 - 부채)이 전 구간에서 0 이상이면 지속 가능.
 *
 * 부동산은 최종적으로 유동화 가능한 자산이므로 possibleMonthly 역산의
 * 지속 가능성 기준에는 포함한다.
 * 금융자산만 부족한 경우는 findFinancialStressAge로 별도 경고.
 */
export function isSustainable(snapshots: YearlySnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  return snapshots.every(s => s.netAssetEnd >= 0);
}

/** 순자산이 처음 0 미만이 되는 나이 (기대수명까지 버티면 null) */
export function findDepletionAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.netAssetEnd < 0);
  return snapshot ? snapshot.age : null;
}

/**
 * 금융자산이 처음 0 미만이 되는 나이 — 유동 자산 고갈 경보 지표.
 *
 * 부동산이 있어 총 순자산은 양수여도, 현금·주식 등 금융자산이
 * 먼저 바닥나는 시점을 알려준다. 이 나이 이후에는 주택 활용(매각·연금)
 * 전략이 필요하다는 신호로 해석한다.
 */
export function findFinancialStressAge(snapshots: YearlySnapshot[]): number | null {
  const snapshot = snapshots.find(s => s.financialAssetEnd < 0);
  return snapshot ? snapshot.age : null;
}
