import { describe, expect, it } from 'vitest';
import type { PlannerInputs } from '../types/inputs';
import { runCalculationV2 } from './calculatorV2';
import { precomputeDebtSchedules } from './assetWeighting';
import { DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY } from './fundingPolicy';

function makeInputs(annualIncome: number): PlannerInputs {
  return {
    goal: { retirementAge: 60, lifeExpectancy: 90, targetMonthly: 300, inflationRate: 2.5 },
    status: { currentAge: 40, annualIncome, incomeGrowthRate: 2.0, annualExpense: 4800, expenseGrowthRate: 2.0 },
    assets: {
      cash: { amount: 2250, expectedReturn: 2.0 },
      deposit: { amount: 1500, expectedReturn: 3.5 },
      stock_kr: { amount: 400, expectedReturn: 7.0 },
      stock_us: { amount: 250, expectedReturn: 8.0 },
      bond: { amount: 500, expectedReturn: 4.0 },
      crypto: { amount: 100, expectedReturn: 15.0 },
      realEstate: { amount: 80000, expectedReturn: 3.0 },
    },
    debts: {
      mortgage: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      otherLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
    children: {
      hasChildren: false,
      count: 0,
      monthlyPerChild: 0,
      independenceAge: 0,
      costGrowthMode: 'inflation',
      customGrowthRate: 2.5,
    },
    pension: {
      publicPension: { enabled: true, mode: 'auto', startAge: 65, manualMonthlyTodayValue: 0, workStartAge: 26 },
      retirementPension: {
        enabled: true,
        mode: 'auto',
        startAge: 60,
        payoutYears: 20,
        currentBalance: 0,
        accumulationReturnRate: 3.5,
        payoutReturnRate: 2.0,
        manualMonthlyTodayValue: 0,
      },
      privatePension: {
        enabled: false,
        mode: 'auto',
        startAge: 60,
        payoutYears: 20,
        currentBalance: 0,
        monthlyContribution: 0,
        expectedReturnRate: 3.5,
        accumulationReturnRate: 3.5,
        payoutReturnRate: 3.5,
        manualMonthlyTodayValue: 0,
        detailMode: false,
        products: [],
      },
    },
  };
}

function runScenario(inputs: PlannerInputs, mode: 'keep_priority' | 'max_sustainable') {
  const schedules = precomputeDebtSchedules(inputs.debts);
  const result = runCalculationV2(inputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, schedules, mode);
  if (!result) throw new Error('runCalculationV2 returned null');
  return result;
}

// ─── W2 테스트용 헬퍼 ──────────────────────────────────────────────────────────

/** W2 테스트용 완전한 입력 생성 */
function makeFullInputs(overrides: Partial<PlannerInputs> = {}): PlannerInputs {
  const base: PlannerInputs = {
    goal: { retirementAge: 65, lifeExpectancy: 80, targetMonthly: 200, inflationRate: 2.5 },
    status: { currentAge: 40, annualIncome: 8000, incomeGrowthRate: 2.0, annualExpense: 3600, expenseGrowthRate: 2.0 },
    assets: {
      cash:       { amount: 5000,  expectedReturn: 1.0 },
      deposit:    { amount: 5000,  expectedReturn: 2.0 },
      stock_kr:   { amount: 5000,  expectedReturn: 6.0 },
      stock_us:   { amount: 5000,  expectedReturn: 8.0 },
      bond:       { amount: 2000,  expectedReturn: 3.5 },
      crypto:     { amount: 0,     expectedReturn: 0   },
      realEstate: { amount: 80000, expectedReturn: 2.0 },
    },
    debts: {
      mortgage:   { balance: 0, interestRate: 0, repaymentType: 'equal_payment',   repaymentYears: 0 },
      creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
    children: { hasChildren: false, count: 0, monthlyPerChild: 0, independenceAge: 0 },
    pension: {
      publicPension:     { enabled: false, mode: 'auto', startAge: 65, manualMonthlyTodayValue: 0 },
      retirementPension: {
        enabled: false, mode: 'auto', startAge: 60, payoutYears: 20,
        currentBalance: 0, accumulationReturnRate: 3.5, payoutReturnRate: 2.0, manualMonthlyTodayValue: 0,
      },
      privatePension: {
        enabled: false, mode: 'auto', startAge: 65, payoutYears: 20,
        currentBalance: 0, monthlyContribution: 0, expectedReturnRate: 3.5,
        accumulationReturnRate: 3.5, payoutReturnRate: 2.0, manualMonthlyTodayValue: 0,
        detailMode: false, products: [],
      },
    },
  };
  return { ...base, ...overrides };
}

// ─── W2: finalNetWorth 완성 ──────────────────────────────────────────────────
//
// 버그: buildPropertyOption의 finalNetWorth에
//   1) propertySaleProceedsBucketEnd 합산 누락 (sell 전략)
//   2) propertyDebtEnd 차감 누락 (keep / secured_loan 전략)
//
// 기대 계산식:
//   finalNetWorth = cashLikeEnd + financialInvestableEnd + propertyValueEnd
//                + propertySaleProceedsBucketEnd
//                - securedLoanBalanceEnd
//                - propertyDebtEnd
// ─────────────────────────────────────────────────────────────────────────────

describe('[W2] finalNetWorth 완성', () => {
  // ── sell 전략: propertySaleProceedsBucketEnd 포함 여부 ──────────────────

  it('[W2-1] sell 전략: propertySaleProceedsBucketEnd가 finalNetWorth에 포함되어야 함', () => {
    // 자산 부족 → 집 매각 발생.
    // 은퇴 후 연금(400만원/월)이 생활비(200만원)를 커버하므로 매각대금 버킷을 인출하지 않음.
    // → propertySaleProceedsBucketEnd가 생애 말까지 남아 버킷 반영 여부를 검증 가능.
    // 주담대 없음 → propertyDebtEnd = 0, sell 단독 검증.
    const inputs = makeFullInputs({
      goal: { retirementAge: 60, lifeExpectancy: 75, targetMonthly: 200, inflationRate: 2.5 },
      status: { currentAge: 50, annualIncome: 3000, incomeGrowthRate: 0, annualExpense: 4200, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 300,   expectedReturn: 1.0 },
        deposit:    { amount: 300,   expectedReturn: 2.0 },
        stock_kr:   { amount: 0,     expectedReturn: 6.0 },
        stock_us:   { amount: 0,     expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 80000, expectedReturn: 1.0 },
      },
      // 은퇴 후 연금 400만원/월 → 생활비(200) 초과 → 매각대금 버킷 미소진
      pension: {
        publicPension: {
          enabled: true, mode: 'manual', startAge: 60,
          manualMonthlyTodayValue: 400,
        },
        retirementPension: {
          enabled: false, mode: 'auto', startAge: 60, payoutYears: 20,
          currentBalance: 0, accumulationReturnRate: 3.5, payoutReturnRate: 2.0,
          manualMonthlyTodayValue: 0,
        },
        privatePension: {
          enabled: false, mode: 'auto', startAge: 65, payoutYears: 20,
          currentBalance: 0, monthlyContribution: 0, expectedReturnRate: 3.5,
          accumulationReturnRate: 3.5, payoutReturnRate: 2.0, manualMonthlyTodayValue: 0,
          detailMode: false, products: [],
        },
      },
    });

    const schedules = precomputeDebtSchedules(inputs.debts);
    const result = runCalculationV2(inputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, schedules, 'max_sustainable');
    expect(result).not.toBeNull();

    const sellOption = result!.propertyOptions.find(o => o.strategy === 'sell')!;
    const lastYear = sellOption.yearlyAggregates[sellOption.yearlyAggregates.length - 1];
    const lastMonth = lastYear.months[lastYear.months.length - 1];

    // sell 전략에서 집 팔고 남은 매각대금 버킷이 있어야 함 (전제 조건)
    expect(lastYear.propertySaleProceedsBucketEnd).toBeGreaterThan(0);

    // finalNetWorth는 매각대금 버킷을 포함해야 함
    const expected =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd +
      lastYear.propertySaleProceedsBucketEnd -
      lastYear.securedLoanBalanceEnd -
      (lastMonth?.propertyDebtEnd ?? 0);

    expect(sellOption.finalNetWorth).toBeCloseTo(expected, 1);
    // 구버그 확인: 매각대금 없이 계산한 값과는 달라야 함
    const oldFormula =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd -
      lastYear.securedLoanBalanceEnd;
    expect(sellOption.finalNetWorth).not.toBeCloseTo(oldFormula, 1);
  });

  // ── keep 전략: propertyDebtEnd 차감 여부 ────────────────────────────────

  it('[W2-2] keep 전략: propertyDebtEnd가 finalNetWorth에서 차감되어야 함', () => {
    // 30년 모기지 → lifeExpectancy(80세) 시점에 모기지 잔액 남음
    // currentAge=40, 30년 모기지 → 만료 나이=70 → lifeExpectancy=80보다 먼저 소멸
    // 따라서 50년 모기지 필요 → repaymentYears=50, currentAge=40, 만료=90 > 80
    // 대신: currentAge=60, 30년 모기지(만료=90), lifeExpectancy=80 사용
    const inputs = makeFullInputs({
      goal: { retirementAge: 65, lifeExpectancy: 80, targetMonthly: 200, inflationRate: 2.5 },
      status: { currentAge: 60, annualIncome: 8000, incomeGrowthRate: 2.0, annualExpense: 3600, expenseGrowthRate: 2.0 },
      debts: {
        mortgage:   { balance: 20000, interestRate: 3.5, repaymentType: 'equal_payment', repaymentYears: 30 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });

    const schedules = precomputeDebtSchedules(inputs.debts);
    const result = runCalculationV2(inputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, schedules, 'max_sustainable');
    expect(result).not.toBeNull();

    const keepOption = result!.propertyOptions.find(o => o.strategy === 'keep')!;
    const lastYear = keepOption.yearlyAggregates[keepOption.yearlyAggregates.length - 1];
    // propertyDebtEnd는 YearlyAggregateV2에 없으므로 마지막 월 스냅샷에서 읽는다
    const lastMonth = lastYear.months[lastYear.months.length - 1];

    // 30년 모기지가 lifeExpectancy 시점에 아직 남아있어야 함 (테스트 전제 조건)
    expect(lastMonth.propertyDebtEnd).toBeGreaterThan(0);

    // finalNetWorth는 propertyDebtEnd를 차감해야 함
    const expected =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd +
      lastYear.propertySaleProceedsBucketEnd -
      lastYear.securedLoanBalanceEnd -
      lastMonth.propertyDebtEnd;

    expect(keepOption.finalNetWorth).toBeCloseTo(expected, 1);
    // 구버그 확인: propertyDebtEnd 차감 없는 값보다 작아야 함
    const oldFormula =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd -
      lastYear.securedLoanBalanceEnd;
    expect(keepOption.finalNetWorth).toBeLessThan(oldFormula);
  });

  // ── secured_loan: propertyDebtEnd + securedLoanBalanceEnd 동시 반영 ────

  it('[W2-3] secured_loan 전략: propertyDebtEnd와 securedLoanBalanceEnd가 함께 차감되어야 함', () => {
    // 30년 모기지(propertyDebtEnd > 0) + 자산 부족으로 담보대출 draw 발생(securedLoanBalanceEnd > 0)
    const inputs = makeFullInputs({
      goal: { retirementAge: 65, lifeExpectancy: 80, targetMonthly: 400, inflationRate: 2.5 },
      status: { currentAge: 60, annualIncome: 4000, incomeGrowthRate: 0, annualExpense: 3600, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 500,   expectedReturn: 1.0 },
        deposit:    { amount: 500,   expectedReturn: 2.0 },
        stock_kr:   { amount: 500,   expectedReturn: 6.0 },
        stock_us:   { amount: 500,   expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 80000, expectedReturn: 2.0 },
      },
      debts: {
        mortgage:   { balance: 20000, interestRate: 3.5, repaymentType: 'equal_payment', repaymentYears: 30 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });

    const schedules = precomputeDebtSchedules(inputs.debts);
    const result = runCalculationV2(inputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, schedules, 'max_sustainable');
    expect(result).not.toBeNull();

    const loanOption = result!.propertyOptions.find(o => o.strategy === 'secured_loan')!;
    const lastYear = loanOption.yearlyAggregates[loanOption.yearlyAggregates.length - 1];
    // propertyDebtEnd는 YearlyAggregateV2에 없으므로 마지막 월 스냅샷에서 읽는다
    const lastMonth = lastYear.months[lastYear.months.length - 1];

    // 전제 조건: 두 부채 모두 > 0이어야 이 테스트가 의미 있음
    expect(lastMonth.propertyDebtEnd).toBeGreaterThan(0);
    expect(lastYear.securedLoanBalanceEnd).toBeGreaterThan(0);

    // finalNetWorth = 공식 검증
    const expected =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd +
      lastYear.propertySaleProceedsBucketEnd -
      lastYear.securedLoanBalanceEnd -
      lastMonth.propertyDebtEnd;

    expect(loanOption.finalNetWorth).toBeCloseTo(expected, 1);
  });
});

describe('calculatorV2 recommendation mode', () => {
  it('keep_priority 모드에서도 maxSustainableMonthly를 별도 제공해야 한다', () => {
    const result = runScenario(makeInputs(6000), 'keep_priority');

    expect(result.summary.recommendationMode).toBe('keep_priority');
    expect(result.summary.recommendedStrategy).toBe('keep');
    expect(result.summary.maxSustainableStrategy).toBe('secured_loan');
    expect(result.summary.maxSustainableMonthly).toBeGreaterThan(result.summary.sustainableMonthly);
  });

  it('max_sustainable 모드에서는 추천값이 최대값과 일치해야 한다', () => {
    const result = runScenario(makeInputs(6000), 'max_sustainable');

    expect(result.summary.recommendationMode).toBe('max_sustainable');
    expect(result.summary.recommendedStrategy).toBe(result.summary.maxSustainableStrategy);
    expect(result.summary.sustainableMonthly).toBe(result.summary.maxSustainableMonthly);
    expect(result.summary.targetGap).toBe(result.summary.maxTargetGap);
  });

  it('추천 전략 전환으로 summary가 흔들려도 maxSustainableMonthly는 소득 증가 시 감소하지 않아야 한다', () => {
    const lowIncome = runScenario(makeInputs(5000), 'keep_priority');
    const highIncome = runScenario(makeInputs(6000), 'keep_priority');

    // keep_priority 정책에서는 추천 전략 전환으로 summary 값이 감소할 수 있음
    expect(highIncome.summary.sustainableMonthly).toBeLessThan(lowIncome.summary.sustainableMonthly);
    // 최대 기준은 단조성 유지
    expect(highIncome.summary.maxSustainableMonthly).toBeGreaterThanOrEqual(lowIncome.summary.maxSustainableMonthly);
  });
});

