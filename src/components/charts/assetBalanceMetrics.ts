import type { MonthlySnapshotV2, YearlyAggregateV2 } from '../../types/calculationV2';

export interface CashflowByAgeMaps {
  monthlySalaryByAge: Map<number, number>;
  monthlyPensionByAge: Map<number, number>;
  monthlyLivingExpenseByAge: Map<number, number>;
  monthlyRentByAge: Map<number, number>;
  monthlyDebtServiceByAge: Map<number, number>;
  monthlyChildExpenseByAge: Map<number, number>;
  monthlyIncomeByAge: Map<number, number>;
  monthlyOutflowByAge: Map<number, number>;
  monthlyNetByAge: Map<number, number>;
}

function averageMonthly(rows: MonthlySnapshotV2[], pick: (row: MonthlySnapshotV2) => number): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => sum + pick(row), 0);
  return total / rows.length;
}

function buildAgeMap(rows: YearlyAggregateV2[], pick: (row: MonthlySnapshotV2) => number): Map<number, number> {
  return new Map<number, number>(
    rows.map((row) => [row.ageYear, averageMonthly(row.months, pick)]),
  );
}

export function buildCashflowByAgeMaps(rows: YearlyAggregateV2[]): CashflowByAgeMaps {
  const monthlySalaryByAge = buildAgeMap(rows, (row) => row.incomeThisMonth);
  const monthlyPensionByAge = buildAgeMap(rows, (row) => row.pensionThisMonth);
  const monthlyLivingExpenseByAge = buildAgeMap(rows, (row) => row.expenseThisMonth);
  const monthlyRentByAge = buildAgeMap(rows, (row) => row.rentalCostThisMonth);
  const monthlyDebtServiceByAge = buildAgeMap(rows, (row) => row.debtServiceThisMonth);
  const monthlyChildExpenseByAge = buildAgeMap(rows, (row) => row.childExpenseThisMonth);

  const monthlyIncomeByAge = new Map<number, number>(
    rows.map((row) => [
      row.ageYear,
      (monthlySalaryByAge.get(row.ageYear) ?? 0) + (monthlyPensionByAge.get(row.ageYear) ?? 0),
    ]),
  );

  const monthlyOutflowByAge = new Map<number, number>(
    rows.map((row) => [
      row.ageYear,
      (monthlyLivingExpenseByAge.get(row.ageYear) ?? 0) +
      (monthlyRentByAge.get(row.ageYear) ?? 0) +
      (monthlyDebtServiceByAge.get(row.ageYear) ?? 0) +
      (monthlyChildExpenseByAge.get(row.ageYear) ?? 0),
    ]),
  );

  const monthlyNetByAge = new Map<number, number>(
    rows.map((row) => [
      row.ageYear,
      (monthlyIncomeByAge.get(row.ageYear) ?? 0) - (monthlyOutflowByAge.get(row.ageYear) ?? 0),
    ]),
  );

  return {
    monthlySalaryByAge,
    monthlyPensionByAge,
    monthlyLivingExpenseByAge,
    monthlyRentByAge,
    monthlyDebtServiceByAge,
    monthlyChildExpenseByAge,
    monthlyIncomeByAge,
    monthlyOutflowByAge,
    monthlyNetByAge,
  };
}

