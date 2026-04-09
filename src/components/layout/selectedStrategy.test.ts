import { describe, expect, it } from 'vitest';
import type { PropertyOptionResult, YearlyAggregateV2 } from '../../types/calculationV2';
import { pickDefaultSelectedStrategy, resolveSelectedStrategy } from './selectedStrategy';

function createYear(ageYear: number): YearlyAggregateV2 {
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

function createOption(strategy: PropertyOptionResult['strategy'], overrides: Partial<PropertyOptionResult> = {}): PropertyOptionResult {
  return {
    strategy,
    label: strategy,
    sustainableMonthly: 500,
    interventionAge: null,
    survivesToLifeExpectancy: true,
    failureAge: null,
    finalNetWorth: 10000,
    headline: `${strategy} headline`,
    isRecommended: false,
    yearlyAggregates: [createYear(70)],
    ...overrides,
  };
}

describe('selected strategy helpers', () => {
  it('기본 선택은 sell 우선이어야 한다', () => {
    const selected = pickDefaultSelectedStrategy([
      createOption('keep', { isRecommended: true }),
      createOption('secured_loan'),
      createOption('sell'),
    ], 'keep');

    expect(selected).toBe('sell');
  });

  it('sell이 선택 불가면 추천 전략을 기본 선택으로 사용한다', () => {
    const selected = pickDefaultSelectedStrategy([
      createOption('keep'),
      createOption('secured_loan', { isRecommended: true }),
      createOption('sell', { yearlyAggregates: [] }),
    ], 'keep');

    expect(selected).toBe('secured_loan');
  });

  it('현재 선택 전략이 선택 가능하면 그대로 유지한다', () => {
    const selected = resolveSelectedStrategy({
      propertyOptions: [
        createOption('keep', { isRecommended: true }),
        createOption('secured_loan'),
        createOption('sell', { yearlyAggregates: [] }),
      ],
      currentSelected: 'secured_loan',
      recommendedStrategy: 'keep',
    });

    expect(selected).toBe('secured_loan');
  });

  it('현재 선택 전략이 불가해지면 기본 선택 규칙으로 재선정한다', () => {
    const selected = resolveSelectedStrategy({
      propertyOptions: [
        createOption('keep', { isRecommended: true }),
        createOption('secured_loan', { yearlyAggregates: [] }),
        createOption('sell', { yearlyAggregates: [] }),
      ],
      currentSelected: 'secured_loan',
      recommendedStrategy: 'keep',
    });

    expect(selected).toBe('keep');
  });
});
