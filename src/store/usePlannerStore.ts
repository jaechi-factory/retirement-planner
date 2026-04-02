import { create } from 'zustand';
import type { PlannerInputs, AssetAllocation, DebtAllocation } from '../types/inputs';
import type { PensionInputs } from '../types/pension';
import type { CalculationResult, HousingScenarioResult, HousingScenarioSet, Verdict } from '../types/calculation';
import type { CalculationResultV2 } from '../types/calculationV2';
import type { HousingPolicy } from '../engine/housingPolicy';
import type { FundingPolicy, LiquidationPolicy } from '../engine/fundingPolicy';
import { DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY } from '../engine/fundingPolicy';
import { DEFAULT_INFLATION_RATE, DEFAULT_INCOME_GROWTH_RATE, DEFAULT_EXPENSE_GROWTH_RATE, DEFAULT_ASSET_RETURNS } from '../utils/constants';
import { calcTotalAsset, calcTotalDebt, calcWeightedReturn, precomputeDebtSchedules, calcTotalAnnualRepaymentFromSchedules } from '../engine/assetWeighting';
import { simulate, findDepletionAge, findFinancialStressAge } from '../engine/calculator';
import { findMaxSustainableMonthly } from '../engine/binarySearch';
import { judgeVerdict } from '../engine/verdictEngine';
import { getTotalMonthlyPensionTodayValue, getPensionMonthlyAtRetirementStart, getNPSStartAgeByBirthYear } from '../engine/pensionEstimation';
import { runCalculationV2 } from '../engine/calculatorV2';

const defaultPension: PensionInputs = {
  publicPension: {
    enabled: true,
    mode: 'auto',
    startAge: 65,
    manualMonthlyTodayValue: 0,
    workStartAge: 26,
  },
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

// ── 주택 활용 시나리오 헬퍼 ────────────────────────────────────────────
function runScenario(inputs: PlannerInputs, policy: HousingPolicy): HousingScenarioResult {
  const { goal } = inputs;
  const possibleMonthly = findMaxSustainableMonthly(inputs, policy);
  const debtSchedules = precomputeDebtSchedules(inputs.debts);
  const targetYearlySnapshots = simulate(inputs, goal.targetMonthly, policy, debtSchedules);
  const netDepletionAge = findDepletionAge(targetYearlySnapshots);
  const financialDepletionAge = findFinancialStressAge(targetYearlySnapshots);

  return {
    policy,
    possibleMonthly,
    survivesToLifeExpectancy: netDepletionAge === null,
    cashDepletionAge: null,
    financialDepletionAge,
    netDepletionAge,
    housingAnnuityStartAge: null,
    housingAnnuityMonthlyNominal: 0,
    housingAnnuityMonthlyTodayValue: 0,
    housingLiquidationAge: null,
    liquidationNetProceeds: 0,
    postSaleAnnualHousingCost: 0,
    targetYearlySnapshots,
  };
}

function pickRecommendedScenario(
  keep: HousingScenarioResult,
  annuity: HousingScenarioResult,
  liquidate: HousingScenarioResult,
): { recommendedScenario: 'keep' | 'annuity' | 'liquidate'; recommendationReason: string } {
  if (keep.possibleMonthly >= annuity.possibleMonthly && keep.possibleMonthly >= liquidate.possibleMonthly) {
    return { recommendedScenario: 'keep', recommendationReason: '집을 유지해도 은퇴 자금이 충분해요.' };
  }
  if (annuity.possibleMonthly >= liquidate.possibleMonthly) {
    return { recommendedScenario: 'annuity', recommendationReason: '주택연금이 생활비를 효과적으로 보완해요.' };
  }
  return { recommendedScenario: 'liquidate', recommendationReason: '집을 매각하면 더 많은 생활비가 가능해요.' };
}

function runCalculation(inputs: PlannerInputs, advancedHousingEnabled = false): CalculationResult {
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
      depletionAge: null, financialStressAge: null,
      targetYearlySnapshots: [],
      firstYearMonthlyDebt: 0,
      housingScenarios: null,
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
      depletionAge: null, financialStressAge: null,
      targetYearlySnapshots: [],
      firstYearMonthlyDebt: 0,
      housingScenarios: null,
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
  // 단일 source: 부채 스케줄을 한 번만 계산해서 이후 모든 곳에서 공유
  const debtSchedules = precomputeDebtSchedules(debts);
  const totalAnnualRepayment = calcTotalAnnualRepaymentFromSchedules(debtSchedules, 0);
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

  const totalMonthlyPensionTodayValue = getTotalMonthlyPensionTodayValue(
    pension,
    status.currentAge,
    goal.retirementAge,
    status.annualIncome,
    goal.inflationRate,
  );
  const monthlyPensionAtRetirementStart = getPensionMonthlyAtRetirementStart(
    pension,
    status.currentAge,
    goal.retirementAge,
    status.annualIncome,
    goal.inflationRate,
  );
  const pensionCoverageRate = goal.targetMonthly > 0
    ? totalMonthlyPensionTodayValue / goal.targetMonthly
    : 0;

  // ── 메인 계산: 금융자산 기준 (keep 정책) ─────────────────────────────
  const possibleMonthly = findMaxSustainableMonthly(inputs, 'keep');
  const targetYearlySnapshots = simulate(inputs, goal.targetMonthly, 'keep', debtSchedules);
  const yearlySnapshots = simulate(inputs, possibleMonthly, 'keep', debtSchedules);

  const depletionAge = findDepletionAge(targetYearlySnapshots);
  const financialStressAge = findFinancialStressAge(targetYearlySnapshots);

  // 첫 해 월 부채 상환액 (debt schedule 첫 달 기준) — UI 표시용
  const firstYearMonthlyDebt = Math.round(
    (debtSchedules.mortgage[0]?.payment ?? 0) +
    (debtSchedules.creditLoan[0]?.payment ?? 0) +
    (debtSchedules.otherLoan[0]?.payment ?? 0),
  );

  // ── 집 활용 전략 시나리오 (옵션) ─────────────────────────────────────
  let housingScenarios: HousingScenarioSet | null = null;
  if (advancedHousingEnabled && assets.realEstate.amount > 0) {
    const keepResult = runScenario(inputs, 'keep');
    const annuityResult = runScenario(inputs, 'annuity');
    const liquidateResult = runScenario(inputs, 'liquidate');
    const { recommendedScenario, recommendationReason } = pickRecommendedScenario(keepResult, annuityResult, liquidateResult);
    housingScenarios = {
      keep: keepResult,
      annuity: annuityResult,
      liquidate: liquidateResult,
      recommendedScenario,
      recommendationReason,
    };
  }

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
    financialStressAge,
    targetYearlySnapshots,
    firstYearMonthlyDebt,
    housingScenarios,
    isValid: true,
  };
}

const STORAGE_KEY = 'retirement-planner-inputs-v1';

/**
 * localStorage 저장 데이터 마이그레이션
 *
 * 변경 사항:
 * - repaymentType 'interest_only' → mortgage: 'equal_payment', 기타: 'balloon_payment'
 */
function migrateDebtItem(
  raw: Record<string, unknown>,
  isMortgage: boolean,
): Record<string, unknown> {
  let repaymentType = raw.repaymentType as string;
  if (repaymentType === 'interest_only') {
    repaymentType = isMortgage ? 'equal_payment' : 'balloon_payment';
  }
  const { gracePeriodYears: _removed, ...rest } = raw as Record<string, unknown> & { gracePeriodYears?: unknown };
  return { ...rest, repaymentType };
}

function loadInputsFromStorage(): PlannerInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultInputs;
    const parsed = JSON.parse(raw) as PlannerInputs;

    // 부채 마이그레이션 적용
    const rawDebts = (parsed.debts ?? {}) as unknown as Record<string, Record<string, unknown>>;
    const migratedDebts = {
      mortgage:   { ...defaultInputs.debts.mortgage,   ...migrateDebtItem(rawDebts.mortgage   ?? {}, true) },
      creditLoan: { ...defaultInputs.debts.creditLoan, ...migrateDebtItem(rawDebts.creditLoan ?? {}, false) },
      otherLoan:  { ...defaultInputs.debts.otherLoan,  ...migrateDebtItem(rawDebts.otherLoan  ?? {}, false) },
    };

    return {
      goal:     { ...defaultInputs.goal,     ...parsed.goal },
      status:   { ...defaultInputs.status,   ...parsed.status },
      assets:   { ...defaultInputs.assets,   ...parsed.assets },
      debts:    migratedDebts,
      children: { ...defaultInputs.children, ...parsed.children },
      pension: parsed.pension
        ? {
            publicPension:     { ...defaultInputs.pension.publicPension,     ...parsed.pension.publicPension },
            retirementPension: { ...defaultInputs.pension.retirementPension, ...parsed.pension.retirementPension },
            privatePension:    { ...defaultInputs.pension.privatePension,    ...parsed.pension.privatePension },
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
  advancedHousingEnabled: boolean;
  // V2 병행 탑재
  resultV2: CalculationResultV2 | null;
  fundingPolicy: FundingPolicy;
  liquidationPolicy: LiquidationPolicy;
  setGoal: (partial: Partial<PlannerInputs['goal']>) => void;
  setStatus: (partial: Partial<PlannerInputs['status']>) => void;
  setAsset: (key: keyof AssetAllocation, partial: Partial<AssetAllocation[keyof AssetAllocation]>) => void;
  setDebt: (key: keyof DebtAllocation, partial: Partial<DebtAllocation[keyof DebtAllocation]>) => void;
  setChildren: (partial: Partial<PlannerInputs['children']>) => void;
  setPension: (partial: Partial<PensionInputs>) => void;
  setFundingPolicy: (partial: Partial<FundingPolicy>) => void;
  toggleHousing: () => void;
  resetAll: () => void;
}

const computeState = (
  inputs: PlannerInputs,
  advancedHousingEnabled = false,
  fundingPolicy: FundingPolicy = DEFAULT_FUNDING_POLICY,
  liquidationPolicy: LiquidationPolicy = DEFAULT_LIQUIDATION_POLICY,
): Pick<PlannerStore, 'inputs' | 'result' | 'verdict' | 'resultV2'> => {
  // V2 single source: store 레벨에서 한 번 계산, V2에 주입
  const debtSchedules = precomputeDebtSchedules(inputs.debts);
  const result = runCalculation(inputs, advancedHousingEnabled);
  const verdict = result.isValid
    ? judgeVerdict(inputs.goal.targetMonthly, result.possibleMonthly)
    : null;
  const resultV2 = runCalculationV2(inputs, fundingPolicy, liquidationPolicy, debtSchedules);
  return { inputs, result, verdict, resultV2 };
};

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  ...computeState(loadInputsFromStorage()),
  advancedHousingEnabled: false,
  fundingPolicy: DEFAULT_FUNDING_POLICY,
  liquidationPolicy: DEFAULT_LIQUIDATION_POLICY,

  setGoal: (partial) => {
    const current = get().inputs;
    // P0 fix: 은퇴 나이 변경이 연금 시작 나이를 자동 동기화하지 않음 (4개 나이 완전 독립)
    const inputs: PlannerInputs = { ...current, goal: { ...current.goal, ...partial } };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().advancedHousingEnabled, get().fundingPolicy, get().liquidationPolicy));
  },
  setStatus: (partial) => {
    const current = get().inputs;
    let newPension = current.pension;
    if (partial.currentAge !== undefined && partial.currentAge > 0) {
      // P0 fix: 하드코딩 2026 제거, 런타임 연도 사용
      const birthYear = new Date().getFullYear() - partial.currentAge;
      const npsStartAge = getNPSStartAgeByBirthYear(birthYear);
      newPension = {
        ...newPension,
        publicPension: { ...newPension.publicPension, startAge: npsStartAge },
      };
    }
    const inputs: PlannerInputs = { ...current, status: { ...current.status, ...partial }, pension: newPension };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().advancedHousingEnabled, get().fundingPolicy, get().liquidationPolicy));
  },
  setAsset: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      assets: { ...get().inputs.assets, [key]: { ...get().inputs.assets[key], ...partial } },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().advancedHousingEnabled, get().fundingPolicy, get().liquidationPolicy));
  },
  setDebt: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      debts: { ...get().inputs.debts, [key]: { ...get().inputs.debts[key], ...partial } },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().advancedHousingEnabled, get().fundingPolicy, get().liquidationPolicy));
  },
  setChildren: (partial) => {
    const inputs: PlannerInputs = { ...get().inputs, children: { ...get().inputs.children, ...partial } };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().advancedHousingEnabled, get().fundingPolicy, get().liquidationPolicy));
  },
  setPension: (partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      pension: { ...get().inputs.pension, ...partial },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().advancedHousingEnabled, get().fundingPolicy, get().liquidationPolicy));
  },
  setFundingPolicy: (partial) => {
    const newPolicy: FundingPolicy = { ...get().fundingPolicy, ...partial };
    set({
      fundingPolicy: newPolicy,
      ...computeState(get().inputs, get().advancedHousingEnabled, newPolicy, get().liquidationPolicy),
    });
  },
  toggleHousing: () => {
    const newEnabled = !get().advancedHousingEnabled;
    set({ advancedHousingEnabled: newEnabled, ...computeState(get().inputs, newEnabled, get().fundingPolicy, get().liquidationPolicy) });
  },
  resetAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      advancedHousingEnabled: false,
      fundingPolicy: DEFAULT_FUNDING_POLICY,
      liquidationPolicy: DEFAULT_LIQUIDATION_POLICY,
      ...computeState(defaultInputs, false, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY),
    });
  },
}));
