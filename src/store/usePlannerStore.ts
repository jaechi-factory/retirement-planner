import { create } from 'zustand';
import type { PlannerInputs, AssetAllocation, DebtAllocation } from '../types/inputs';
import type { PensionInputs } from '../types/pension';
import type { CalculationResult, Verdict } from '../types/calculation';
import { DEFAULT_INFLATION_RATE, DEFAULT_INCOME_GROWTH_RATE, DEFAULT_EXPENSE_GROWTH_RATE, DEFAULT_ASSET_RETURNS } from '../utils/constants';
import { calcTotalAsset, calcTotalDebt, calcWeightedReturn, calcTotalAnnualRepayment } from '../engine/assetWeighting';
import { simulate, findDepletionAge } from '../engine/calculator';
import { findMaxSustainableMonthly } from '../engine/binarySearch';
import { judgeVerdict } from '../engine/verdictEngine';
import { getTotalMonthlyPensionTodayValue, getPensionMonthlyAtRetirementStart, getNPSStartAgeByBirthYear } from '../engine/pensionEstimation';

const defaultPension: PensionInputs = {
  publicPension: {
    enabled: true,
    mode: 'auto',
    startAge: 65,
    manualMonthlyTodayValue: 0,
  },
  retirementPension: {
    enabled: true,
    mode: 'auto',
    startAge: 60,          // 실제 개시나이는 max(55, retirementAge)로 동적 계산
    payoutYears: 20,
    currentBalance: 0,
    accumulationReturnRate: 3.5,
    payoutReturnRate: 2.0,
    manualMonthlyTodayValue: 0,
  },
  privatePension: {
    enabled: false,
    mode: 'auto',
    startAge: 60,          // 실제 개시나이는 max(55, retirementAge)로 동적 계산
    payoutYears: 20,
    currentBalance: 0,
    monthlyContribution: 0,
    expectedReturnRate: 3.5,   // 기본 단일 수익률
    accumulationReturnRate: 3.5,
    payoutReturnRate: 3.5,
    manualMonthlyTodayValue: 0,
    detailMode: false,
    products: [],
  },
};

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
  pension: defaultPension,
};

function runCalculation(inputs: PlannerInputs): CalculationResult {
  const { goal, status, assets, debts, children, pension } = inputs;

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
      totalMonthlyPensionTodayValue: 0,
      monthlyPensionAtRetirementStart: 0,
      pensionCoverageRate: 0,
      possibleMonthly: 0, yearlySnapshots: [],
      depletionAge: null,
      targetYearlySnapshots: [],
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
      totalMonthlyPensionTodayValue: 0,
      monthlyPensionAtRetirementStart: 0,
      pensionCoverageRate: 0,
      possibleMonthly: 0, yearlySnapshots: [],
      depletionAge: null,
      targetYearlySnapshots: [],
      isValid: false,
      errorMessage: '은퇴 나이는 현재 나이보다, 기대수명은 은퇴 나이보다 커야 해요.',
    };
  }

  const totalAsset = calcTotalAsset(assets);
  const totalDebt = calcTotalDebt(debts);
  const netWorth = totalAsset - totalDebt;
  const weightedReturn = calcWeightedReturn(assets);
  const liquidAsset = totalAsset - assets.realEstate.amount;
  const liquidRatio = totalAsset > 0 ? liquidAsset / totalAsset : 1;
  const totalAnnualRepayment = calcTotalAnnualRepayment(debts);
  const annualChildExpense = children.hasChildren
    ? children.count * children.monthlyPerChild * 12
    : 0;

  const yearsToRetirement = goal.retirementAge - status.currentAge;
  const inflationDecimal = goal.inflationRate / 100;
  const requiredMonthlyAtRetirement =
    goal.targetMonthly * Math.pow(1 + inflationDecimal, yearsToRetirement);

  const childExpenseForSavings =
    children.hasChildren && status.currentAge <= children.independenceAge
      ? annualChildExpense
      : 0;
  const annualNetSavings = status.annualIncome - status.annualExpense - totalAnnualRepayment - childExpenseForSavings;

  // 연금 합계 및 커버율
  const totalMonthlyPensionTodayValue = getTotalMonthlyPensionTodayValue(
    pension,
    status.currentAge,
    goal.retirementAge,
    status.annualIncome,
  );
  const monthlyPensionAtRetirementStart = getPensionMonthlyAtRetirementStart(
    pension,
    status.currentAge,
    goal.retirementAge,
    status.annualIncome,
  );
  const pensionCoverageRate = goal.targetMonthly > 0
    ? totalMonthlyPensionTodayValue / goal.targetMonthly
    : 0;

  const possibleMonthly = findMaxSustainableMonthly(inputs);
  const yearlySnapshots = simulate(inputs, possibleMonthly);

  // 목표 생활비 기준 시뮬레이션으로 자산 소진 나이 계산
  const targetSnapshots = simulate(inputs, goal.targetMonthly);
  const depletionAge = findDepletionAge(targetSnapshots);

  return {
    totalAsset,
    totalDebt,
    netWorth,
    weightedReturn,
    annualNetSavings,
    annualChildExpense,
    requiredMonthlyAtRetirement,
    liquidRatio,
    totalMonthlyPensionTodayValue,
    monthlyPensionAtRetirementStart,
    pensionCoverageRate,
    possibleMonthly,
    yearlySnapshots,
    depletionAge,
    targetYearlySnapshots: targetSnapshots,
    isValid: true,
  };
}

const STORAGE_KEY = 'retirement-planner-inputs-v1';

function loadInputsFromStorage(): PlannerInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultInputs;
    const parsed = JSON.parse(raw) as PlannerInputs;
    // defaultInputs와 깊이 병합해 누락 필드 채우기
    return {
      goal: { ...defaultInputs.goal, ...parsed.goal },
      status: { ...defaultInputs.status, ...parsed.status },
      assets: { ...defaultInputs.assets, ...parsed.assets },
      debts: { ...defaultInputs.debts, ...parsed.debts },
      children: { ...defaultInputs.children, ...parsed.children },
      pension: parsed.pension
        ? {
            publicPension: { ...defaultInputs.pension.publicPension, ...parsed.pension.publicPension },
            retirementPension: { ...defaultInputs.pension.retirementPension, ...parsed.pension.retirementPension },
            privatePension: { ...defaultInputs.pension.privatePension, ...parsed.pension.privatePension },
          }
        : defaultInputs.pension,
    };
  } catch {
    return defaultInputs;
  }
}

function saveInputsToStorage(inputs: PlannerInputs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // 스토리지 가득 찬 경우 등 무시
  }
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
  setPension: (partial: Partial<PensionInputs>) => void;
  resetAll: () => void;
}

const computeState = (inputs: PlannerInputs): Pick<PlannerStore, 'inputs' | 'result' | 'verdict'> => {
  const result = runCalculation(inputs);
  const verdict = result.isValid
    ? judgeVerdict(inputs.goal.targetMonthly, result.possibleMonthly)
    : null;
  return { inputs, result, verdict };
};

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  ...computeState(loadInputsFromStorage()),

  setGoal: (partial) => {
    const current = get().inputs;
    let newPension = current.pension;
    // 은퇴 나이가 바뀌면 퇴직/개인연금 개시 나이를 max(55, retirementAge)로 자동 갱신
    if (partial.retirementAge !== undefined && partial.retirementAge > 0) {
      const newStartAge = Math.max(55, partial.retirementAge);
      newPension = {
        ...newPension,
        retirementPension: { ...newPension.retirementPension, startAge: newStartAge },
        privatePension: { ...newPension.privatePension, startAge: newStartAge },
      };
    }
    const inputs: PlannerInputs = { ...current, goal: { ...current.goal, ...partial }, pension: newPension };
    saveInputsToStorage(inputs);
    set(computeState(inputs));
  },
  setStatus: (partial) => {
    const current = get().inputs;
    let newPension = current.pension;
    // 현재 나이가 바뀌면 국민연금 수령 시작 나이를 출생연도 기반으로 자동 설정
    if (partial.currentAge !== undefined && partial.currentAge > 0) {
      const birthYear = 2026 - partial.currentAge;
      const npsStartAge = getNPSStartAgeByBirthYear(birthYear);
      newPension = {
        ...newPension,
        publicPension: { ...newPension.publicPension, startAge: npsStartAge },
      };
    }
    const inputs: PlannerInputs = { ...current, status: { ...current.status, ...partial }, pension: newPension };
    saveInputsToStorage(inputs);
    set(computeState(inputs));
  },
  setAsset: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      assets: { ...get().inputs.assets, [key]: { ...get().inputs.assets[key], ...partial } },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs));
  },
  setDebt: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      debts: { ...get().inputs.debts, [key]: { ...get().inputs.debts[key], ...partial } },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs));
  },
  setChildren: (partial) => {
    const inputs: PlannerInputs = { ...get().inputs, children: { ...get().inputs.children, ...partial } };
    saveInputsToStorage(inputs);
    set(computeState(inputs));
  },
  setPension: (partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      pension: { ...get().inputs.pension, ...partial },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs));
  },
  resetAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set(computeState(defaultInputs));
  },
}));
