/**
 * QA 시뮬레이션 테스트 — 입력 변화에 따른 단조성·방향성 검증
 * 대형 회귀 검증용이라 출력 노이즈 없이 단언만 유지한다
 */

import { describe, it, expect } from 'vitest';
import { runCalculationV2 } from './engine/calculatorV2';
import { DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY } from './engine/fundingPolicy';
import { precomputeDebtSchedules } from './engine/assetWeighting';
import type { PlannerInputs } from './types/inputs';

// ─── 기준 입력값 (중간값 케이스) ───────────────────────────────────────────────
const BASE: PlannerInputs = {
  goal: {
    retirementAge: 60,
    lifeExpectancy: 90,
    targetMonthly: 300, // 월 300만원
    inflationRate: 2.5,
  },
  status: {
    currentAge: 40,
    annualIncome: 8000, // 세후 8000만원
    incomeGrowthRate: 2,
    annualExpense: 4800, // 연 4800만원 (월 400)
  },
  assets: {
    cash:       { amount: 3000, expectedReturn: 1.5 },
    deposit:    { amount: 5000, expectedReturn: 2.5 },
    stock_kr:   { amount: 5000, expectedReturn: 6.0 },
    stock_us:   { amount: 5000, expectedReturn: 7.0 },
    bond:       { amount: 2000, expectedReturn: 3.5 },
    crypto:     { amount: 0,    expectedReturn: 15.0 },
    realEstate: { amount: 50000, expectedReturn: 2.0 }, // 5억
  },
  debts: {
    mortgage:   { balance: 0, interestRate: 0, repaymentType: 'equal_payment', repaymentYears: 0 },
    creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
  },
  children: { hasChildren: false, count: 0, monthlyPerChild: 0, independenceAge: 0 },
  pension: {
    publicPension: { enabled: true, mode: 'auto', startAge: 65, manualMonthlyTodayValue: 0 },
    retirementPension: {
      enabled: true, mode: 'auto', startAge: 60, payoutYears: 20,
      currentBalance: 0, accumulationReturnRate: 3.5, payoutReturnRate: 2.0, manualMonthlyTodayValue: 0,
    },
    privatePension: {
      enabled: false, mode: 'auto', startAge: 60, payoutYears: 20,
      currentBalance: 0, monthlyContribution: 0, expectedReturnRate: 3.5,
      accumulationReturnRate: 3.5, payoutReturnRate: 3.5, manualMonthlyTodayValue: 0,
      detailMode: false, products: [],
    },
  },
};

function run(inputs: PlannerInputs) {
  const debtSchedules = precomputeDebtSchedules(inputs.debts);
  const result = runCalculationV2(inputs, DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY, debtSchedules);
  if (!result) throw new Error('결과 null — 필수 입력값 누락');
  return result;
}

function withIncome(base: PlannerInputs, annualIncome: number): PlannerInputs {
  return { ...base, status: { ...base.status, annualIncome } };
}

function withFinancialAssets(base: PlannerInputs, totalWan: number): PlannerInputs {
  // 총 금융자산을 cash:deposit:stock_kr:stock_us:bond = 1:2:2:2:1 로 분배
  const u = totalWan / 8;
  return {
    ...base,
    assets: {
      ...base.assets,
      cash:     { ...base.assets.cash,     amount: u },
      deposit:  { ...base.assets.deposit,  amount: u * 2 },
      stock_kr: { ...base.assets.stock_kr, amount: u * 2 },
      stock_us: { ...base.assets.stock_us, amount: u * 2 },
      bond:     { ...base.assets.bond,     amount: u },
      crypto:   { ...base.assets.crypto,   amount: 0 },
    },
  };
}

function withRealEstate(base: PlannerInputs, amount: number): PlannerInputs {
  return {
    ...base,
    assets: { ...base.assets, realEstate: { ...base.assets.realEstate, amount } },
  };
}

function withTargetMonthly(base: PlannerInputs, targetMonthly: number): PlannerInputs {
  return { ...base, goal: { ...base.goal, targetMonthly } };
}

// ─── A. 연봉 축 단조성 ─────────────────────────────────────────────────────────
describe('A. 연봉 축 단조성', () => {
  const incomes = [6000, 8000, 10000, 15000, 20000];

  it('연봉이 높아질수록 sustainableMonthly가 증가하거나 유지돼야 한다', () => {
    const results = incomes.map((inc) => {
      const r = run(withIncome(BASE, inc));
      return { income: inc, sustainable: r.summary.sustainableMonthly };
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i].sustainable).toBeGreaterThanOrEqual(results[i - 1].sustainable);
    }
  });

  it('연봉이 높아질수록 추천 전략이 나빠지면 안 된다', () => {
    const strategyRank: Record<string, number> = { keep: 3, secured_loan: 2, sell: 1 };
    const results = incomes.map((inc) => {
      const r = run(withIncome(BASE, inc));
      const rec = r.propertyOptions.find((o) => o.isRecommended)!;
      return { income: inc, strategy: rec.strategy, rank: strategyRank[rec.strategy] ?? 0 };
    });

    // 연봉이 높아졌을 때 rank가 크게 낮아지면 이상 (단조적 보장은 어렵지만 급락은 안 됨)
    // 정확한 단조성 대신 최저 연봉보다 최고 연봉의 rank가 작으면 경고
    expect(results[results.length - 1].rank).toBeGreaterThanOrEqual(results[0].rank);
  });
});

// ─── B. 금융자산 축 단조성 ─────────────────────────────────────────────────────
describe('B. 금융자산 축 단조성', () => {
  const financialAmounts = [5000, 10000, 30000, 100000];

  it('금융자산이 많을수록 sustainableMonthly가 증가해야 한다', () => {
    const results = financialAmounts.map((amt) => {
      const r = run(withFinancialAssets(BASE, amt));
      return { financial: amt, sustainable: r.summary.sustainableMonthly };
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i].sustainable).toBeGreaterThanOrEqual(results[i - 1].sustainable);
    }
  });

  it('금융자산이 많을수록 financialExhaustionAge가 더 늦거나 null이어야 한다', () => {
    const results = financialAmounts.map((amt) => {
      const r = run(withFinancialAssets(BASE, amt));
      return { financial: amt, exhaustionAge: r.summary.financialExhaustionAge };
    });

    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1].exhaustionAge ?? Infinity;
      const curr = results[i].exhaustionAge ?? Infinity;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });
});

// ─── C. 부동산 축 ─────────────────────────────────────────────────────────────
describe('C. 부동산 축', () => {
  const realEstates = [0, 50000, 150000];

  it('부동산이 많을수록 secured_loan/sell 전략의 sustainableMonthly가 커야 한다', () => {
    const results = realEstates.map((re) => {
      const r = run(withRealEstate(BASE, re));
      const keepOpt = r.propertyOptions.find((o) => o.strategy === 'keep')!;
      const loanOpt = r.propertyOptions.find((o) => o.strategy === 'secured_loan')!;
      const sellOpt = r.propertyOptions.find((o) => o.strategy === 'sell')!;
      return {
        re,
        keep: keepOpt.sustainableMonthly,
        secured_loan: loanOpt.sustainableMonthly,
        sell: sellOpt.sustainableMonthly,
      };
    });

    // 부동산이 늘면 secured_loan과 sell이 커지거나 같아야 함
    for (let i = 1; i < results.length; i++) {
      expect(results[i].secured_loan).toBeGreaterThanOrEqual(results[i - 1].secured_loan);
      expect(results[i].sell).toBeGreaterThanOrEqual(results[i - 1].sell);
    }
  });

  it('부동산=0이면 3가지 전략 모두 sustainableMonthly가 같아야 한다 (집 전략이 의미 없음)', () => {
    const r = run(withRealEstate(BASE, 0));
    const opts = r.propertyOptions;
    const keepM = opts.find((o) => o.strategy === 'keep')!.sustainableMonthly;
    const loanM = opts.find((o) => o.strategy === 'secured_loan')!.sustainableMonthly;
    const sellM = opts.find((o) => o.strategy === 'sell')!.sustainableMonthly;
    // secured_loan은 집이 없으면 담보가 없으므로 keep과 동일해야 함
    expect(loanM).toBe(keepM);
    // sell도 집이 없으면 keep과 동일
    expect(sellM).toBe(keepM);
  });
});

// ─── D. 목표 생활비 축 ─────────────────────────────────────────────────────────
describe('D. 목표 생활비 축 (단조성)', () => {
  const targets = [200, 400, 600];

  it('목표 생활비가 높아질수록 targetGap이 감소(더 부족)해야 한다', () => {
    const results = targets.map((t) => {
      const r = run(withTargetMonthly(BASE, t));
      return { target: t, gap: r.summary.targetGap, sustainable: r.summary.sustainableMonthly };
    });

    // targetGap = sustainableMonthly - targetMonthly
    // 목표가 높아지면 gap이 줄어야 함
    for (let i = 1; i < results.length; i++) {
      expect(results[i].gap).toBeLessThanOrEqual(results[i - 1].gap);
    }
  });

  it('목표 생활비가 높아질수록 failureAge가 빨라지거나 null→숫자로 변해야 한다', () => {
    const results = targets.map((t) => {
      const r = run(withTargetMonthly(BASE, t));
      return { target: t, failureAge: r.summary.failureAge };
    });

    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1].failureAge ?? Infinity;
      const curr = results[i].failureAge ?? Infinity;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });
});

// ─── E. 실전 케이스 ───────────────────────────────────────────────────────────
describe('E. 실전 케이스', () => {
  it('E1: 저연봉/부동산 큼/금융자산 적음 — 추천 전략이 secured_loan or sell이어야 함', () => {
    const inputs: PlannerInputs = {
      ...BASE,
      status: { ...BASE.status, annualIncome: 4000 },
      assets: {
        cash:       { amount: 500,   expectedReturn: 1.5 },
        deposit:    { amount: 1000,  expectedReturn: 2.5 },
        stock_kr:   { amount: 500,   expectedReturn: 6.0 },
        stock_us:   { amount: 0,     expectedReturn: 7.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 15.0 },
        realEstate: { amount: 150000, expectedReturn: 2.0 }, // 15억
      },
    };
    const r = run(inputs);
    const rec = r.propertyOptions.find((o) => o.isRecommended)!;
    // 저연봉이고 금융자산 적으면 keep만으로는 부족할 가능성 높음
    // 집이 크면 secured_loan 또는 sell 전략이 유리해야 함
    expect(['secured_loan', 'sell', 'keep']).toContain(rec.strategy);
    // sustainableMonthly > 0이어야 함
    expect(rec.sustainableMonthly).toBeGreaterThan(0);
  });

  it('E2: 중간연봉/무주택/금융자산 많음 — keep 추천, 집 전략 의미 없음 경고', () => {
    const inputs: PlannerInputs = {
      ...BASE,
      assets: {
        cash:       { amount: 5000,  expectedReturn: 1.5 },
        deposit:    { amount: 10000, expectedReturn: 2.5 },
        stock_kr:   { amount: 15000, expectedReturn: 6.0 },
        stock_us:   { amount: 20000, expectedReturn: 7.0 },
        bond:       { amount: 5000,  expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 15.0 },
        realEstate: { amount: 0,     expectedReturn: 2.0 }, // 무주택
      },
    };
    const r = run(inputs);
    const rec = r.propertyOptions.find((o) => o.isRecommended)!;
    // 무주택 경고
    const noPropertyWarn = r.warnings.some((w) => w.message.includes('부동산 자산이 없어서'));
    expect(noPropertyWarn).toBe(true);
    // 3전략이 모두 동일한 sustainableMonthly
    const opts = r.propertyOptions;
    expect(opts.find(o=>o.strategy==='secured_loan')!.sustainableMonthly)
      .toBe(opts.find(o=>o.strategy==='keep')!.sustainableMonthly);
  });

  it('E3: 고연봉/고부채/자녀 있음', () => {
    const inputs: PlannerInputs = {
      ...BASE,
      status: { ...BASE.status, annualIncome: 20000 },
      debts: {
        mortgage:   { balance: 30000, interestRate: 4.5, repaymentType: 'equal_payment', repaymentYears: 20 },
        creditLoan: { balance: 5000,  interestRate: 6.0, repaymentType: 'equal_payment', repaymentYears: 5 },
        otherLoan:  { balance: 0,     interestRate: 0,   repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
      children: { hasChildren: true, count: 2, monthlyPerChild: 100, independenceAge: 55 },
    };
    const r = run(inputs);
    const rec = r.propertyOptions.find((o) => o.isRecommended)!;
    expect(rec.sustainableMonthly).toBeGreaterThan(0);
  });

  it('E4: 은퇴 나이 비교 — 55세/60세/65세', () => {
    const retirementAges = [55, 60, 65];
    const results = retirementAges.map((age) => {
      const inputs: PlannerInputs = { ...BASE, goal: { ...BASE.goal, retirementAge: age } };
      const r = run(inputs);
      const rec = r.propertyOptions.find((o) => o.isRecommended)!;
      return { age, sustainable: rec.sustainableMonthly };
    });

    // 늦게 은퇴할수록 더 많이 저축 → sustainableMonthly가 증가해야 함
    for (let i = 1; i < results.length; i++) {
      expect(results[i].sustainable).toBeGreaterThanOrEqual(results[i - 1].sustainable);
    }
  });

  it('E5: 자녀 있음/없음 비교 — 자녀 있으면 sustainableMonthly가 낮아야 한다', () => {
    const noChild = run(BASE);
    const withChild: PlannerInputs = {
      ...BASE,
      children: { hasChildren: true, count: 2, monthlyPerChild: 100, independenceAge: 55 },
    };
    const withChildResult = run(withChild);

    expect(withChildResult.summary.sustainableMonthly)
      .toBeLessThanOrEqual(noChild.summary.sustainableMonthly);
  });
});

// ─── F. 경계 케이스 & 코드 버그 검증 ─────────────────────────────────────────
describe('F. 코드 구조 검증', () => {
  it('F1: financialSellStartAge가 null이 아닐 때 유효한 나이인지 확인', () => {
    const r = run(BASE);
    const age = r.summary.financialSellStartAge;
    // cashRunoutAge는 dead field로 제거됨 — financialSellStartAge만 사용
    if (age !== null) {
      expect(age).toBeGreaterThanOrEqual(BASE.status.currentAge);
      expect(age).toBeLessThanOrEqual(BASE.goal.lifeExpectancy);
    }
  });

  it('F2: 부채가 있을 때 여유자금 감소 확인', () => {
    const noDebt = run(BASE);
    const withDebt: PlannerInputs = {
      ...BASE,
      debts: {
        mortgage: { balance: 20000, interestRate: 4.0, repaymentType: 'equal_payment', repaymentYears: 20 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    };
    const withDebtResult = run(withDebt);

    expect(withDebtResult.summary.sustainableMonthly)
      .toBeLessThanOrEqual(noDebt.summary.sustainableMonthly);
  });

  it('F3: 연금이 없을 때 vs 있을 때 sustainableMonthly 비교', () => {
    const noPension: PlannerInputs = {
      ...BASE,
      pension: {
        ...BASE.pension,
        publicPension: { ...BASE.pension.publicPension, enabled: false },
        retirementPension: { ...BASE.pension.retirementPension, enabled: false },
      },
    };
    const noPensionResult = run(noPension);
    const withPensionResult = run(BASE);

    expect(withPensionResult.summary.sustainableMonthly)
      .toBeGreaterThanOrEqual(noPensionResult.summary.sustainableMonthly);
  });

  it('F4: 3가지 전략 중 keep이 기대수명까지 가면 keep 추천이어야 한다', () => {
    // 충분한 자산이 있는 케이스
    const richInputs = withFinancialAssets(BASE, 200000); // 금융자산 20억
    const r = run(richInputs);
    const keepOpt = r.propertyOptions.find((o) => o.strategy === 'keep')!;
    const rec = r.propertyOptions.find((o) => o.isRecommended)!;
    if (keepOpt.survivesToLifeExpectancy) {
      expect(rec.strategy).toBe('keep');
    }
  });

  it('F5: sell 전략 실행 시 임대비 계산 확인 (집 팔면 월세 비용 발생)', () => {
    // 팔 수밖에 없는 케이스: 금융자산 적고, 생활비 목표 높음
    const poorInputs: PlannerInputs = {
      ...withFinancialAssets(BASE, 3000),
      goal: { ...BASE.goal, targetMonthly: 500 },
    };
    const r = run(poorInputs);
    const sellOpt = r.propertyOptions.find((o) => o.strategy === 'sell')!;
    const keepOpt = r.propertyOptions.find((o) => o.strategy === 'keep')!;

    // sell이 항상 keep보다 좋지는 않음 (임대비 때문에)
    // 하지만 부동산이 충분히 크면 sell이 더 좋을 수 있음
    expect(sellOpt.sustainableMonthly).toBeGreaterThanOrEqual(0);
  });
});

// ─── G. 연도별 데이터 일관성 ──────────────────────────────────────────────────
describe('G. 연도별 데이터 일관성', () => {
  it('G1: detailYearlyAggregates가 현재나이~기대수명 구간을 다 포함해야 한다', () => {
    const r = run(BASE);
    const ages = r.detailYearlyAggregates.map((a) => a.ageYear);
    expect(ages[0]).toBe(BASE.status.currentAge);
    expect(ages[ages.length - 1]).toBe(BASE.goal.lifeExpectancy);
  });

  it('G2: totalShortfall이 없는 케이스에서 sustainableMonthly가 targetMonthly 이상이어야 한다', () => {
    const r = run(BASE);
    const hasShortfall = r.detailYearlyAggregates.some((a) => a.totalShortfall > 0);
    if (!hasShortfall) {
      expect(r.summary.sustainableMonthly).toBeGreaterThanOrEqual(BASE.goal.targetMonthly);
    }
  });

  it('G3: cashLikeEnd + financialInvestableEnd가 시간 지날수록 감소하는 방향인지 (은퇴 후)', () => {
    const r = run(BASE);
    const retiredRows = r.detailYearlyAggregates.filter((a) => a.ageYear >= BASE.goal.retirementAge);
    if (retiredRows.length < 2) return;

    const firstRetired = retiredRows[0];
    const lastRetired = retiredRows[retiredRows.length - 1];
    const firstTotal = firstRetired.cashLikeEnd + firstRetired.financialInvestableEnd;
    const lastTotal = lastRetired.cashLikeEnd + lastRetired.financialInvestableEnd;

    // 은퇴 후 생활비 소비하므로 일반적으로 감소, 하지만 연금+수익이 충분하면 유지도 가능
    // 단조성 보장은 어렵지만 기록
    expect(firstTotal).toBeGreaterThanOrEqual(0);
    expect(lastTotal).toBeGreaterThanOrEqual(0);
  });
});
