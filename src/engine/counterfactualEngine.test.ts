import { describe, expect, it } from 'vitest';
import type { MonthlySnapshotV2 } from '../types/calculationV2';
import { extractDeficitStartAge, extractTotalLateLifeShortfall } from './counterfactualEngine';

/**
 * Minimal snapshot factory: only the fields used by extractDeficitStartAge
 * and extractTotalLateLifeShortfall are meaningful; everything else is 0.
 */
function makeSnapshot(overrides: Partial<MonthlySnapshotV2>): MonthlySnapshotV2 {
  return {
    ageYear: 65,
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
    ...overrides,
  };
}

describe('A1: vehicle cost double-counting fix', () => {
  describe('extractDeficitStartAge does NOT double-count vehicleCostThisMonth', () => {
    it('should return correct deficitStartAge when vehicleCostThisMonth is embedded in expenseThisMonth', () => {
      // Scenario: 3 months of snapshots at age 65, 66, 67.
      // Month at age 66: totalIncome (100+50=150) < totalExpense (expenseThisMonth=200 which already includes vehicle=30).
      // If double-counting existed (adding vehicleCostThisMonth=30 again), totalExpense would be 230, which is
      // still a deficit -- but the CORRECT totalExpense is 200 (not 230).
      //
      // To make the test sensitive to double-counting:
      // Set income so that: 150 < 200 (deficit with correct logic) AND 150 < 230 (deficit with double-count too).
      // Instead, design it so income=210 > expense=200 (no deficit) but income=210 < 230 (deficit if double-counted).
      const snapshots: MonthlySnapshotV2[] = [
        makeSnapshot({
          ageYear: 65,
          incomeThisMonth: 300,
          pensionThisMonth: 0,
          expenseThisMonth: 200, // includes vehicleCostThisMonth=30
          vehicleCostThisMonth: 30,
          debtServiceThisMonth: 0,
          childExpenseThisMonth: 0,
          rentalCostThisMonth: 0,
        }),
        makeSnapshot({
          ageYear: 66,
          incomeThisMonth: 160,
          pensionThisMonth: 50,
          // totalIncome = 210, expenseThisMonth already includes vehicle cost of 30
          // totalExpense = 200 + 0 + 0 + 0 = 200
          // 210 > 200 -> no deficit (correct)
          // If double-counted: totalExpense = 200 + 30 = 230, 210 < 230 -> deficit at 66 (WRONG)
          expenseThisMonth: 200,
          vehicleCostThisMonth: 30,
          debtServiceThisMonth: 0,
          childExpenseThisMonth: 0,
          rentalCostThisMonth: 0,
        }),
        makeSnapshot({
          ageYear: 67,
          incomeThisMonth: 50,
          pensionThisMonth: 50,
          // totalIncome = 100, totalExpense = 200 -> deficit at 67
          expenseThisMonth: 200,
          vehicleCostThisMonth: 30,
          debtServiceThisMonth: 0,
          childExpenseThisMonth: 0,
          rentalCostThisMonth: 0,
        }),
      ];

      const result = extractDeficitStartAge(snapshots);

      // Correct behavior: deficit starts at 67 (income 100 < expense 200)
      // If vehicleCostThisMonth were double-counted, deficit would start at 66
      expect(result).toBe(67);
    });

    it('should return null when income exceeds expenses for all months (with vehicle costs)', () => {
      const snapshots: MonthlySnapshotV2[] = [
        makeSnapshot({
          ageYear: 65,
          incomeThisMonth: 200,
          pensionThisMonth: 100,
          expenseThisMonth: 250, // includes vehicleCostThisMonth=50
          vehicleCostThisMonth: 50,
          debtServiceThisMonth: 0,
          childExpenseThisMonth: 0,
          rentalCostThisMonth: 0,
        }),
      ];

      // totalIncome = 300, totalExpense = 250 -> no deficit
      // If double-counted: totalExpense = 300 -> break-even, still no deficit (income not < expense)
      expect(extractDeficitStartAge(snapshots)).toBeNull();
    });

    it('would FAIL if vehicleCostThisMonth were added to totalExpense (regression guard)', () => {
      // This test is specifically designed so that:
      // - Without double-counting: no deficit (income >= expense)
      // - With double-counting: deficit exists (income < expense + vehicleCost)
      const snapshots: MonthlySnapshotV2[] = [
        makeSnapshot({
          ageYear: 70,
          incomeThisMonth: 100,
          pensionThisMonth: 120,
          // totalIncome = 220
          // expenseThisMonth = 210 (already includes vehicleCostThisMonth=20)
          // Correct: totalExpense = 210 -> 220 > 210 -> no deficit
          // Double-counted: totalExpense = 210 + 20 = 230 -> 220 < 230 -> deficit at 70
          expenseThisMonth: 210,
          vehicleCostThisMonth: 20,
          debtServiceThisMonth: 0,
          childExpenseThisMonth: 0,
          rentalCostThisMonth: 0,
        }),
      ];

      // Must be null (no deficit) with correct implementation
      expect(extractDeficitStartAge(snapshots)).toBeNull();
    });
  });

  describe('extractTotalLateLifeShortfall does NOT double-count vehicle costs', () => {
    it('sums shortfallThisMonth directly without adding vehicleCostThisMonth', () => {
      // extractTotalLateLifeShortfall uses s.shortfallThisMonth, which is computed
      // in simulatorV2 AFTER expenseThisMonth already includes vehicleCostThisMonth.
      // Verify the function only sums shortfallThisMonth values.
      const snapshots: MonthlySnapshotV2[] = [
        makeSnapshot({
          ageYear: 80,
          shortfallThisMonth: 0,
          vehicleCostThisMonth: 30,
        }),
        makeSnapshot({
          ageYear: 81,
          shortfallThisMonth: 50,
          vehicleCostThisMonth: 30,
        }),
        makeSnapshot({
          ageYear: 82,
          shortfallThisMonth: 100,
          vehicleCostThisMonth: 30,
        }),
      ];

      // Should be 50 + 100 = 150, NOT 50+30 + 100+30 = 210
      expect(extractTotalLateLifeShortfall(snapshots)).toBe(150);
    });

    it('returns 0 when no shortfalls exist regardless of vehicle costs', () => {
      const snapshots: MonthlySnapshotV2[] = [
        makeSnapshot({ shortfallThisMonth: 0, vehicleCostThisMonth: 50 }),
        makeSnapshot({ shortfallThisMonth: 0, vehicleCostThisMonth: 50 }),
      ];

      expect(extractTotalLateLifeShortfall(snapshots)).toBe(0);
    });
  });
});
