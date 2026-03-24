import { create } from 'zustand';
import type { PlannerInputs, AssetAllocation, DebtAllocation } from '../types/inputs';
import type { PensionInputs } from '../types/pension';
import type { CalculationResult, HousingScenarioResult, HousingScenarioSet, Verdict } from '../types/calculation';
import { DEFAULT_INFLATION_RATE, DEFAULT_INCOME_GROWTH_RATE, DEFAULT_EXPENSE_GROWTH_RATE, DEFAULT_ASSET_RETURNS } from '../utils/constants';
import { calcTotalAsset, calcTotalDebt, calcWeightedReturn, calcTotalAnnualRepayment, precomputeDebtSchedules } from '../engine/assetWeighting';
import { simulate, findDepletionAge, findFinancialStressAge, findHousingAnnuityStartAge, findHousingLiquidationAge } from '../engine/calculator';
import { findMaxSustainableMonthly } from '../engine/binarySearch';
import { judgeVerdict } from '../engine/verdictEngine';
import { getTotalMonthlyPensionTodayValue, getPensionMonthlyAtRetirementStart, getNPSStartAgeByBirthYear } from '../engine/pensionEstimation';
import { POST_SALE_HOUSING_COST_YIELD } from '../engine/housingPolicy';

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

/** 시나리오 1개 분량의 결과를 계산 */
function runScenario(
  inputs: PlannerInputs,
  policy: 'keep' | 'annuity' | 'liquidate',
  debtSchedules: ReturnType<typeof precomputeDebtSchedules>,
): HousingScenarioResult {
  const { goal, status } = inputs;
  const inflationDecimal = goal.inflationRate / 100;

  const possibleMonthly = findMaxSustainableMonthly(inputs, policy);
  const targetSnapshots = simulate(inputs, goal.targetMonthly, policy, debtSchedules);

  // 소진 나이
  const cashDepletionAge = findFinancialStressAge(targetSnapshots); // 금융자산 고갈
  const netDepletionAge = findDepletionAge(targetSnapshots);        // 순자산 고갈

  // 주택연금 정보 (B 시나리오)
  const annuityStartAge = findHousingAnnuityStartAge(targetSnapshots);
  let housingAnnuityMonthlyNominal = 0;
  let housingAnnuityMonthlyTodayValue = 0;
  if (annuityStartAge !== null) {
    const snap = targetSnapshots.find(s => s.age === annuityStartAge);
    if (snap && snap.housingAnnuityIncomeThisYear) {
      housingAnnuityMonthlyNominal = snap.housingAnnuityIncomeThisYear / 12;
      housingAnnuityMonthlyTodayValue =
        housingAnnuityMonthlyNominal / Math.pow(1 + inflationDecimal, annuityStartAge - status.currentAge);
    }
  }

  // 집 매각 정보 (C 시나리오)
  const liquidationAge = findHousingLiquidationAge(targetSnapshots);
  let liquidationNetProceeds = 0;
  let postSaleAnnualHousingCost = 0;
  if (liquidationAge !== null) {
    const snap = targetSnapshots.find(s => s.age === liquidationAge);
    if (snap && snap.postSaleHousingCostThisYear !== undefined) {
      postSaleAnnualHousingCost = snap.postSaleHousingCostThisYear;
      // 순수익 역산: cost = proceeds × 3%
      liquidationNetProceeds = POST_SALE_HOUSING_COST_YIELD > 0
        ? postSaleAnnualHousingCost / POST_SALE_HOUSING_COST_YIELD
        : 0;
    }
  }

  const survivesToLifeExpectancy =
    targetSnapshots.length > 0 &&
    targetSnapshots[targetSnapshots.length - 1].financialAssetEnd >= 0;

  return {
    policy,
    possibleMonthly,
    survivesToLifeExpectancy,
    cashDepletionAge,
    financialDepletionAge: cashDepletionAge,
    netDepletionAge,
    housingAnnuityStartAge: annuityStartAge,
    housingAnnuityMonthlyNominal,
    housingAnnuityMonthlyTodayValue,
    housingLiquidationAge: liquidationAge,
    liquidationNetProceeds,
    postSaleAnnualHousingCost,
    targetYearlySnapshots: targetSnapshots,
  };
}

/** 추천 시나리오 선택 */
function pickRecommendedScenario(
  targetMonthly: number,
  keep: HousingScenarioResult,
  annuity: HousingScenarioResult,
  liquidate: HousingScenarioResult,
): { recommended: 'keep' | 'annuity' | 'liquidate'; reason: string } {
  if (keep.possibleMonthly >= targetMonthly) {
    return { recommended: 'keep', reason: '금융자산만으로 목표 생활비를 충당할 수 있어요.' };
  }
  if (annuity.possibleMonthly >= targetMonthly) {
    return { recommended: 'annuity', reason: '주택연금을 활용하면 목표 생활비를 충당할 수 있어요.' };
  }
  if (liquidate.possibleMonthly >= targetMonthly) {
    return { recommended: 'liquidate', reason: '집을 매각해 임대로 전환하면 목표 생활비를 충당할 수 있어요.' };
  }
  // 셋 다 불가 → 그나마 possibleMonthly가 가장 큰 시나리오 추천
  const best = [keep, annuity, liquidate].reduce((a, b) =>
    b.possibleMonthly > a.possibleMonthly ? b : a
  );
  return {
    recommended: best.policy as 'keep' | 'annuity' | 'liquidate',
    reason: '어떤 방법으로도 목표를 맞추기 어려워요. 목표를 조정하거나 저축을 늘려보세요.',
  };
}

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
      depletionAge: null, financialStressAge: null,
      targetYearlySnapshots: [],
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

  // 부채 스케줄 선계산 — 3 시나리오 모두 재사용
  const debtSchedules = precomputeDebtSchedules(debts);

  // ── 3 시나리오 계산 ──────────────────────────────────────────────────
  const hasHousing = assets.realEstate.amount > 0;

  const keepResult   = runScenario(inputs, 'keep',      debtSchedules);
  const annuityResult   = hasHousing ? runScenario(inputs, 'annuity',   debtSchedules) : keepResult;
  const liquidateResult = hasHousing ? runScenario(inputs, 'liquidate', debtSchedules) : keepResult;

  const { recommended, reason } = pickRecommendedScenario(
    goal.targetMonthly,
    keepResult,
    annuityResult,
    liquidateResult,
  );

  const housingScenarios: HousingScenarioSet | null = hasHousing
    ? {
        keep: keepResult,
        annuity: annuityResult,
        liquidate: liquidateResult,
        recommendedScenario: recommended,
        recommendationReason: reason,
      }
    : null;

  // 추천 시나리오 기준으로 대표값 결정
  const recommendedResult = hasHousing
    ? { keep: keepResult, annuity: annuityResult, liquidate: liquidateResult }[recommended]
    : keepResult;

  const possibleMonthly = recommendedResult.possibleMonthly;
  const targetYearlySnapshots = recommendedResult.targetYearlySnapshots;
  const depletionAge = findDepletionAge(targetYearlySnapshots);
  const financialStressAge = findFinancialStressAge(targetYearlySnapshots);

  // possibleMonthly 기준 스냅샷 (내부용)
  const yearlySnapshots = simulate(inputs, possibleMonthly, recommended, debtSchedules);

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
