import { describe, expect, it } from 'vitest';
import type { MonthlySnapshotV2, PropertyOptionResult, YearlyAggregateV2 } from '../../types/calculationV2';
import { buildHouseDecisionRowsVM } from './houseDecisionVM';

function createMonth(partial: Partial<MonthlySnapshotV2> = {}): MonthlySnapshotV2 {
  return {
    ageYear: 70,
    ageMonthIndex: 0,
    cashLikeEnd: 0,
    financialInvestableEnd: 0,
    propertyValueEnd: 0,
    mortgageDebtEnd: 0,
    nonMortgageDebtEnd: 0,
    totalDebtEnd: 0,
    securedLoanBalanceEnd: 0,
    propertySaleProceedsBucketEnd: 0,
    propertySaleGrossProceedsThisMonth: 0,
    propertySaleDebtSettledThisMonth: 0,
    propertySaleNetProceedsThisMonth: 0,
    shortfallThisMonth: 0,
    incomeThisMonth: 0,
    pensionThisMonth: 0,
    expenseThisMonth: 0,
    debtServiceThisMonth: 0,
    childExpenseThisMonth: 0,
    rentalCostThisMonth: 0,
    vehicleCostThisMonth: 0,
    eventFlags: {},
    cashEnd: 0,
    depositEnd: 0,
    bondEnd: 0,
    stockKrEnd: 0,
    stockUsEnd: 0,
    cryptoEnd: 0,
    ...partial,
  };
}

function createYear(ageYear: number, months: MonthlySnapshotV2[]): YearlyAggregateV2 {
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
    months,
  };
}

function createOption(strategy: PropertyOptionResult['strategy'], overrides: Partial<PropertyOptionResult> = {}): PropertyOptionResult {
  return {
    strategy,
    label: strategy,
    sustainableMonthly: 500,
    interventionAge: strategy === 'keep' ? null : 75,
    survivesToLifeExpectancy: true,
    failureAge: null,
    finalNetWorth: 10000,
    headline: `${strategy} headline`,
    isRecommended: false,
    yearlyAggregates: [createYear(75, [createMonth()])],
    ...overrides,
  };
}

describe('buildHouseDecisionRowsVM', () => {
  it('전략 순서를 keep -> secured_loan -> sell로 반환하고 선택 상태를 반영해야 한다', () => {
    const rows = buildHouseDecisionRowsVM({
      propertyOptions: [
        createOption('sell'),
        createOption('keep'),
        createOption('secured_loan'),
      ],
      selectedStrategy: 'secured_loan',
      lifeExpectancy: 90,
    });

    expect(rows.map((row) => row.strategy)).toEqual(['keep', 'secured_loan', 'sell']);
    expect(rows[1].isSelected).toBe(true);
    expect(rows[0].isSelected).toBe(false);
    expect(rows[1].strategyLabel).toBe('집을 담보로 대출받을 때');
  });

  it('sell 전략은 집을 팔고 손에 남는 돈 문구를 만든다', () => {
    const saleYear = createYear(75, [
      createMonth({ propertySaleNetProceedsThisMonth: 12345 }),
      createMonth({ propertySaleNetProceedsThisMonth: 0 }),
    ]);

    const rows = buildHouseDecisionRowsVM({
      propertyOptions: [
        createOption('keep'),
        createOption('secured_loan'),
        createOption('sell', { yearlyAggregates: [saleYear] }),
      ],
      selectedStrategy: 'sell',
      lifeExpectancy: 90,
    });

    const sellRow = rows.find((row) => row.strategy === 'sell');
    expect(sellRow?.houseCashSupportText).toContain('집을 팔고 손에 남는 돈');
  });

  it('연도 데이터가 없으면 선택 불가로 표시한다', () => {
    const rows = buildHouseDecisionRowsVM({
      propertyOptions: [
        createOption('keep', { yearlyAggregates: [] }),
        createOption('secured_loan'),
        createOption('sell'),
      ],
      selectedStrategy: 'keep',
      lifeExpectancy: 90,
    });

    const keepRow = rows.find((row) => row.strategy === 'keep');
    expect(keepRow?.isSelectable).toBe(false);
    expect(keepRow?.disabledReason).toBeTruthy();
    expect(keepRow?.startAgeText).toBe('계산 불가');
  });
});
