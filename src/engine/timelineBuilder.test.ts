import { describe, it, expect } from 'vitest';
import { runCalculationV2 } from './calculatorV2';
import { precomputeDebtSchedules } from './assetWeighting';
import { DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY } from './fundingPolicy';
import { extractEvents } from './timelineBuilder';
import type { PlannerInputs } from '../types/inputs';

describe('timelineBuilder — 매각 이벤트 데이터 정합성', () => {
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
        expenseGrowthRate: 0,
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
