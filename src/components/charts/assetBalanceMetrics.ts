import type { MonthlySnapshotV2, YearlyAggregateV2 } from '../../types/calculationV2';
import type { AssetAllocation } from '../../types/inputs';

export interface AgeSnapshotData {
  age: number;
  isRetirementYear: boolean;
  // income
  monthlySalary: number;
  monthlyPension: number;
  monthlyPublicPension: number;
  monthlyPublicPensionRealTodayValue: number;
  monthlyRetirementPension: number;
  monthlyRetirementPensionRealTodayValue: number;
  monthlyPrivatePension: number;
  monthlyPrivatePensionRealTodayValue: number;
  monthlyIncome: number;
  // expense
  monthlyLivingExpense: number;
  monthlyRent: number;
  monthlyDebtService: number;
  monthlyChildExpense: number;
  monthlyVehicleCost: number;
  monthlyOutflow: number;
  // net
  monthlyNet: number;
  // assets (year-end balances)
  cashLike: number;
  financialInvestable: number;
  propertyValue: number;
  saleProceedsEnd: number;
  monthlySaleProceedsReturn: number;
  monthlyAssetIncomeRealTodayValue: number;
  monthlyAssetIncomeBreakdown: {
    cash: number;
    deposit: number;
    bond: number;
    stock_kr: number;
    stock_us: number;
    crypto: number;
  };
  totalAssets: number;
  // events
  pensionEvents: Array<{ name: string; monthly: number }>;
}

export interface CashflowByAgeMaps {
  monthlySalaryByAge: Map<number, number>;
  monthlyPensionByAge: Map<number, number>;
  monthlyLivingExpenseByAge: Map<number, number>;
  monthlyRentByAge: Map<number, number>;
  monthlyDebtServiceByAge: Map<number, number>;
  monthlyChildExpenseByAge: Map<number, number>;
  monthlyVehicleCostByAge: Map<number, number>;
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
  const monthlyVehicleCostByAge = buildAgeMap(rows, (row) => row.vehicleCostThisMonth);

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
    monthlyVehicleCostByAge,
    monthlyIncomeByAge,
    monthlyOutflowByAge,
    monthlyNetByAge,
  };
}

export function getAgeSnapshot(params: {
  age: number;
  retirementAge: number;
  rows: YearlyAggregateV2[];
  cashflow: CashflowByAgeMaps;
  monthlyPublicPensionByAge: Map<number, number>;
  monthlyPublicPensionRealByAge: Map<number, number>;
  monthlyRetirementPensionByAge: Map<number, number>;
  monthlyRetirementPensionRealByAge: Map<number, number>;
  monthlyPrivatePensionByAge: Map<number, number>;
  monthlyPrivatePensionRealByAge: Map<number, number>;
  pensionStartMap: Map<number, Array<{ name: string; monthly: number }>>;
  assets: AssetAllocation;
  inflationRate: number;
  currentAge: number;
}): AgeSnapshotData | null {
  const {
    age, retirementAge, rows, cashflow,
    monthlyPublicPensionByAge, monthlyPublicPensionRealByAge,
    monthlyRetirementPensionByAge, monthlyRetirementPensionRealByAge,
    monthlyPrivatePensionByAge, monthlyPrivatePensionRealByAge,
    pensionStartMap, assets, inflationRate, currentAge,
  } = params;
  const row = rows.find((r) => r.ageYear === age);
  if (!row) return null;

  // 자산 소득 (투자수익): 버킷별 잔고 × 월이율, 월평균 → 현재가치 환산
  const monthlyRate = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;
  const mrCash = monthlyRate(assets.cash.expectedReturn);
  const mrDeposit = monthlyRate(assets.deposit.expectedReturn);
  const mrBond = monthlyRate(assets.bond.expectedReturn);
  const mrStockKr = monthlyRate(assets.stock_kr.expectedReturn);
  const mrStockUs = monthlyRate(assets.stock_us.expectedReturn);
  const mrCrypto = monthlyRate(assets.crypto.expectedReturn);
  const monthCount = row.months.length || 1;
  const sumCash = row.months.reduce((s, m) => s + m.cashEnd * mrCash, 0) / monthCount;
  const sumDeposit = row.months.reduce((s, m) => s + m.depositEnd * mrDeposit, 0) / monthCount;
  const sumBond = row.months.reduce((s, m) => s + m.bondEnd * mrBond, 0) / monthCount;
  const sumStockKr = row.months.reduce((s, m) => s + m.stockKrEnd * mrStockKr, 0) / monthCount;
  const sumStockUs = row.months.reduce((s, m) => s + m.stockUsEnd * mrStockUs, 0) / monthCount;
  const sumCrypto = row.months.reduce((s, m) => s + m.cryptoEnd * mrCrypto, 0) / monthCount;
  const monthlyAssetIncomeNominal = sumCash + sumDeposit + sumBond + sumStockKr + sumStockUs + sumCrypto;
  const yearsFromCurrent = Math.max(0, age - currentAge);
  const inflationDivisor = Math.pow(1 + inflationRate / 100, yearsFromCurrent);
  const deflate = (v: number) => inflationDivisor > 0 ? v / inflationDivisor : v;
  const monthlyAssetIncomeRealTodayValue = deflate(monthlyAssetIncomeNominal);
  const monthlyAssetIncomeBreakdown = {
    cash: deflate(sumCash),
    deposit: deflate(sumDeposit),
    bond: deflate(sumBond),
    stock_kr: deflate(sumStockKr),
    stock_us: deflate(sumStockUs),
    crypto: deflate(sumCrypto),
  };

  const monthlySalary = cashflow.monthlySalaryByAge.get(age) ?? 0;
  const monthlyPension = cashflow.monthlyPensionByAge.get(age) ?? 0;
  const monthlyPublicPension = monthlyPublicPensionByAge.get(age) ?? 0;
  const monthlyPublicPensionRealTodayValue = monthlyPublicPensionRealByAge.get(age) ?? 0;
  const monthlyRetirementPension = monthlyRetirementPensionByAge.get(age) ?? 0;
  const monthlyRetirementPensionRealTodayValue = monthlyRetirementPensionRealByAge.get(age) ?? 0;
  const monthlyPrivatePension = monthlyPrivatePensionByAge.get(age) ?? 0;
  const monthlyPrivatePensionRealTodayValue = monthlyPrivatePensionRealByAge.get(age) ?? 0;
  const monthlyIncome = cashflow.monthlyIncomeByAge.get(age) ?? 0;
  const monthlyLivingExpense = cashflow.monthlyLivingExpenseByAge.get(age) ?? 0;
  const monthlyRent = cashflow.monthlyRentByAge.get(age) ?? 0;
  const monthlyDebtService = cashflow.monthlyDebtServiceByAge.get(age) ?? 0;
  const monthlyChildExpense = cashflow.monthlyChildExpenseByAge.get(age) ?? 0;
  const monthlyVehicleCost = cashflow.monthlyVehicleCostByAge.get(age) ?? 0;
  const monthlyOutflow = cashflow.monthlyOutflowByAge.get(age) ?? 0;
  const monthlyNet = cashflow.monthlyNetByAge.get(age) ?? 0;
  const totalAssets =
    row.cashLikeEnd +
    row.financialInvestableEnd +
    row.propertyValueEnd +
    row.propertySaleProceedsBucketEnd;

  return {
    age,
    isRetirementYear: age === retirementAge,
    monthlySalary,
    monthlyPension,
    monthlyPublicPension,
    monthlyPublicPensionRealTodayValue,
    monthlyRetirementPension,
    monthlyRetirementPensionRealTodayValue,
    monthlyPrivatePension,
    monthlyPrivatePensionRealTodayValue,
    monthlyIncome,
    monthlyLivingExpense,
    monthlyRent,
    monthlyDebtService,
    monthlyChildExpense,
    monthlyVehicleCost,
    monthlyOutflow,
    monthlyNet,
    cashLike: row.cashLikeEnd,
    financialInvestable: row.financialInvestableEnd,
    propertyValue: row.propertyValueEnd,
    saleProceedsEnd: row.propertySaleProceedsBucketEnd,
    monthlySaleProceedsReturn: row.propertySaleProceedsBucketEnd > 0
      ? Math.round(row.propertySaleProceedsBucketEnd * (Math.pow(1.04, 1 / 12) - 1))
      : 0,
    monthlyAssetIncomeRealTodayValue,
    monthlyAssetIncomeBreakdown,
    totalAssets,
    pensionEvents: pensionStartMap.get(age) ?? [],
  };
}
