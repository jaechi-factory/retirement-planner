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

