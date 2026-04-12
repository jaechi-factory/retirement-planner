import { describe, it, expect } from 'vitest';
import { runCalculationV2 } from './calculatorV2';
import { precomputeDebtSchedules } from './assetWeighting';
import { DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY } from './fundingPolicy';
import { extractEvents, extractKeyDecisionEvents } from './timelineBuilder';
import type { PlannerInputs } from '../types/inputs';
import type { YearlyAggregateV2, PropertyOptionResult, CalculationResultV2 } from '../types/calculationV2';

function makeYear(ageYear: number): YearlyAggregateV2 {
  return {
    ageYear,
    cashLikeEnd: 0,
    financialInvestableEnd: 0,
    propertyValueEnd: 0,
    mortgageDebtEnd: 0,
    nonMortgageDebtEnd: 0,
    totalDebtEnd: 0,
    securedLoanBalanceEnd: 0,
    propertySaleProceedsBucketEnd: 0,
    netWorthEnd: 0,
    totalShortfall: 0,
    totalIncome: 0,
    totalPension: 0,
    totalExpense: 0,
    totalDebtService: 0,
    totalChildExpense: 0,
    totalRentalCost: 0,
    eventSummary: [],
    months: [],
  };
}

function makeSummary(overrides: Partial<CalculationResultV2['summary']> = {}): CalculationResultV2['summary'] {
  return {
    sustainableMonthly: 400,
    targetGap: 0,
    maxSustainableMonthly: 500,
    maxTargetGap: 100,
    recommendedStrategy: 'secured_loan',
    maxSustainableStrategy: 'secured_loan',
    recommendationMode: 'max_sustainable',
    financialSellStartAge: null,
    financialExhaustionAge: 72,
    propertyInterventionAge: 74,
    failureAge: 83,
    ...overrides,
  };
}

function makePropertyOptions(): PropertyOptionResult[] {
  return [
    {
      strategy: 'keep',
      label: 'keep',
      sustainableMonthly: 300,
      interventionAge: null,
      survivesToLifeExpectancy: false,
      failureAge: 78,
      finalNetWorth: 0,
      headline: 'keep',
      isRecommended: false,
      yearlyAggregates: [makeYear(60)],
    },
    {
      strategy: 'secured_loan',
      label: 'secured_loan',
      sustainableMonthly: 420,
      interventionAge: 74,
      survivesToLifeExpectancy: false,
      failureAge: 83,
      finalNetWorth: 100,
      headline: 'loan',
      isRecommended: true,
      yearlyAggregates: [makeYear(74)],
    },
    {
      strategy: 'sell',
      label: 'sell',
      sustainableMonthly: 430,
      interventionAge: 73,
      survivesToLifeExpectancy: true,
      failureAge: null,
      finalNetWorth: 200,
      headline: 'sell',
      isRecommended: false,
      yearlyAggregates: [makeYear(73)],
    },
  ];
}

// ── B4: timelineBuilder currentAgeMonth passthrough ──────────────────────────

describe('B4: timelineBuilder currentAgeMonth passthrough', () => {
  it('extractEvents passes currentAgeMonth to getPensionBreakdown, affecting pension event descriptions', () => {
    // We use manual pension to get predictable values.
    // The key test is that currentAgeMonth is passed through to getPensionBreakdown,
    // which in turn passes it to resolveRetirementMonthlyStartTodayValue.
    // With auto pension and different currentAgeMonth, the retirement pension
    // today-value should differ, causing different event descriptions.
    const baseInputs: PlannerInputs = {
      goal: {
        retirementAge: 60,
        lifeExpectancy: 90,
        targetMonthly: 300,
        inflationRate: 2.5,
      },
      status: {
        currentAge: 40,
        currentAgeMonth: 6,
        annualIncome: 6000,
        incomeGrowthRate: 2,
        annualExpense: 3000,
      },
      assets: {
        cash:       { amount: 5000, expectedReturn: 2 },
        deposit:    { amount: 5000, expectedReturn: 3 },
        stock_kr:   { amount: 5000, expectedReturn: 6 },
        stock_us:   { amount: 5000, expectedReturn: 8 },
        bond:       { amount: 2000, expectedReturn: 3.5 },
        crypto:     { amount: 0, expectedReturn: 0 },
        realEstate: { amount: 50000, expectedReturn: 2 },
      },
      debts: {
        mortgage:   { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      },
      children: {
        hasChildren: false,
        count: 0,
        monthlyPerChild: 0,
        independenceAge: 0,
      },
      pension: {
        publicPension: {
          enabled: false,
          mode: 'auto',
          startAge: 65,
          manualMonthlyTodayValue: 0,
          workStartAge: 26,
        },
        retirementPension: {
          enabled: true,
          mode: 'auto',
          startAge: 62,
          startMonth: 0,
          payoutYears: 20,
          currentBalance: 30000,
          accumulationReturnRate: 3.5,
          payoutReturnRate: 2.0,
          manualMonthlyTodayValue: 0,
        },
        privatePension: {
          enabled: false,
          mode: 'auto',
          startAge: 65,
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

    // Extract events with currentAgeMonth=6
    const events6 = extractEvents(
      [makeYear(60), makeYear(65), makeYear(90)],
      makeSummary({ financialExhaustionAge: null, propertyInterventionAge: null, failureAge: null }),
      makePropertyOptions(),
      baseInputs,
    );

    // Extract events with currentAgeMonth=0
    const inputsMonth0 = {
      ...baseInputs,
      status: { ...baseInputs.status, currentAgeMonth: 0 },
    };
    const events0 = extractEvents(
      [makeYear(60), makeYear(65), makeYear(90)],
      makeSummary({ financialExhaustionAge: null, propertyInterventionAge: null, failureAge: null }),
      makePropertyOptions(),
      inputsMonth0,
    );

    // Both should produce retirement pension events
    const retEvent6 = events6.find((e) => e.type === 'pension_retirement');
    const retEvent0 = events0.find((e) => e.type === 'pension_retirement');
    expect(retEvent6).toBeDefined();
    expect(retEvent0).toBeDefined();

    // The pension amount in the description should differ because
    // currentAgeMonth=6 means 6 fewer accumulation months
    // (both use auto mode with non-zero currentBalance)
    expect(retEvent6!.description).not.toBe(retEvent0!.description);
  });
});

describe('timelineBuilder -- \uB9E4\uAC01 \uC774\uBCA4\uD2B8 \uB370\uC774\uD130 \uC815\uD569\uC131', () => {
  it('sell 전략 이벤트는 연말값이 아니라 실제 매각 월 기준 금액을 보여야 함', () => {
    const inputs: PlannerInputs = {
      goal: {
        retirementAge: 65,
        lifeExpectancy: 85,
        targetMonthly: 800,
        inflationRate: 0,
      },
      status: {
        currentAge: 64,
        annualIncome: 0,
        incomeGrowthRate: 0,
        annualExpense: 0,
      },
      assets: {
        cash:       { amount: 0, expectedReturn: 0 },
        deposit:    { amount: 0, expectedReturn: 0 },
        stock_kr:   { amount: 0, expectedReturn: 0 },
        stock_us:   { amount: 0, expectedReturn: 0 },
        bond:       { amount: 0, expectedReturn: 0 },
        crypto:     { amount: 0, expectedReturn: 0 },
        realEstate: { amount: 100000, expectedReturn: 0 },
      },
      debts: {
        mortgage:   { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
        creditLoan: { balance: 20000, interestRate: 5, repaymentType: 'equal_payment', repaymentYears: 10 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      },
      children: {
        hasChildren: false,
        count: 0,
        monthlyPerChild: 0,
        independenceAge: 0,
        costGrowthMode: 'inflation',
        customGrowthRate: 0,
      },
      pension: {
        publicPension: {
          enabled: false,
          mode: 'auto',
          startAge: 65,
          manualMonthlyTodayValue: 0,
          workStartAge: 26,
        },
        retirementPension: {
          enabled: false,
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

    const result = runCalculationV2(
      inputs,
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION_POLICY,
      precomputeDebtSchedules(inputs.debts),
    );

    expect(result).not.toBeNull();

    const events = extractEvents(
      result!.detailYearlyAggregates,
      result!.summary,
      result!.propertyOptions,
      inputs,
      'selected',
      'sell',
    );
    const sellEvent = events.find((e) => e.type === 'property_sell');

    expect(sellEvent).toBeDefined();
    expect(sellEvent!.propertyData).toBeDefined();
    expect(sellEvent!.propertyData!.estimatedPrice).toBeCloseTo(100000, 2);
    // 정책표 기준: mortgage_only 상환 모드이므로 신용대출은 매각 상환 대상이 아님
    expect(sellEvent!.propertyData!.mortgageBalance).toBe(0);
    expect(sellEvent!.propertyData!.netProceeds).toBeCloseTo(95000, 2);
  });
});

describe('extractKeyDecisionEvents', () => {
  it('의사결정 핵심 이벤트만 나이순으로 반환한다', () => {
    const inputs: PlannerInputs = {
      goal: { retirementAge: 60, lifeExpectancy: 90, targetMonthly: 400, inflationRate: 2 },
      status: { currentAge: 35, annualIncome: 7000, incomeGrowthRate: 3, annualExpense: 3000},
      assets: {
        cash: { amount: 1000, expectedReturn: 2 },
        deposit: { amount: 1000, expectedReturn: 2 },
        stock_kr: { amount: 1000, expectedReturn: 5 },
        stock_us: { amount: 1000, expectedReturn: 5 },
        bond: { amount: 1000, expectedReturn: 3 },
        crypto: { amount: 0, expectedReturn: 0 },
        realEstate: { amount: 50000, expectedReturn: 1 },
      },
      debts: {
        mortgage: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
        otherLoan: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      },
      children: {
        hasChildren: true,
        count: 1,
        monthlyPerChild: 60,
        independenceAge: 68,
        costGrowthMode: 'inflation',
        customGrowthRate: 0,
      },
      pension: {
        publicPension: { enabled: true, mode: 'manual', startAge: 65, manualMonthlyTodayValue: 120, workStartAge: 26 },
        retirementPension: {
          enabled: true,
          mode: 'manual',
          startAge: 62,
          payoutYears: 8,
          currentBalance: 0,
          accumulationReturnRate: 3.5,
          payoutReturnRate: 2.0,
          manualMonthlyTodayValue: 80,
        },
        privatePension: {
          enabled: true,
          mode: 'manual',
          startAge: 66,
          payoutYears: 9,
          currentBalance: 0,
          monthlyContribution: 0,
          expectedReturnRate: 3.5,
          accumulationReturnRate: 3.5,
          payoutReturnRate: 3.5,
          manualMonthlyTodayValue: 40,
          detailMode: false,
          products: [],
        },
      },
    };

    const ages = Array.from({ length: 31 }, (_, index) => 60 + index);
    const aggregates = ages.map((age) => makeYear(age));
    const events = extractKeyDecisionEvents(
      aggregates,
      makeSummary(),
      makePropertyOptions(),
      inputs,
      'selected',
      'secured_loan',
    );

    expect(events.some((event) => event.text === '60세 은퇴가 시작돼요')).toBe(true);
    expect(events.some((event) => event.text === '65세 국민연금이 시작돼요')).toBe(true);
    expect(events.some((event) => event.text === '62세 퇴직연금이 시작돼요')).toBe(true);
    expect(events.some((event) => event.text === '70세 퇴직연금이 끝나요')).toBe(true);
    expect(events.some((event) => event.text === '66세 개인연금이 시작돼요')).toBe(true);
    expect(events.some((event) => event.text === '75세 개인연금이 끝나요')).toBe(true);
    expect(events.some((event) => event.text === '68세 자녀 지출이 끝나요')).toBe(true);
    expect(events.some((event) => event.text === '74세 집을 담보로 빌려 생활비를 보태야 해요')).toBe(true);
    expect(events.some((event) => event.text === '72세 금융자산이 부족해지기 시작해요')).toBe(true);
    expect(events.some((event) => event.text === '83세 생활비가 부족해지기 시작해요')).toBe(true);

    for (let i = 1; i < events.length; i += 1) {
      expect(events[i - 1].age).toBeLessThanOrEqual(events[i].age);
    }
  });

  it('은퇴~기대수명 범위를 벗어난 이벤트는 제외한다', () => {
    const inputs: PlannerInputs = {
      goal: { retirementAge: 60, lifeExpectancy: 70, targetMonthly: 300, inflationRate: 2 },
      status: { currentAge: 40, annualIncome: 5000, incomeGrowthRate: 2, annualExpense: 2000},
      assets: {
        cash: { amount: 1000, expectedReturn: 2 },
        deposit: { amount: 1000, expectedReturn: 2 },
        stock_kr: { amount: 0, expectedReturn: 0 },
        stock_us: { amount: 0, expectedReturn: 0 },
        bond: { amount: 0, expectedReturn: 0 },
        crypto: { amount: 0, expectedReturn: 0 },
        realEstate: { amount: 30000, expectedReturn: 1 },
      },
      debts: {
        mortgage: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
        otherLoan: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      },
      children: {
        hasChildren: true,
        count: 1,
        monthlyPerChild: 50,
        independenceAge: 75,
        costGrowthMode: 'inflation',
        customGrowthRate: 0,
      },
      pension: {
        publicPension: { enabled: true, mode: 'manual', startAge: 65, manualMonthlyTodayValue: 100, workStartAge: 26 },
        retirementPension: {
          enabled: true,
          mode: 'manual',
          startAge: 62,
          payoutYears: 15,
          currentBalance: 0,
          accumulationReturnRate: 3.5,
          payoutReturnRate: 2.0,
          manualMonthlyTodayValue: 50,
        },
        privatePension: {
          enabled: true,
          mode: 'manual',
          startAge: 68,
          payoutYears: 10,
          currentBalance: 0,
          monthlyContribution: 0,
          expectedReturnRate: 3.5,
          accumulationReturnRate: 3.5,
          payoutReturnRate: 3.5,
          manualMonthlyTodayValue: 20,
          detailMode: false,
          products: [],
        },
      },
    };

    const events = extractKeyDecisionEvents(
      [makeYear(60), makeYear(65), makeYear(70)],
      makeSummary({ financialExhaustionAge: 59, failureAge: 71 }),
      makePropertyOptions(),
      inputs,
      'selected',
      'keep',
    );

    expect(events.every((event) => event.age >= 60 && event.age <= 70)).toBe(true);
    expect(events.some((event) => event.kind === 'property_intervention_start')).toBe(false);
    expect(events.some((event) => event.kind === 'child_expense_end')).toBe(false);
    expect(events.some((event) => event.kind === 'lifestyle_shortfall_start')).toBe(false);
  });
});
