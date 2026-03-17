import { create } from 'zustand';
import type { PlannerInputs, AssetAllocation, DebtAllocation } from '../types/inputs';
import type { CalculationResult, Verdict } from '../types/calculation';
import { DEFAULT_INFLATION_RATE, DEFAULT_INCOME_GROWTH_RATE, DEFAULT_EXPENSE_GROWTH_RATE, DEFAULT_ASSET_RETURNS } from '../utils/constants';
import { calcTotalAsset, calcTotalDebt, calcWeightedReturn, calcTotalAnnualRepayment } from '../engine/assetWeighting';
import { simulate } from '../engine/calculator';
import { findMaxSustainableMonthly } from '../engine/binarySearch';
import { judgeVerdict } from '../engine/verdictEngine';

const defaultInputs: PlannerInputs = {
  goal: {
    retirementAge: 0,
    lifeExpectancy: 0,
    targetMonthly: 0,
    inflationRate: DEFAULT_INFLATION_RATE,
  },
  status: {
    currentAge: 0,
    annualIncome: 0,
    incomeGrowthRate: DEFAULT_INCOME_GROWTH_RATE,
    annualExpense: 0,
    expenseGrowthRate: DEFAULT_EXPENSE_GROWTH_RATE,
  },
  assets: {
    cash:       { amount: 0, expectedReturn: DEFAULT_ASSET_RETURNS.cash },
    deposit:    { amount: 0, expectedReturn: DEFAULT_ASSET_RETURNS.deposit },
    stock_kr:   { amount: 0, expectedReturn: DEFAULT_ASSET_RETURNS.stock_kr },
    stock_us:   { amount: 0, expectedReturn: DEFAULT_ASSET_RETURNS.stock_us },
    bond:       { amount: 0, expectedReturn: DEFAULT_ASSET_RETURNS.bond },
    crypto:     { amount: 0, expectedReturn: DEFAULT_ASSET_RETURNS.crypto },
    realEstate: { amount: 0, expectedReturn: DEFAULT_ASSET_RETURNS.realEstate },
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
};

function runCalculation(inputs: PlannerInputs): CalculationResult {
  const { goal, status, assets, debts, children } = inputs;

  // 필수 항목이 하나라도 0이면 계산하지 않음
  const requiredFieldsMissing =
    status.currentAge <= 0 ||
    goal.retirementAge <= 0 ||
    goal.lifeExpectancy <= 0 ||
    goal.targetMonthly <= 0;

  const earlyTotalAsset = calcTotalAsset(assets);
  const earlyLiquidRatio = earlyTotalAsset > 0
    ? (earlyTotalAsset - assets.realEstate.amount) / earlyTotalAsset
    : 1;

  if (requiredFieldsMissing) {
    return {
      totalAsset: earlyTotalAsset,
      totalDebt: calcTotalDebt(debts),
      netWorth: earlyTotalAsset - calcTotalDebt(debts),
      weightedReturn: 0, annualNetSavings: 0,
      annualChildExpense: 0, requiredMonthlyAtRetirement: 0,
      liquidRatio: earlyLiquidRatio,
      possibleMonthly: 0, yearlySnapshots: [],
      isValid: false,
      errorMessage: null,
    };
  }

  if (
    goal.retirementAge <= status.currentAge ||
    goal.lifeExpectancy <= goal.retirementAge
  ) {
    return {
      totalAsset: earlyTotalAsset,
      totalDebt: calcTotalDebt(debts),
      netWorth: earlyTotalAsset - calcTotalDebt(debts),
      weightedReturn: 0, annualNetSavings: 0,
      annualChildExpense: 0, requiredMonthlyAtRetirement: 0,
      liquidRatio: earlyLiquidRatio,
      possibleMonthly: 0, yearlySnapshots: [],
      isValid: false,
      errorMessage: '은퇴 나이는 현재 나이보다, 기대수명은 은퇴 나이보다 커야 해요.',
    };
  }

  const totalAsset = calcTotalAsset(assets);
  const totalDebt = calcTotalDebt(debts);
  const netWorth = totalAsset - totalDebt;
  const weightedReturn = calcWeightedReturn(assets);
  // 유동자산 비율: realEstate 제외 (현금화 불가 비유동자산)
  const liquidAsset = totalAsset - assets.realEstate.amount;
  const liquidRatio = totalAsset > 0 ? liquidAsset / totalAsset : 1;
  const totalAnnualRepayment = calcTotalAnnualRepayment(debts);
  // 자녀 연지출: 표시용 (hasChildren이면 항상 보여줌)
  const annualChildExpense = children.hasChildren
    ? children.count * children.monthlyPerChild * 12
    : 0;

  const yearsToRetirement = goal.retirementAge - status.currentAge;
  const inflationDecimal = goal.inflationRate / 100;
  const requiredMonthlyAtRetirement =
    goal.targetMonthly * Math.pow(1 + inflationDecimal, yearsToRetirement);

  // 순저축 계산: 자녀가 이미 독립했으면 자녀비 차감 안 함 (시뮬레이션과 동일 조건)
  const childExpenseForSavings =
    children.hasChildren && status.currentAge <= children.independenceAge
      ? annualChildExpense
      : 0;
  const annualNetSavings = status.annualIncome - status.annualExpense - totalAnnualRepayment - childExpenseForSavings;

  const possibleMonthly = findMaxSustainableMonthly(inputs);
  const yearlySnapshots = simulate(inputs, possibleMonthly);

  return {
    totalAsset,
    totalDebt,
    netWorth,
    weightedReturn,
    annualNetSavings,
    annualChildExpense,
    requiredMonthlyAtRetirement,
    liquidRatio,
    possibleMonthly,
    yearlySnapshots,
    isValid: true,
  };
}

interface PlannerStore {
  inputs: PlannerInputs;
  result: CalculationResult;
  verdict: Verdict | null;
  setGoal: (partial: Partial<PlannerInputs['goal']>) => void;
  setStatus: (partial: Partial<PlannerInputs['status']>) => void;
  setAsset: (key: keyof AssetAllocation, partial: Partial<AssetAllocation[keyof AssetAllocation]>) => void;
  setDebt: (key: keyof DebtAllocation, partial: Partial<DebtAllocation[keyof DebtAllocation]>) => void;
  setChildren: (partial: Partial<PlannerInputs['children']>) => void;
}

const computeState = (inputs: PlannerInputs): Pick<PlannerStore, 'inputs' | 'result' | 'verdict'> => {
  const result = runCalculation(inputs);
  const verdict = result.isValid
    ? judgeVerdict(inputs.goal.targetMonthly, result.possibleMonthly)
    : null;
  return { inputs, result, verdict };
};

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  ...computeState(defaultInputs),

  setGoal: (partial) => {
    const inputs: PlannerInputs = { ...get().inputs, goal: { ...get().inputs.goal, ...partial } };
    set(computeState(inputs));
  },
  setStatus: (partial) => {
    const inputs: PlannerInputs = { ...get().inputs, status: { ...get().inputs.status, ...partial } };
    set(computeState(inputs));
  },
  setAsset: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      assets: { ...get().inputs.assets, [key]: { ...get().inputs.assets[key], ...partial } },
    };
    set(computeState(inputs));
  },
  setDebt: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      debts: { ...get().inputs.debts, [key]: { ...get().inputs.debts[key], ...partial } },
    };
    set(computeState(inputs));
  },
  setChildren: (partial) => {
    const inputs: PlannerInputs = { ...get().inputs, children: { ...get().inputs.children, ...partial } };
    set(computeState(inputs));
  },
}));
