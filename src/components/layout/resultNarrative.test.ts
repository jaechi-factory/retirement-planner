import { describe, expect, it } from 'vitest';
import type { CalculationResultV2 } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import { buildResultNarrativeModel } from './resultNarrative';

function createInputs(): PlannerInputs {
  return {
    goal: {
      retirementAge: 60,
      lifeExpectancy: 90,
      targetMonthly: 500,
      inflationRate: 2.5,
    },
    status: {
      currentAge: 35,
      annualIncome: 7200,
      incomeGrowthRate: 3,
      annualExpense: 3600,
      expenseGrowthRate: 2,
    },
    assets: {
      cash: { amount: 1000, expectedReturn: 1 },
      deposit: { amount: 1000, expectedReturn: 2 },
      stock_kr: { amount: 2000, expectedReturn: 6 },
      stock_us: { amount: 2000, expectedReturn: 7 },
      bond: { amount: 1000, expectedReturn: 3 },
      crypto: { amount: 300, expectedReturn: 8 },
      realEstate: { amount: 30000, expectedReturn: 2 },
    },
    debts: {
      mortgage: { balance: 5000, interestRate: 4, repaymentType: 'equal_payment', repaymentYears: 20 },
      creditLoan: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      otherLoan: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
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
      publicPension: {
        enabled: true,
        mode: 'manual',
        startAge: 65,
        manualMonthlyTodayValue: 150,
        workStartAge: 26,
      },
      retirementPension: {
        enabled: true,
        mode: 'manual',
        startAge: 60,
        payoutYears: 20,
        currentBalance: 0,
        accumulationReturnRate: 3,
        payoutReturnRate: 2,
        manualMonthlyTodayValue: 100,
      },
      privatePension: {
        enabled: false,
        mode: 'manual',
        startAge: 60,
        payoutYears: 20,
        currentBalance: 0,
        monthlyContribution: 0,
        expectedReturnRate: 3,
        accumulationReturnRate: 3,
        payoutReturnRate: 2,
        manualMonthlyTodayValue: 0,
        detailMode: false,
        products: [],
      },
    },
  };
}

function createBaseSummary(): CalculationResultV2['summary'] {
  return {
    sustainableMonthly: 520,
    targetGap: 20,
    maxSustainableMonthly: 550,
    maxTargetGap: 50,
    recommendedStrategy: 'keep',
    maxSustainableStrategy: 'sell',
    recommendationMode: 'max_sustainable',
    financialSellStartAge: 72,
    financialExhaustionAge: null,
    propertyInterventionAge: null,
    failureAge: null,
  };
}

function createPropertyOptions(
  recommendedStrategy: 'keep' | 'secured_loan' | 'sell',
): CalculationResultV2['propertyOptions'] {
  return [
    {
      strategy: 'keep',
      label: '집 그대로',
      sustainableMonthly: 520,
      interventionAge: null,
      survivesToLifeExpectancy: true,
      failureAge: null,
      finalNetWorth: 1000,
      headline: 'keep',
      isRecommended: recommendedStrategy === 'keep',
      yearlyAggregates: [],
    },
    {
      strategy: 'secured_loan',
      label: '담보대출',
      sustainableMonthly: 500,
      interventionAge: 80,
      survivesToLifeExpectancy: true,
      failureAge: null,
      finalNetWorth: 900,
      headline: 'loan',
      isRecommended: recommendedStrategy === 'secured_loan',
      yearlyAggregates: [],
    },
    {
      strategy: 'sell',
      label: '매각',
      sustainableMonthly: 550,
      interventionAge: 78,
      survivesToLifeExpectancy: true,
      failureAge: null,
      finalNetWorth: 800,
      headline: 'sell',
      isRecommended: recommendedStrategy === 'sell',
      yearlyAggregates: [],
    },
  ];
}

describe('buildResultNarrativeModel', () => {
  it('유지 시나리오에서는 유지 메시지와 양수 톤을 반환해야 한다', () => {
    const model = buildResultNarrativeModel({
      summary: createBaseSummary(),
      propertyOptions: createPropertyOptions('keep'),
      inputs: createInputs(),
      hasRealEstate: true,
    });

    expect(model.headline).toContain('목표 생활비');
    expect(model.metrics).toHaveLength(3);
    expect(model.metrics[2].value).toContain('90세까지');
    expect(model.metrics[2].tone).toBe('positive');
    expect(model.recommendedStrategyLabel).toBe('집을 그대로 둘 때');
    expect(model.insightLines).toHaveLength(3);
  });

  it('집 활용 시나리오에서는 추천 전략 라벨이 담보대출 문구로 노출되어야 한다', () => {
    const summary: CalculationResultV2['summary'] = {
      ...createBaseSummary(),
      recommendedStrategy: 'secured_loan',
      propertyInterventionAge: 81,
    };
    const model = buildResultNarrativeModel({
      summary,
      propertyOptions: createPropertyOptions('secured_loan'),
      inputs: createInputs(),
      hasRealEstate: true,
    });

    expect(model.recommendedStrategyLabel).toBe('집을 담보로 대출받을 때');
    expect(model.insightLines[2]).toContain('집을 담보로 대출받거나 팔아야');
  });

  it('실패 시나리오에서는 소진 나이와 음수 톤을 반환해야 한다', () => {
    const summary: CalculationResultV2['summary'] = { ...createBaseSummary(), targetGap: -80, failureAge: 84 };
    const model = buildResultNarrativeModel({
      summary,
      propertyOptions: createPropertyOptions('keep'),
      inputs: createInputs(),
      hasRealEstate: false,
    });

    expect(model.headline).toContain('84세');
    expect(model.metrics[1].tone).toBe('negative');
    expect(model.metrics[2].value).toContain('84세부터 부족');
    expect(model.recommendedStrategyLabel).toBe('집 없음(금융자산 기준)');
  });
});
