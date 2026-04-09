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
//   2) mortgageDebtEnd 차감 누락 (keep / secured_loan 전략)
//
// 기대 계산식:
//   finalNetWorth = cashLikeEnd + financialInvestableEnd + propertyValueEnd
//                + propertySaleProceedsBucketEnd
//                - securedLoanBalanceEnd
//                - mortgageDebtEnd
// ─────────────────────────────────────────────────────────────────────────────

describe('[W2] finalNetWorth 완성', () => {
  // ── sell 전략: propertySaleProceedsBucketEnd 포함 여부 ──────────────────

  it('[W2-1] sell 전략: propertySaleProceedsBucketEnd가 finalNetWorth에 포함되어야 함', () => {
    // 자산 부족 → 집 매각 발생.
    // 은퇴 후 연금(400만원/월)이 생활비(200만원)를 커버하므로 매각대금 버킷을 인출하지 않음.
    // → propertySaleProceedsBucketEnd가 생애 말까지 남아 버킷 반영 여부를 검증 가능.
    // 주담대 없음 → mortgageDebtEnd = 0, sell 단독 검증.
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
      (lastMonth?.mortgageDebtEnd ?? 0);

    expect(sellOption.finalNetWorth).toBeCloseTo(expected, 1);
    // 구버그 확인: 매각대금 없이 계산한 값과는 달라야 함
    const oldFormula =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd -
      lastYear.securedLoanBalanceEnd;
    expect(sellOption.finalNetWorth).not.toBeCloseTo(oldFormula, 1);
  });

  // ── keep 전략: mortgageDebtEnd 차감 여부 ────────────────────────────────

  it('[W2-2] keep 전략: mortgageDebtEnd가 finalNetWorth에서 차감되어야 함', () => {
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
    // mortgageDebtEnd는 YearlyAggregateV2에 없으므로 마지막 월 스냅샷에서 읽는다
    const lastMonth = lastYear.months[lastYear.months.length - 1];

    // 30년 모기지가 lifeExpectancy 시점에 아직 남아있어야 함 (테스트 전제 조건)
    expect(lastMonth.mortgageDebtEnd).toBeGreaterThan(0);

    // finalNetWorth는 totalDebtEnd(= mortgageDebtEnd + nonMortgageDebtEnd)를 차감해야 함
    // 이 케이스는 비담보 대출 없으므로 totalDebtEnd = mortgageDebtEnd
    const expected =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd +
      lastYear.propertySaleProceedsBucketEnd -
      lastYear.securedLoanBalanceEnd -
      lastMonth.totalDebtEnd;

    expect(keepOption.finalNetWorth).toBeCloseTo(expected, 1);
    // 구버그 확인: mortgageDebtEnd 차감 없는 값보다 작아야 함
    const oldFormula =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd -
      lastYear.securedLoanBalanceEnd;
    expect(keepOption.finalNetWorth).toBeLessThan(oldFormula);
  });

  // ── secured_loan: mortgageDebtEnd + securedLoanBalanceEnd 동시 반영 ────

  it('[W2-3] secured_loan 전략: mortgageDebtEnd와 securedLoanBalanceEnd가 함께 차감되어야 함', () => {
    // 30년 모기지(mortgageDebtEnd > 0) + 자산 부족으로 담보대출 draw 발생(securedLoanBalanceEnd > 0)
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
    // mortgageDebtEnd는 YearlyAggregateV2에 없으므로 마지막 월 스냅샷에서 읽는다
    const lastMonth = lastYear.months[lastYear.months.length - 1];

    // 전제 조건: 두 부채 모두 > 0이어야 이 테스트가 의미 있음
    expect(lastMonth.mortgageDebtEnd).toBeGreaterThan(0);
    expect(lastYear.securedLoanBalanceEnd).toBeGreaterThan(0);

    // finalNetWorth = 공식 검증 (totalDebtEnd = mortgageDebtEnd + nonMortgageDebtEnd)
    const expected =
      lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd +
      lastYear.propertySaleProceedsBucketEnd -
      lastYear.securedLoanBalanceEnd -
      lastMonth.totalDebtEnd;

    expect(loanOption.finalNetWorth).toBeCloseTo(expected, 1);
  });
});

describe('[V] 차량 입력이 sustainableMonthly에 반영되어야 함', () => {
  it('[V-3] separate 차량이 있으면 sustainableMonthly가 내려가야 함', () => {
    const baseInputs = makeFullInputs({
      goal: { retirementAge: 65, lifeExpectancy: 67, targetMonthly: 200, inflationRate: 0 },
      status: { currentAge: 64, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 5000, expectedReturn: 0 },
        deposit:    { amount: 0, expectedReturn: 0 },
        stock_kr:   { amount: 0, expectedReturn: 0 },
        stock_us:   { amount: 0, expectedReturn: 0 },
        bond:       { amount: 0, expectedReturn: 0 },
        crypto:     { amount: 0, expectedReturn: 0 },
        realEstate: { amount: 0, expectedReturn: 0 },
      },
      vehicle: {
        ownershipType: 'none',
        costIncludedInExpense: 'separate',
        loanBalance: 0,
        loanRate: 0,
        loanMonths: 0,
        monthlyMaintenance: 0,
      },
    });

    const withVehicle = runScenario({
      ...baseInputs,
      vehicle: {
        ownershipType: 'owned',
        costIncludedInExpense: 'separate',
        loanBalance: 1200,
        loanRate: 0,
        loanMonths: 12,
        monthlyMaintenance: 12,
      },
    }, 'max_sustainable');
    const withoutVehicle = runScenario(baseInputs, 'max_sustainable');

    expect(withVehicle.summary.sustainableMonthly).toBeLessThan(withoutVehicle.summary.sustainableMonthly);
  });

  it('[V-4] included 차량은 annualExpense를 그대로 둘 때 sustainableMonthly를 추가로 바꾸지 않아야 함', () => {
    const baseInputs = makeFullInputs({
      goal: { retirementAge: 65, lifeExpectancy: 67, targetMonthly: 200, inflationRate: 0 },
      status: { currentAge: 64, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 5000, expectedReturn: 0 },
        deposit:    { amount: 0, expectedReturn: 0 },
        stock_kr:   { amount: 0, expectedReturn: 0 },
        stock_us:   { amount: 0, expectedReturn: 0 },
        bond:       { amount: 0, expectedReturn: 0 },
        crypto:     { amount: 0, expectedReturn: 0 },
        realEstate: { amount: 0, expectedReturn: 0 },
      },
      vehicle: {
        ownershipType: 'none',
        costIncludedInExpense: 'separate',
        loanBalance: 0,
        loanRate: 0,
        loanMonths: 0,
        monthlyMaintenance: 0,
      },
    });

    const withIncludedVehicle = runScenario({
      ...baseInputs,
      vehicle: {
        ownershipType: 'owned',
        costIncludedInExpense: 'included',
        loanBalance: 1200,
        loanRate: 0,
        loanMonths: 12,
        monthlyMaintenance: 12,
      },
    }, 'max_sustainable');
    const withoutVehicle = runScenario(baseInputs, 'max_sustainable');

    expect(withIncludedVehicle.summary.sustainableMonthly).toBe(withoutVehicle.summary.sustainableMonthly);
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

  it('소득 증가 시 maxSustainableMonthly는 감소하지 않아야 한다', () => {
    const lowIncome = runScenario(makeInputs(5000), 'keep_priority');
    const highIncome = runScenario(makeInputs(6000), 'keep_priority');

    // B6 fix 이후: detail simulation = sustainableMonthly 기준으로 통일.
    // 이전에는 targetMonthly 기준 detail simulation 결과가 strategy 추천에 영향을 줘서
    // 소득이 높아도 sustainableMonthly가 역전되는 현상이 있었으나, 수정 후 제거됨.
    // 핵심 불변: 모든 전략 중 최대값(maxSustainableMonthly)은 소득 증가 시 비감소.
    expect(highIncome.summary.maxSustainableMonthly).toBeGreaterThanOrEqual(
      lowIncome.summary.maxSustainableMonthly,
    );
    // 두 시나리오 모두 sustainableMonthly > 0 이어야 한다
    expect(lowIncome.summary.sustainableMonthly).toBeGreaterThan(0);
    expect(highIncome.summary.sustainableMonthly).toBeGreaterThan(0);
  });
});

// ─── B6: 헤드라인-차트 기준 통일 ─────────────────────────────────────────────
//
// 수정: simulateMonthlyV2(inputs, inputs.goal.targetMonthly, ...)
//    → simulateMonthlyV2(inputs, sustainableMonthly, ...)
//
// 이유: 한 전략 카드 안에서 헤드라인과 차트/연도집계가 서로 다른 월생활비
//       기준(sustainableMonthly vs targetMonthly)을 참조하는 구조적 불일치 해소.
// ─────────────────────────────────────────────────────────────────────────────

describe('B6: 헤드라인-차트 기준 통일 (sustainableMonthly)', () => {
  // targetMonthly(300) > sustainableMonthly 가 되도록 자산을 낮게 설정
  function makeLowAssetInputs(targetMonthly: number): PlannerInputs {
    return {
      goal: { retirementAge: 60, lifeExpectancy: 85, targetMonthly, inflationRate: 2.5 },
      status: { currentAge: 50, annualIncome: 4000, incomeGrowthRate: 0, annualExpense: 3600, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 500,   expectedReturn: 1.0 },
        deposit:    { amount: 500,   expectedReturn: 2.0 },
        stock_kr:   { amount: 0,     expectedReturn: 6.0 },
        stock_us:   { amount: 0,     expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 0,     expectedReturn: 3.0 },
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
  }

  it('[B6-1] targetMonthly > sustainableMonthly: 차트 기준이 sustainableMonthly와 일치', () => {
    // targetMonthly=300 이지만 자산이 부족해 sustainableMonthly < 300
    const inputs = makeLowAssetInputs(300);
    const schedules = precomputeDebtSchedules(inputs.debts);
    const result = runCalculationV2(inputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, schedules, 'keep_priority');
    if (!result) throw new Error('runCalculationV2 returned null');

    const keepOption = result.propertyOptions.find(o => o.strategy === 'keep');
    if (!keepOption) throw new Error('keep option not found');

    const sustainableMonthly = keepOption.sustainableMonthly;

    // 자산이 낮으므로 sustainableMonthly < targetMonthly 여야 함
    expect(sustainableMonthly).toBeLessThan(300);

    // 차트 기준 검증: 연도집계의 expenseThisMonth 합산이 targetMonthly 기준이 아닌
    // sustainableMonthly 기준으로 생성됐는지 확인.
    // sustainableMonthly로 시뮬레이션하면 shortfall이 없어야 한다.
    const hasShortfall = keepOption.yearlyAggregates.some(y => y.totalShortfall > 0);
    expect(hasShortfall).toBe(false);
  });

  it('[B6-2] targetMonthly === sustainableMonthly: 결과가 변하지 않아야 함', () => {
    // sustainableMonthly = targetMonthly 가 되도록 자산을 충분히 설정
    const richInputs = makeFullInputs({ goal: { retirementAge: 65, lifeExpectancy: 80, targetMonthly: 200, inflationRate: 2.5 } });
    const schedules = precomputeDebtSchedules(richInputs.debts);
    const result = runCalculationV2(richInputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, schedules, 'keep_priority');
    if (!result) throw new Error('runCalculationV2 returned null');

    const keepOption = result.propertyOptions.find(o => o.strategy === 'keep');
    if (!keepOption) throw new Error('keep option not found');

    // targetMonthly <= sustainableMonthly 인 경우 shortfall 없어야 함
    const sustainableMonthly = keepOption.sustainableMonthly;
    expect(sustainableMonthly).toBeGreaterThanOrEqual(richInputs.goal.targetMonthly);
    expect(keepOption.yearlyAggregates.some(y => y.totalShortfall > 0)).toBe(false);
  });
});
