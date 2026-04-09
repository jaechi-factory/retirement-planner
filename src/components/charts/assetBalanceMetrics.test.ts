import { describe, expect, it } from 'vitest';
import type { YearlyAggregateV2 } from '../../types/calculationV2';
import { buildCashflowByAgeMaps } from './assetBalanceMetrics';

function createYear(ageYear: number): YearlyAggregateV2 {
  return {
    ageYear,
    cashLikeEnd: 1000,
    financialInvestableEnd: 2000,
    propertyValueEnd: 3000,
    securedLoanBalanceEnd: 0,
    propertySaleProceedsBucketEnd: 0,
    totalShortfall: 0,
    totalIncome: 0,
    totalPension: 0,
    totalExpense: 0,
    totalDebtService: 0,
    totalChildExpense: 0,
    totalRentalCost: 0,
    eventSummary: [],
    months: [
      {
        ageYear,
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
        incomeThisMonth: 500,
        pensionThisMonth: 100,
        expenseThisMonth: 300,
        debtServiceThisMonth: 80,
        childExpenseThisMonth: 20,
        rentalCostThisMonth: 50,
        eventFlags: {},
        cashEnd: 0,
        depositEnd: 0,
        bondEnd: 0,
        stockKrEnd: 0,
        stockUsEnd: 0,
        cryptoEnd: 0,
      },
      {
        ageYear,
        ageMonthIndex: 1,
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
        incomeThisMonth: 700,
        pensionThisMonth: 300,
        expenseThisMonth: 350,
        debtServiceThisMonth: 120,
        childExpenseThisMonth: 40,
        rentalCostThisMonth: 150,
        eventFlags: {},
        cashEnd: 0,
        depositEnd: 0,
        bondEnd: 0,
        stockKrEnd: 0,
        stockUsEnd: 0,
        cryptoEnd: 0,
      },
    ],
  };
}

describe('buildCashflowByAgeMaps', () => {
  it('월별 원천값 평균에서 수입/지출/잔액 합계를 정확히 만들어야 한다', () => {
    const rows = [createYear(55)];
    const maps = buildCashflowByAgeMaps(rows);

    expect(maps.monthlySalaryByAge.get(55)).toBe(600);
    expect(maps.monthlyPensionByAge.get(55)).toBe(200);
    expect(maps.monthlyLivingExpenseByAge.get(55)).toBe(325);
    expect(maps.monthlyRentByAge.get(55)).toBe(100);
    expect(maps.monthlyDebtServiceByAge.get(55)).toBe(100);
    expect(maps.monthlyChildExpenseByAge.get(55)).toBe(30);

    expect(maps.monthlyIncomeByAge.get(55)).toBe(800);
    expect(maps.monthlyOutflowByAge.get(55)).toBe(555);
    expect(maps.monthlyNetByAge.get(55)).toBe(245);
  });
});

