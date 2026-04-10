import { describe, expect, it } from 'vitest';
import type { PlannerInputs } from '../types/inputs';
import type { PensionInputs } from '../types/pension';
import type { CalculationResultV2 } from '../types/calculationV2';
import { runCalculationV2 } from './calculatorV2';
import { precomputeDebtSchedules } from './assetWeighting';
import { DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY } from './fundingPolicy';

type ProfileName =
  | 'cash_heavy'
  | 'balanced'
  | 'growth'
  | 'ultra_growth'
  | 'deposit_only'
  | 'us_stock_only';

const PROFILE_WEIGHTS: Record<
  ProfileName,
  { cash: number; deposit: number; stock_kr: number; stock_us: number; bond: number; crypto: number }
> = {
  cash_heavy: { cash: 0.45, deposit: 0.30, stock_kr: 0.08, stock_us: 0.05, bond: 0.10, crypto: 0.02 },
  balanced: { cash: 0.10, deposit: 0.15, stock_kr: 0.20, stock_us: 0.30, bond: 0.20, crypto: 0.05 },
  growth: { cash: 0.05, deposit: 0.05, stock_kr: 0.30, stock_us: 0.45, bond: 0.10, crypto: 0.05 },
  ultra_growth: { cash: 0.02, deposit: 0.03, stock_kr: 0.20, stock_us: 0.45, bond: 0.00, crypto: 0.30 },
  deposit_only: { cash: 0.00, deposit: 1.00, stock_kr: 0.00, stock_us: 0.00, bond: 0.00, crypto: 0.00 },
  us_stock_only: { cash: 0.00, deposit: 0.00, stock_kr: 0.00, stock_us: 1.00, bond: 0.00, crypto: 0.00 },
};

const INCOMES = [2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
const FINANCIAL_TOTALS = [5000, 15000, 50000, 100000];
const REAL_ESTATES = [0, 30000, 80000];
const PROFILES: ProfileName[] = [
  'cash_heavy',
  'balanced',
  'growth',
  'ultra_growth',
  'deposit_only',
  'us_stock_only',
];
const SWEEP_TEST_TIMEOUT_MS = 360000;

function makeBaseInput(
  annualIncome: number,
  financialTotal: number,
  realEstate: number,
  profile: ProfileName,
): PlannerInputs {
  const w = PROFILE_WEIGHTS[profile];
  return {
    goal: { retirementAge: 60, lifeExpectancy: 90, targetMonthly: 300, inflationRate: 2.5 },
    status: {
      currentAge: 40,
      annualIncome,
      incomeGrowthRate: 2.0,
      annualExpense: 4800,
      expenseGrowthRate: 2.0,
    },
    assets: {
      cash: { amount: financialTotal * w.cash, expectedReturn: 2.0 },
      deposit: { amount: financialTotal * w.deposit, expectedReturn: 3.5 },
      stock_kr: { amount: financialTotal * w.stock_kr, expectedReturn: 7.0 },
      stock_us: { amount: financialTotal * w.stock_us, expectedReturn: 8.0 },
      bond: { amount: financialTotal * w.bond, expectedReturn: 4.0 },
      crypto: { amount: financialTotal * w.crypto, expectedReturn: 15.0 },
      realEstate: { amount: realEstate, expectedReturn: 3.0 },
    },
    debts: {
      mortgage: { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      otherLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
    children: {
      hasChildren: false,
      count: 0,
      monthlyPerChild: 0,
      independenceAge: 0,
      costGrowthMode: 'inflation',
      customGrowthRate: 2.5,
    },
    pension: {
      publicPension: { enabled: true, mode: 'auto', startAge: 65, manualMonthlyTodayValue: 0, workStartAge: 26 },
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
    },
  };
}

function runScenario(
  inputs: PlannerInputs,
  mode: 'keep_priority' | 'max_sustainable',
): CalculationResultV2 {
  const debtSchedules = precomputeDebtSchedules(inputs.debts);
  const result = runCalculationV2(
    inputs,
    DEFAULT_FUNDING_POLICY,
    DEFAULT_LIQUIDATION_POLICY,
    debtSchedules,
    mode,
  );
  if (!result) throw new Error('runCalculationV2 returned null');
  return result;
}

function assertAgeInRange(value: number | null, inputs: PlannerInputs) {
  if (value === null) return;
  expect(value).toBeGreaterThanOrEqual(inputs.status.currentAge);
  expect(value).toBeLessThanOrEqual(inputs.goal.lifeExpectancy);
}

function assertCoreInvariants(
  result: CalculationResultV2,
  inputs: PlannerInputs,
  mode: 'keep_priority' | 'max_sustainable',
) {
  expect(result.propertyOptions).toHaveLength(3);
  expect(result.summary.recommendationMode).toBe(mode);

  const recommendedOptions = result.propertyOptions.filter((o) => o.isRecommended);
  expect(recommendedOptions).toHaveLength(1);
  const recommended = recommendedOptions[0];
  expect(recommended.strategy).toBe(result.summary.recommendedStrategy);
  expect(recommended.sustainableMonthly).toBe(result.summary.sustainableMonthly);

  const maxFromOptions = Math.max(...result.propertyOptions.map((o) => o.sustainableMonthly));
  expect(result.summary.maxSustainableMonthly).toBe(maxFromOptions);

  const maxOption = result.propertyOptions.find((o) => o.strategy === result.summary.maxSustainableStrategy);
  expect(maxOption).toBeDefined();
  expect(maxOption!.sustainableMonthly).toBe(result.summary.maxSustainableMonthly);

  expect(result.summary.targetGap).toBe(result.summary.sustainableMonthly - inputs.goal.targetMonthly);
  expect(result.summary.maxTargetGap).toBe(result.summary.maxSustainableMonthly - inputs.goal.targetMonthly);

  expect(Number.isFinite(result.summary.sustainableMonthly)).toBe(true);
  expect(Number.isFinite(result.summary.maxSustainableMonthly)).toBe(true);
  for (const option of result.propertyOptions) {
    expect(Number.isFinite(option.sustainableMonthly)).toBe(true);
    expect(option.sustainableMonthly).toBeGreaterThanOrEqual(0);
  }

  assertAgeInRange(result.summary.financialSellStartAge, inputs);
  assertAgeInRange(result.summary.financialExhaustionAge, inputs);
  assertAgeInRange(result.summary.propertyInterventionAge, inputs);
  assertAgeInRange(result.summary.failureAge, inputs);

  if (inputs.assets.realEstate.amount === 0) {
    const keep = result.propertyOptions.find((o) => o.strategy === 'keep')!;
    const loan = result.propertyOptions.find((o) => o.strategy === 'secured_loan')!;
    const sell = result.propertyOptions.find((o) => o.strategy === 'sell')!;
    expect(keep.sustainableMonthly).toBe(loan.sustainableMonthly);
    expect(keep.sustainableMonthly).toBe(sell.sustainableMonthly);
  }

  if (mode === 'max_sustainable') {
    expect(result.summary.recommendedStrategy).toBe(result.summary.maxSustainableStrategy);
    expect(result.summary.sustainableMonthly).toBe(result.summary.maxSustainableMonthly);
  } else {
    const keep = result.propertyOptions.find((o) => o.strategy === 'keep')!;
    if (keep.survivesToLifeExpectancy) {
      expect(result.summary.recommendedStrategy).toBe('keep');
    } else {
      const surviving = result.propertyOptions.filter((o) => o.survivesToLifeExpectancy);
      if (surviving.length > 0) {
        const bestSurviving = Math.max(...surviving.map((o) => o.sustainableMonthly));
        expect(recommended.sustainableMonthly).toBe(bestSurviving);
      } else {
        const sorted = [...result.propertyOptions].sort((a, b) => {
          const aFail = a.failureAge ?? Infinity;
          const bFail = b.failureAge ?? Infinity;
          if (aFail !== bFail) return bFail - aFail;
          if (a.sustainableMonthly !== b.sustainableMonthly) return b.sustainableMonthly - a.sustainableMonthly;
          return b.finalNetWorth - a.finalNetWorth;
        });
        expect(recommended.strategy).toBe(sorted[0].strategy);
      }
    }
  }
}

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randChoice<T>(rand: () => number, arr: T[]): T {
  return arr[randInt(rand, 0, arr.length - 1)];
}

function makeRandomInput(rand: () => number): PlannerInputs {
  const currentAge = randInt(rand, 30, 55);
  const retirementAge = currentAge + randInt(rand, 5, 25);
  const lifeExpectancy = retirementAge + randInt(rand, 10, 35);
  const targetMonthly = randInt(rand, 150, 1200);
  const annualIncome = randInt(rand, 0, 30000);
  const annualExpense = randInt(rand, 1800, 15000);

  const financialTotal = randInt(rand, 0, 150000);
  const reAmount = rand() < 0.45 ? 0 : randInt(rand, 10000, 250000);
  const profile = randChoice(rand, PROFILES);
  const w = PROFILE_WEIGHTS[profile];

  const hasMortgage = rand() < 0.35;
  const hasCredit = rand() < 0.35;
  const hasOther = rand() < 0.25;
  const hasChildren = rand() < 0.4;
  const childrenCount = hasChildren ? randInt(rand, 1, 3) : 0;
  const childMonthly = hasChildren ? randInt(rand, 30, 250) : 0;

  const pensionPreset = randInt(rand, 0, 3);
  const basePension: PensionInputs = {
    publicPension: {
      enabled: true,
      mode: 'auto',
      startAge: randInt(rand, 63, 67),
      manualMonthlyTodayValue: 0,
      workStartAge: randInt(rand, 20, 30),
    },
    retirementPension: {
      enabled: true,
      mode: 'auto',
      startAge: randInt(rand, 55, 65),
      payoutYears: randInt(rand, 10, 30),
      currentBalance: randInt(rand, 0, 50000),
      accumulationReturnRate: randInt(rand, 2, 6),
      payoutReturnRate: randInt(rand, 1, 4),
      manualMonthlyTodayValue: 0,
    },
    privatePension: {
      enabled: false,
      mode: 'auto',
      startAge: randInt(rand, 55, 65),
      payoutYears: randInt(rand, 10, 30),
      currentBalance: randInt(rand, 0, 30000),
      monthlyContribution: randInt(rand, 0, 100),
      expectedReturnRate: randInt(rand, 2, 7),
      accumulationReturnRate: randInt(rand, 2, 7),
      payoutReturnRate: randInt(rand, 2, 6),
      manualMonthlyTodayValue: 0,
      detailMode: false,
      products: [],
    },
  };

  if (pensionPreset === 1) {
    basePension.publicPension.enabled = false;
    basePension.retirementPension.enabled = false;
    basePension.privatePension.enabled = false;
  } else if (pensionPreset === 2) {
    basePension.retirementPension.mode = 'manual';
    basePension.retirementPension.manualMonthlyTodayValue = randInt(rand, 20, 300);
    basePension.privatePension.enabled = true;
    basePension.privatePension.mode = 'manual';
    basePension.privatePension.manualMonthlyTodayValue = randInt(rand, 10, 200);
  } else if (pensionPreset === 3) {
    basePension.privatePension.enabled = true;
    basePension.privatePension.mode = 'auto';
    basePension.privatePension.detailMode = true;
    basePension.privatePension.products = [
      {
        id: 'p1',
        label: '기타',
        currentBalance: randInt(rand, 0, 15000),
        monthlyContribution: randInt(rand, 0, 80),
        expectedReturnRate: randInt(rand, 2, 6),
        accumulationReturnRate: randInt(rand, 2, 6),
        payoutReturnRate: randInt(rand, 2, 5),
        startAge: randInt(rand, 55, 65),
        payoutYears: randInt(rand, 10, 25),
      },
      {
        id: 'p2',
        label: '기타',
        currentBalance: randInt(rand, 0, 12000),
        monthlyContribution: randInt(rand, 0, 60),
        expectedReturnRate: randInt(rand, 2, 6),
        accumulationReturnRate: randInt(rand, 2, 6),
        payoutReturnRate: randInt(rand, 2, 5),
        startAge: randInt(rand, 55, 65),
        payoutYears: randInt(rand, 10, 25),
      },
    ];
  }

  return {
    goal: {
      retirementAge,
      lifeExpectancy,
      targetMonthly,
      inflationRate: randInt(rand, 1, 5),
    },
    status: {
      currentAge,
      annualIncome,
      incomeGrowthRate: randInt(rand, 0, 6),
      annualExpense,
      expenseGrowthRate: randInt(rand, 0, 6),
    },
    assets: {
      cash: { amount: financialTotal * w.cash, expectedReturn: 1.5 + randInt(rand, 0, 3) },
      deposit: { amount: financialTotal * w.deposit, expectedReturn: 2.0 + randInt(rand, 0, 3) },
      stock_kr: { amount: financialTotal * w.stock_kr, expectedReturn: 5 + randInt(rand, 0, 6) },
      stock_us: { amount: financialTotal * w.stock_us, expectedReturn: 6 + randInt(rand, 0, 6) },
      bond: { amount: financialTotal * w.bond, expectedReturn: 2.5 + randInt(rand, 0, 3) },
      crypto: { amount: financialTotal * w.crypto, expectedReturn: 8 + randInt(rand, 0, 12) },
      realEstate: { amount: reAmount, expectedReturn: 1.5 + randInt(rand, 0, 4) },
    },
    debts: {
      mortgage: hasMortgage
        ? {
            balance: randInt(rand, 3000, 80000),
            interestRate: randInt(rand, 2, 7),
            repaymentType: 'equal_payment',
            repaymentYears: randInt(rand, 5, 30),
          }
        : { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
      creditLoan: hasCredit
        ? {
            balance: randInt(rand, 1000, 30000),
            interestRate: randInt(rand, 3, 12),
            repaymentType: rand() < 0.7 ? 'equal_payment' : 'balloon_payment',
            repaymentYears: randInt(rand, 1, 10),
          }
        : { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      otherLoan: hasOther
        ? {
            balance: randInt(rand, 500, 20000),
            interestRate: randInt(rand, 3, 12),
            repaymentType: rand() < 0.5 ? 'equal_payment' : 'balloon_payment',
            repaymentYears: randInt(rand, 1, 12),
          }
        : { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
    children: {
      hasChildren,
      count: childrenCount,
      monthlyPerChild: childMonthly,
      independenceAge: hasChildren ? randInt(rand, currentAge + 5, Math.min(lifeExpectancy, currentAge + 35)) : 0,
      costGrowthMode: rand() < 0.8 ? 'inflation' : 'custom',
      customGrowthRate: randInt(rand, 1, 8),
    },
    pension: basePension,
  };
}

describe('scenario sweep regression — dense + fuzz', () => {
  it(
    '고밀도 매트릭스(864): max_sustainable 모드에서 단조성/핵심 불변식이 깨지지 않아야 함',
    () => {
      let scenarios = 0;
      for (const profile of PROFILES) {
        for (const financialTotal of FINANCIAL_TOTALS) {
          for (const realEstate of REAL_ESTATES) {
            let prevSustainable = -Infinity;
            for (const income of INCOMES) {
              const inputs = makeBaseInput(income, financialTotal, realEstate, profile);
              const result = runScenario(inputs, 'max_sustainable');
              assertCoreInvariants(result, inputs, 'max_sustainable');
              expect(result.summary.sustainableMonthly).toBeGreaterThanOrEqual(prevSustainable);
              prevSustainable = result.summary.sustainableMonthly;
              scenarios += 1;
            }
          }
        }
      }
      expect(scenarios).toBe(864);
    },
    SWEEP_TEST_TIMEOUT_MS,
  );

  it(
    '결정론적 퍼즈(400x2모드): 모드 간 최대값 일치/정책 일관성/수치 정합성을 만족해야 함',
    () => {
      const rand = makeRng(20260405);
      let scenarios = 0;
      for (let i = 0; i < 400; i += 1) {
        const inputs = makeRandomInput(rand);
        const keepPriority = runScenario(inputs, 'keep_priority');
        const maxSustainable = runScenario(inputs, 'max_sustainable');

        assertCoreInvariants(keepPriority, inputs, 'keep_priority');
        assertCoreInvariants(maxSustainable, inputs, 'max_sustainable');

        expect(keepPriority.summary.maxSustainableMonthly).toBe(maxSustainable.summary.maxSustainableMonthly);
        expect(keepPriority.summary.maxSustainableStrategy).toBe(maxSustainable.summary.maxSustainableStrategy);
        expect(keepPriority.summary.sustainableMonthly).toBeLessThanOrEqual(maxSustainable.summary.sustainableMonthly);

        for (const strategy of ['keep', 'secured_loan', 'sell'] as const) {
          const kp = keepPriority.propertyOptions.find((o) => o.strategy === strategy)!;
          const mx = maxSustainable.propertyOptions.find((o) => o.strategy === strategy)!;
          expect(kp.sustainableMonthly).toBe(mx.sustainableMonthly);
          expect(kp.survivesToLifeExpectancy).toBe(mx.survivesToLifeExpectancy);
          expect(kp.failureAge).toBe(mx.failureAge);
        }

        scenarios += 1;
      }
      expect(scenarios).toBe(400);
    },
    SWEEP_TEST_TIMEOUT_MS,
  );
});
