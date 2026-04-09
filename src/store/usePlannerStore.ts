import { create } from 'zustand';
import type { PlannerInputs, AssetAllocation, DebtAllocation, VehicleInfo } from '../types/inputs';
import type { PensionInputs } from '../types/pension';
import { computeVehicleComparison, type VehicleComparisonResult } from '../engine/vehicleSchedule';
import type { CalculationResult, HousingScenarioResult, HousingScenarioSet, Verdict } from '../types/calculation';
import type { CalculationResultV2, YearlyAggregateV2, PropertyOptionResult, RecommendationModeV2 } from '../types/calculationV2';
import type { HousingPolicy } from '../engine/housingPolicy';
import type { FundingPolicy, LiquidationPolicy } from '../engine/fundingPolicy';
import type { DebtSchedules } from '../engine/debtSchedule';
import { DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY } from '../engine/fundingPolicy';
import { DEFAULT_INFLATION_RATE, DEFAULT_INCOME_GROWTH_RATE, DEFAULT_EXPENSE_GROWTH_RATE, DEFAULT_ASSET_RETURNS } from '../utils/constants';
import { calcTotalAsset, calcTotalDebt, calcWeightedReturn, precomputeDebtSchedules, calcTotalAnnualRepaymentFromSchedules } from '../engine/assetWeighting';
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

export const defaultVehicle: VehicleInfo = {
  ownershipType: 'none',
  costIncludedInExpense: 'separate',
  loanBalance: 0,
  loanRate: 0,
  loanMonths: 0,
  purchaseYearsFromNow: 0,
  purchasePrice: 0,
  loanAmount: 0,
  leaseMonthlyPayment: 0,
  leaseMonths: 0,
  monthlyMaintenance: 0,
  disposalValue: 0,
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
    costGrowthMode: 'inflation',
    customGrowthRate: DEFAULT_INFLATION_RATE,
  },
  pension: defaultPension,
  vehicle: defaultVehicle,
};

// ── V2 집계를 V1 차트 호환 스냅샷으로 변환 ────────────────────────────
function toYearlySnapshot(agg: YearlyAggregateV2, retirementAge: number) {
  const financialAssetEnd = agg.cashLikeEnd + agg.financialInvestableEnd + agg.propertySaleProceedsBucketEnd;
  const housingAssetEnd = agg.propertyValueEnd;
  const grossAssetEnd = financialAssetEnd + housingAssetEnd;
  const totalDebtEnd = agg.months[agg.months.length - 1]?.totalDebtEnd ?? 0;
  const remainingDebtEnd = agg.securedLoanBalanceEnd + totalDebtEnd;
  const netAssetEnd = grossAssetEnd - remainingDebtEnd;
  return {
    age: agg.ageYear,
    isRetired: agg.ageYear >= retirementAge,
    financialAssetEnd,
    housingAssetEnd,
    grossAssetEnd,
    remainingDebtEnd,
    netAssetEnd,
    totalAsset: netAssetEnd,
    annualInvestmentReturn: 0,
    annualIncomeThisYear: agg.totalIncome,
    annualPensionIncomeThisYear: agg.totalPension,
    annualExpenseThisYear: agg.totalExpense,
    annualDebtRepaymentThisYear: agg.totalDebtService,
    annualChildExpenseThisYear: agg.totalChildExpense,
    annualNetCashflow: agg.totalIncome + agg.totalPension - agg.totalExpense - agg.totalDebtService - agg.totalChildExpense,
  };
}

// ── V2 PropertyOptionResult를 V1 HousingScenarioResult로 변환 ─────────
function toHousingScenario(opt: PropertyOptionResult, retirementAge: number): HousingScenarioResult {
  const policy: HousingPolicy =
    opt.strategy === 'keep' ? 'keep' :
    opt.strategy === 'secured_loan' ? 'annuity' : 'liquidate';
  return {
    policy,
    possibleMonthly: opt.sustainableMonthly,
    survivesToLifeExpectancy: opt.survivesToLifeExpectancy,
    cashDepletionAge: null,
    financialDepletionAge: null,
    netDepletionAge: opt.failureAge,
    housingAnnuityStartAge: opt.strategy === 'secured_loan' ? opt.interventionAge : null,
    housingAnnuityMonthlyNominal: 0,
    housingAnnuityMonthlyTodayValue: 0,
    housingLiquidationAge: opt.strategy === 'sell' ? opt.interventionAge : null,
    liquidationNetProceeds: 0,
    postSaleAnnualHousingCost: 0,
    targetYearlySnapshots: opt.yearlyAggregates.map(agg => toYearlySnapshot(agg, retirementAge)),
  };
}

// ── V2 결과로부터 V1 호환 CalculationResult 생성 ─────────────────────���
function buildCompatResult(
  inputs: PlannerInputs,
  resultV2: CalculationResultV2,
  debtSchedules: DebtSchedules,
): CalculationResult {
  const { goal, status, assets, children, pension } = inputs;

  const totalAsset = calcTotalAsset(assets);
  const totalDebt = calcTotalDebt(inputs.debts);
  const netWorth = totalAsset - totalDebt;
  const weightedReturn = calcWeightedReturn(assets);
  const liquidRatio = totalAsset > 0 ? (totalAsset - assets.realEstate.amount) / totalAsset : 1;

  const totalAnnualRepayment = calcTotalAnnualRepaymentFromSchedules(debtSchedules, 0);
  const annualChildExpense = children.hasChildren ? children.count * children.monthlyPerChild * 12 : 0;
  const childExpenseForSavings = children.hasChildren && status.currentAge <= children.independenceAge
    ? annualChildExpense : 0;
  const annualNetSavings = status.annualIncome - status.annualExpense - totalAnnualRepayment - childExpenseForSavings;

  const yearsToRetirement = goal.retirementAge - status.currentAge;
  const requiredMonthlyAtRetirement = goal.targetMonthly * Math.pow(1 + goal.inflationRate / 100, yearsToRetirement);

  const totalMonthlyPensionTodayValue = getTotalMonthlyPensionTodayValue(
    pension, status.currentAge, goal.retirementAge, status.annualIncome, goal.inflationRate,
  );
  const monthlyPensionAtRetirementStart = getPensionMonthlyAtRetirementStart(
    pension, status.currentAge, goal.retirementAge, status.annualIncome, goal.inflationRate,
  );
  const pensionCoverageRate = goal.targetMonthly > 0 ? totalMonthlyPensionTodayValue / goal.targetMonthly : 0;

  const firstYearMonthlyDebt = Math.round(
    (debtSchedules.mortgage[0]?.payment ?? 0) +
    (debtSchedules.creditLoan[0]?.payment ?? 0) +
    (debtSchedules.otherLoan[0]?.payment ?? 0),
  );

  const { summary, detailYearlyAggregates, propertyOptions } = resultV2;
  const possibleMonthly = summary.sustainableMonthly;
  const depletionAge = summary.failureAge;
  const financialStressAge = summary.financialExhaustionAge;

  const targetYearlySnapshots = detailYearlyAggregates.map(agg => toYearlySnapshot(agg, goal.retirementAge));
  const yearlySnapshots = targetYearlySnapshots;

  const keepOpt = propertyOptions.find(o => o.strategy === 'keep')!;
  const loanOpt = propertyOptions.find(o => o.strategy === 'secured_loan')!;
  const sellOpt = propertyOptions.find(o => o.strategy === 'sell')!;
  const recommended = propertyOptions.find(o => o.isRecommended)!;
  const recommendedV1: 'keep' | 'annuity' | 'liquidate' =
    recommended.strategy === 'keep' ? 'keep' :
    recommended.strategy === 'secured_loan' ? 'annuity' : 'liquidate';

  const housingScenarios: HousingScenarioSet = {
    keep: toHousingScenario(keepOpt, goal.retirementAge),
    annuity: toHousingScenario(loanOpt, goal.retirementAge),
    liquidate: toHousingScenario(sellOpt, goal.retirementAge),
    recommendedScenario: recommendedV1,
    recommendationReason: recommended.headline,
  };

  return {
    totalAsset, totalDebt, netWorth, weightedReturn,
    annualNetSavings, annualChildExpense, requiredMonthlyAtRetirement,
    liquidRatio, totalMonthlyPensionTodayValue, monthlyPensionAtRetirementStart,
    pensionCoverageRate, possibleMonthly, yearlySnapshots, targetYearlySnapshots,
    depletionAge, financialStressAge, firstYearMonthlyDebt,
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
  const rest = { ...(raw as Record<string, unknown>) };
  delete rest.gracePeriodYears;
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
      vehicle:  { ...defaultVehicle, ...(parsed.vehicle ?? {}) },
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
  recommendationMode: RecommendationModeV2;
  vehicleComparison: VehicleComparisonResult | null;
  setGoal: (partial: Partial<PlannerInputs['goal']>) => void;
  setStatus: (partial: Partial<PlannerInputs['status']>) => void;
  setAsset: (key: keyof AssetAllocation, partial: Partial<AssetAllocation[keyof AssetAllocation]>) => void;
  setDebt: (key: keyof DebtAllocation, partial: Partial<DebtAllocation[keyof DebtAllocation]>) => void;
  setChildren: (partial: Partial<PlannerInputs['children']>) => void;
  setPension: (partial: Partial<PensionInputs>) => void;
  setVehicle: (partial: Partial<VehicleInfo>) => void;
  setFundingPolicy: (partial: Partial<FundingPolicy>) => void;
  setRecommendationMode: (mode: RecommendationModeV2) => void;
  toggleHousing: () => void;
  resetAll: () => void;
}

const computeState = (
  inputs: PlannerInputs,
  fundingPolicy: FundingPolicy = DEFAULT_FUNDING_POLICY,
  liquidationPolicy: LiquidationPolicy = DEFAULT_LIQUIDATION_POLICY,
  recommendationMode: RecommendationModeV2 = 'max_sustainable',
): Pick<PlannerStore, 'inputs' | 'result' | 'verdict' | 'resultV2' | 'vehicleComparison'> => {
  const { goal, status } = inputs;
  const debtSchedules = precomputeDebtSchedules(inputs.debts);
  const totalAsset = calcTotalAsset(inputs.assets);
  const totalDebt = calcTotalDebt(inputs.debts);
  const netWorth = totalAsset - totalDebt;
  const liquidRatio = totalAsset > 0 ? (totalAsset - inputs.assets.realEstate.amount) / totalAsset : 1;

  const emptyResult = (errorMessage: string | null = null): CalculationResult => ({
    totalAsset, totalDebt, netWorth,
    weightedReturn: 0, annualNetSavings: 0, annualChildExpense: 0,
    requiredMonthlyAtRetirement: 0, liquidRatio,
    totalMonthlyPensionTodayValue: 0, monthlyPensionAtRetirementStart: 0,
    pensionCoverageRate: 0, possibleMonthly: 0,
    yearlySnapshots: [], targetYearlySnapshots: [],
    depletionAge: null, financialStressAge: null,
    firstYearMonthlyDebt: 0, housingScenarios: null,
    isValid: false, errorMessage,
  });

  const requiredMissing = status.currentAge <= 0 || goal.retirementAge <= 0 || goal.lifeExpectancy <= 0 || goal.targetMonthly <= 0;
  if (requiredMissing) return { inputs, result: emptyResult(null), verdict: null, resultV2: null, vehicleComparison: null };

  if (goal.retirementAge <= status.currentAge || goal.lifeExpectancy <= goal.retirementAge) {
    return { inputs, result: emptyResult('은퇴 나이는 현재 나이보다, 기대수명은 은퇴 나이보다 커야 해요.'), verdict: null, resultV2: null, vehicleComparison: null };
  }

  const resultV2 = runCalculationV2(inputs, fundingPolicy, liquidationPolicy, debtSchedules, recommendationMode);
  if (!resultV2) return { inputs, result: emptyResult(null), verdict: null, resultV2: null, vehicleComparison: null };

  const result = buildCompatResult(inputs, resultV2, debtSchedules);
  const verdict = judgeVerdict(goal.targetMonthly, result.possibleMonthly);

  const vehicle = inputs.vehicle ?? defaultVehicle;
  const vehicleComparison = vehicle.ownershipType !== 'none'
    ? computeVehicleComparison(
        vehicle,
        result.possibleMonthly,
        status.currentAge,
        goal.retirementAge,
        goal.lifeExpectancy,
      )
    : null;

  return { inputs, result, verdict, resultV2, vehicleComparison };
};

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  ...computeState(loadInputsFromStorage()),
  advancedHousingEnabled: false,
  fundingPolicy: DEFAULT_FUNDING_POLICY,
  liquidationPolicy: DEFAULT_LIQUIDATION_POLICY,
  recommendationMode: 'max_sustainable',

  setGoal: (partial) => {
    const current = get().inputs;
    const inputs: PlannerInputs = { ...current, goal: { ...current.goal, ...partial } };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().fundingPolicy, get().liquidationPolicy, get().recommendationMode));
  },
  setStatus: (partial) => {
    const current = get().inputs;
    let newPension = current.pension;
    if (partial.currentAge !== undefined && partial.currentAge > 0) {
      const birthYear = new Date().getFullYear() - partial.currentAge;
      const npsStartAge = getNPSStartAgeByBirthYear(birthYear);
      newPension = {
        ...newPension,
        publicPension: { ...newPension.publicPension, startAge: npsStartAge },
      };
    }
    const inputs: PlannerInputs = { ...current, status: { ...current.status, ...partial }, pension: newPension };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().fundingPolicy, get().liquidationPolicy, get().recommendationMode));
  },
  setAsset: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      assets: { ...get().inputs.assets, [key]: { ...get().inputs.assets[key], ...partial } },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().fundingPolicy, get().liquidationPolicy, get().recommendationMode));
  },
  setDebt: (key, partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      debts: { ...get().inputs.debts, [key]: { ...get().inputs.debts[key], ...partial } },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().fundingPolicy, get().liquidationPolicy, get().recommendationMode));
  },
  setChildren: (partial) => {
    const inputs: PlannerInputs = { ...get().inputs, children: { ...get().inputs.children, ...partial } };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().fundingPolicy, get().liquidationPolicy, get().recommendationMode));
  },
  setPension: (partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      pension: { ...get().inputs.pension, ...partial },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().fundingPolicy, get().liquidationPolicy, get().recommendationMode));
  },
  setVehicle: (partial) => {
    const inputs: PlannerInputs = {
      ...get().inputs,
      vehicle: { ...(get().inputs.vehicle ?? defaultVehicle), ...partial },
    };
    saveInputsToStorage(inputs);
    set(computeState(inputs, get().fundingPolicy, get().liquidationPolicy, get().recommendationMode));
  },
  setFundingPolicy: (partial) => {
    const newPolicy: FundingPolicy = { ...get().fundingPolicy, ...partial };
    set({
      fundingPolicy: newPolicy,
      ...computeState(get().inputs, newPolicy, get().liquidationPolicy, get().recommendationMode),
    });
  },
  setRecommendationMode: (mode) => {
    set({
      recommendationMode: mode,
      ...computeState(get().inputs, get().fundingPolicy, get().liquidationPolicy, mode),
    });
  },
  toggleHousing: () => {
    set({ advancedHousingEnabled: !get().advancedHousingEnabled });
  },
  resetAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      advancedHousingEnabled: false,
      fundingPolicy: DEFAULT_FUNDING_POLICY,
      liquidationPolicy: DEFAULT_LIQUIDATION_POLICY,
      recommendationMode: 'max_sustainable',
      ...computeState(defaultInputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, 'max_sustainable'),
    });
  },
}));
