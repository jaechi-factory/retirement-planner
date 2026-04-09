/**
 * simulatorV2.ts 엔진 검증 테스트 (정책 확정판)
 *
 * ── 정책 검증 항목 ────────────────────────────────────────────────────────────
 * [P1] 버킷별 개별 수익률 — 현금(1%) vs 주식(8%) 성장 비율 차이
 * [P2] 잉여 재투자 비중 고정 — initialRatios 불변, realEstate 제외
 * [P3] 매도 우선순위 — cash → deposit → bond → stock_kr → stock_us → crypto
 *       bond 먼저 소진 후 stock_kr 소진
 * [P4] 첫 해 정상 처리 — 첫 달(month=0)부터 소득·부채 반영, isFirstYear 없음
 * [P5] 담보대출 이자 타이밍 — draw 당월 이자 없음, 다음 달부터 이자 발생
 * [P6] 과매도 방지 — 부족 상황에서 생활비 부족분+버퍼 부족분을 단 1번 인출
 *
 * ── 시나리오 검증 ────────────────────────────────────────────────────────────
 * - 연봉별: 6000 / 8000 / 1억 / 1.5억 / 2억
 * - 금융자산별: 5000 / 1억 / 3억 / 10억
 * - 생활비별: 월 200 / 400 / 600
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { PlannerInputs } from '../types/inputs';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
import * as policyModule from '../policy/policyTable';
import {
  simulateMonthlyV2,
  isSustainableV2,
  findFinancialSellStartAgeV2,
  aggregateToYearly,
} from './simulatorV2';
import { findMaxSustainableMonthlyV2 } from './binarySearchV2';
import { calcHousingAnnuityMonthly } from './housingAnnuity';
import { precomputeDebtSchedules } from './assetWeighting';
import { runCalculationV2 } from './calculatorV2';
import { DEFAULT_FUNDING_POLICY as CALC_FUNDING_POLICY, DEFAULT_LIQUIDATION_POLICY as CALC_LIQUIDATION_POLICY } from './fundingPolicy';

// ─── 기본 입력 픽스처 ─────────────────────────────────────────────────────────

const DEFAULT_FUNDING_POLICY: FundingPolicy = { liquidityBufferMonths: 6 };
const DEFAULT_LIQUIDATION: LiquidationPolicy = { strategy: 'pro_rata' };

/** 기본 입력 템플릿 (값은 테스트별로 override) */
function makeInputs(overrides: Partial<PlannerInputs> = {}): PlannerInputs {
  const base: PlannerInputs = {
    goal: {
      retirementAge: 65,
      lifeExpectancy: 90,
      targetMonthly: 300,
      inflationRate: 2.5,
    },
    status: {
      currentAge: 40,
      annualIncome: 6000,
      incomeGrowthRate: 2.0,
      annualExpense: 3600,
      expenseGrowthRate: 2.0,
    },
    assets: {
      cash:       { amount: 1000,  expectedReturn: 1.0 },
      deposit:    { amount: 2000,  expectedReturn: 2.0 },
      stock_kr:   { amount: 3000,  expectedReturn: 6.0 },
      stock_us:   { amount: 4000,  expectedReturn: 8.0 },
      bond:       { amount: 1000,  expectedReturn: 3.5 },
      crypto:     { amount: 0,     expectedReturn: 0   },
      realEstate: { amount: 50000, expectedReturn: 3.0 },
    },
    debts: {
      mortgage:   { balance: 0, interestRate: 0, repaymentType: 'equal_payment',  repaymentYears: 0 },
      creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
    children: {
      hasChildren: false,
      count: 0,
      monthlyPerChild: 0,
      independenceAge: 0,
    },
    pension: {
      publicPension: {
        enabled: false,
        mode: 'auto',
        startAge: 65,
        manualMonthlyTodayValue: 0,
      },
      retirementPension: {
        enabled: false,
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
        startAge: 65,
        payoutYears: 20,
        currentBalance: 0,
        monthlyContribution: 0,
        expectedReturnRate: 3.5,
        accumulationReturnRate: 3.5,
        payoutReturnRate: 2.0,
        manualMonthlyTodayValue: 0,
        detailMode: false,
        products: [],
      },
    },
  };

  return { ...base, ...overrides };
}

// ─── [P1] 버킷별 개별 수익률 ─────────────────────────────────────────────────

describe('[P1] 버킷별 개별 수익률', () => {
  it('주식(8%) 버킷이 현금(1%) 버킷보다 빠르게 성장해야 함', () => {
    const inputs = makeInputs({
      status: {
        currentAge: 40,
        annualIncome: 0,
        incomeGrowthRate: 0,
        annualExpense: 0,
        expenseGrowthRate: 0,
      },
      assets: {
        cash:       { amount: 10000, expectedReturn: 1.0 },
        deposit:    { amount: 0,     expectedReturn: 2.0 },
        stock_kr:   { amount: 0,     expectedReturn: 6.0 },
        stock_us:   { amount: 10000, expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 0,     expectedReturn: 0   },
      },
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 0, inflationRate: 2.5 },
    });

    const snapshots = simulateMonthlyV2(inputs, 0, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const last = snapshots[snapshots.length - 1];

    // 주식(8%)이 현금(1%)보다 커야 함
    expect(last.financialInvestableEnd).toBeGreaterThan(last.cashLikeEnd);
  });
});

// ─── [P2] 잉여 재투자 비중 고정 ──────────────────────────────────────────────

describe('[P2] 잉여 재투자 — initialRatios 고정, realEstate 제외', () => {
  it('소득 > 지출이면 은퇴 전 투자자산이 현금보다 훨씬 많아야 함 (초기 비중 유지)', () => {
    const inputs = makeInputs({
      status: {
        currentAge: 40,
        annualIncome: 8000,
        incomeGrowthRate: 2.0,
        annualExpense: 3000,
        expenseGrowthRate: 2.0,
      },
      assets: {
        cash:       { amount: 500,  expectedReturn: 1.0 },
        deposit:    { amount: 500,  expectedReturn: 2.0 },
        stock_kr:   { amount: 2000, expectedReturn: 6.0 },
        stock_us:   { amount: 3000, expectedReturn: 8.0 },
        bond:       { amount: 1000, expectedReturn: 3.5 },
        crypto:     { amount: 0,    expectedReturn: 0   },
        realEstate: { amount: 0,    expectedReturn: 0   },
      },
    });

    const snapshots = simulateMonthlyV2(
      inputs, inputs.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );
    // 은퇴 직전 (64세 말)
    const atRetirementEve = snapshots.find(s => s.ageYear === 64 && s.ageMonthIndex === 11);
    expect(atRetirementEve).toBeDefined();

    // 초기 비중: 투자자산(3000+2000+1000=6000) >> 현금성(500+500=1000)
    // 잉여 재투자 시에도 이 비중이 유지돼야 함
    expect(atRetirementEve!.financialInvestableEnd).toBeGreaterThan(atRetirementEve!.cashLikeEnd * 3);
  });

  it('부동산(realEstate)은 잉여 분배 대상에서 제외돼야 함 (기대수명 내내 propertyValueEnd 독립 성장)', () => {
    const inputs = makeInputs({
      status: {
        currentAge: 40,
        annualIncome: 8000,
        incomeGrowthRate: 2.0,
        annualExpense: 3000,
        expenseGrowthRate: 2.0,
      },
      assets: {
        cash:       { amount: 1000,  expectedReturn: 1.0 },
        deposit:    { amount: 0,     expectedReturn: 2.0 },
        stock_kr:   { amount: 1000,  expectedReturn: 6.0 },
        stock_us:   { amount: 0,     expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 10000, expectedReturn: 3.0 },
      },
    });

    const snapshots = simulateMonthlyV2(
      inputs, inputs.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );

    // keep 전략이면 부동산은 계속 성장 (잉여 재투자 없음)
    const month1 = snapshots[0];
    const month24 = snapshots.find(s => s.ageYear === 42 && s.ageMonthIndex === 0);
    if (month24) {
      // 2년 후 부동산은 3% 복리 성장 (잉여 분배로 인위적으로 올라가면 안 됨)
      const expected = 10000 * Math.pow(1.03, 2);
      expect(month24.propertyValueEnd).toBeGreaterThan(10000);
      expect(month24.propertyValueEnd).toBeLessThan(expected * 1.05); // 5% 이상 차이나면 이상
    }
    expect(month1.propertyValueEnd).toBeGreaterThan(10000); // 최소 성장
  });
});

// ─── [P3] 매도 우선순위 ───────────────────────────────────────────────────────

describe('[P3] 매도 우선순위 (cash → deposit → bond → stock_kr → stock_us → crypto)', () => {
  it('현금이 있으면 투자자산 매도 전에 현금을 먼저 소진해야 함', () => {
    const inputs = makeInputs({
      status: {
        currentAge: 40,
        annualIncome: 0,
        incomeGrowthRate: 0,
        annualExpense: 0,
        expenseGrowthRate: 0,
      },
      assets: {
        cash:       { amount: 50000, expectedReturn: 0   },
        deposit:    { amount: 0,     expectedReturn: 2.0 },
        stock_kr:   { amount: 1000,  expectedReturn: 6.0 },
        stock_us:   { amount: 1000,  expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 0,     expectedReturn: 0   },
      },
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 200, inflationRate: 2.5 },
    });

    const snapshots = simulateMonthlyV2(inputs, 200, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // 처음 10년은 투자자산 매도 없어야 함 (현금 50억으로 충당)
    const earlyFinancialSell = snapshots.filter(s => s.ageYear <= 50)
      .some(s => s.eventFlags.financialSellStarted);
    expect(earlyFinancialSell).toBe(false);

    // 투자자산은 수익률로 성장해야 함
    const atAge50 = snapshots.find(s => s.ageYear === 50 && s.ageMonthIndex === 11);
    expect(atAge50?.financialInvestableEnd).toBeGreaterThan(2000); // 초기 2000 이상
  });

  it('bond는 투자자산이므로 현금성 소진 직후 bond부터 매도해야 함 (financialSellStarted 트리거)', () => {
    // cash=0, deposit=0, bond만 있는 경우: retirement 시작 직후 financialSellStarted 발생해야 함
    const inputs = makeInputs({
      status: {
        currentAge: 40,
        annualIncome: 0,
        incomeGrowthRate: 0,
        annualExpense: 0,
        expenseGrowthRate: 0,
      },
      assets: {
        cash:       { amount: 0,    expectedReturn: 0   },
        deposit:    { amount: 0,    expectedReturn: 2.0 },
        bond:       { amount: 5000, expectedReturn: 3.5 },
        stock_kr:   { amount: 0,    expectedReturn: 6.0 },
        stock_us:   { amount: 0,    expectedReturn: 8.0 },
        crypto:     { amount: 0,    expectedReturn: 0   },
        realEstate: { amount: 0,    expectedReturn: 0   },
      },
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 100, inflationRate: 2.5 },
    });

    const snapshots = simulateMonthlyV2(inputs, 100, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // retirement 시작(ageYear=41)에 bond에서 바로 인출 → financialSellStarted 발생
    const sellAge = findFinancialSellStartAgeV2(snapshots);
    expect(sellAge).toBe(41); // 은퇴 직후 투자자산(bond) 매도 시작
  });

  it('cash만 있는 경우 은퇴 후에도 financialSellStarted가 바로 발생하면 안 됨', () => {
    const inputs = makeInputs({
      status: {
        currentAge: 40,
        annualIncome: 0,
        incomeGrowthRate: 0,
        annualExpense: 0,
        expenseGrowthRate: 0,
      },
      assets: {
        cash:       { amount: 5000, expectedReturn: 0   },
        deposit:    { amount: 0,    expectedReturn: 2.0 },
        bond:       { amount: 0,    expectedReturn: 3.5 },
        stock_kr:   { amount: 0,    expectedReturn: 6.0 },
        stock_us:   { amount: 0,    expectedReturn: 8.0 },
        crypto:     { amount: 0,    expectedReturn: 0   },
        realEstate: { amount: 0,    expectedReturn: 0   },
      },
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 100, inflationRate: 2.5 },
    });

    const snapshots = simulateMonthlyV2(inputs, 100, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // 현금만 있으므로 financialSellStarted 절대 없어야 함
    const anyFinancialSell = snapshots.some(s => s.eventFlags.financialSellStarted);
    expect(anyFinancialSell).toBe(false);
  });

  /**
   * [P3] 개별 버킷 잔고 노출로 실제 차감 순서 검증
   * 시나리오: cash=200, deposit=100, bond=5000, stock_kr=5000 → 수익률=0, 생활비=350/월
   *
   * 수정된 동작 (이진탐색 단조성 fix 이후):
   *   Step 1: drawFromBuckets(deficit=350) — LIQUIDATION_ORDER: cash(200)→deposit(100)→bond(50)
   *   Step 2: topUpCashBuffer(buffer=350) — FINANCIAL_KEYS: stock_kr에서 350 보충 → cash=350
   *   결과: shortfall=0, 포트폴리오 순 감소 = 350 (생활비만)
   */
  it('[P3 강화] 개별 버킷 잔고로 cash → deposit → bond 차감 순서를 직접 검증', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 350, inflationRate: 0 },
      status: { currentAge: 65, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 200,  expectedReturn: 0 },
        deposit:    { amount: 100,  expectedReturn: 0 },
        bond:       { amount: 5000, expectedReturn: 0 },
        stock_kr:   { amount: 5000, expectedReturn: 0 },
        stock_us:   { amount: 0,    expectedReturn: 0 },
        crypto:     { amount: 0,    expectedReturn: 0 },
        realEstate: { amount: 0,    expectedReturn: 0 },
      },
    });

    // buffer = 350 * 1 = 350
    const fundingPolicy: FundingPolicy = { liquidityBufferMonths: 1 };

    const snapshots = simulateMonthlyV2(inputs, 350, 'keep', fundingPolicy, DEFAULT_LIQUIDATION);
    const m0 = snapshots[0]; // ageYear=65, ageMonthIndex=0

    // Step 1: drawFromBuckets(deficit=350): cash(200)→deposit(100)→bond(50)
    // Step 2: topUpCashBuffer(buffer=350): cashLike=0 → stock_kr에서 350 → cash=350
    expect(m0.depositEnd).toBe(0);                    // deposit 소진 (Step 1)
    expect(m0.bondEnd).toBeCloseTo(4950, 0);          // bond에서 50만 차감 (deficit 보전)
    expect(m0.stockKrEnd).toBeCloseTo(4650, 0);       // stock_kr에서 350 차감 (buffer top-up)
    expect(m0.cashEnd).toBeCloseTo(350, 0);           // 버퍼 복원됨
    expect(m0.shortfallThisMonth).toBe(0);            // 완전 충당
  });

  it('[P3 강화] bond 소진 후에만 stock_kr이 차감되어야 함', () => {
    // bond=300, stock_kr=10000, 필요 인출 > 300 인 상황
    const inputs = makeInputs({
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 500, inflationRate: 0 },
      status: { currentAge: 65, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 0,     expectedReturn: 0 },
        deposit:    { amount: 0,     expectedReturn: 0 },
        bond:       { amount: 300,   expectedReturn: 0 }, // 1달치보다 적음
        stock_kr:   { amount: 10000, expectedReturn: 0 },
        stock_us:   { amount: 0,     expectedReturn: 0 },
        crypto:     { amount: 0,     expectedReturn: 0 },
        realEstate: { amount: 0,     expectedReturn: 0 },
      },
    });

    const fundingPolicy: FundingPolicy = { liquidityBufferMonths: 0 }; // 버퍼 없음

    const snapshots = simulateMonthlyV2(inputs, 500, 'keep', fundingPolicy, DEFAULT_LIQUIDATION);
    const m0 = snapshots[0];

    // needed=500, bond=300(전부 차감), stock_kr에서 200 추가 차감
    expect(m0.bondEnd).toBe(0);                          // bond 완전 소진
    expect(m0.stockKrEnd).toBeCloseTo(9800, 0);          // stock_kr에서 200 차감
    expect(m0.shortfallThisMonth).toBe(0);               // 완전 충당
  });
});

// ─── [P4] 첫 해 정상 처리 (isFirstYear 없음) ──────────────────────────────────

describe('[P4] 첫 해 정상 처리 — 첫 달(month=0)부터 소득·부채 반영', () => {
  it('첫 달(ageMonthIndex=0) 부채 상환이 0보다 커야 함 (부채 있는 경우)', () => {
    const inputs = makeInputs({
      debts: {
        mortgage: {
          balance: 30000,
          interestRate: 4.0,
          repaymentType: 'equal_payment',
          repaymentYears: 20,
        },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(
      inputs, inputs.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );

    // 첫 달 (ageYear=currentAge=40, ageMonthIndex=0)
    const firstMonth = snapshots[0];
    expect(firstMonth.ageYear).toBe(40);
    expect(firstMonth.ageMonthIndex).toBe(0);
    expect(firstMonth.debtServiceThisMonth).toBeGreaterThan(0);
  });

  it('첫 달 소득이 0보다 커야 함 (소득 있는 경우)', () => {
    const inputs = makeInputs({
      status: {
        currentAge: 40,
        annualIncome: 6000,
        incomeGrowthRate: 2.0,
        annualExpense: 3600,
        expenseGrowthRate: 2.0,
      },
    });

    const snapshots = simulateMonthlyV2(
      inputs, inputs.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );

    const firstMonth = snapshots[0];
    expect(firstMonth.incomeThisMonth).toBeGreaterThan(0); // 6000/12 = 500
    expect(firstMonth.incomeThisMonth).toBeCloseTo(500, 0); // 월 500만원 (± 반올림)
  });

  it('부채 스케줄 index=0이 첫 달에 적용되어야 함 (부채 없으면 0)', () => {
    const inputs = makeInputs(); // 기본 = 부채 없음

    const schedules = precomputeDebtSchedules(inputs.debts);
    const firstPayment = (schedules.mortgage[0]?.payment ?? 0)
      + (schedules.creditLoan[0]?.payment ?? 0)
      + (schedules.otherLoan[0]?.payment ?? 0);

    const snapshots = simulateMonthlyV2(
      inputs, inputs.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );

    expect(snapshots[0].debtServiceThisMonth).toBe(firstPayment); // 단일 source와 일치
    expect(snapshots[0].debtServiceThisMonth).toBe(0); // 부채 없으면 0
  });
});

// ─── [P5] 담보대출 이자 타이밍 ───────────────────────────────────────────────

describe('[P5] 담보대출 이자 — draw 당월 이자 없음, 다음 달부터 이자 발생', () => {
  it('처음 대출 발생 전 securedLoanBalanceEnd = 0이어야 함', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 100, inflationRate: 0 },
      status: { currentAge: 40, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 0,      expectedReturn: 0 },
        deposit:    { amount: 0,      expectedReturn: 0 },
        bond:       { amount: 0,      expectedReturn: 0 },
        stock_kr:   { amount: 0,      expectedReturn: 0 },
        stock_us:   { amount: 0,      expectedReturn: 0 },
        crypto:     { amount: 0,      expectedReturn: 0 },
        realEstate: { amount: 100000, expectedReturn: 0 }, // 10억 부동산
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 100, 'secured_loan', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // 최초 대출 발생 인덱스 찾기 (propertyInterventionStarted는 첫 번째 draw 월에만 설정됨)
    const firstIdx = snapshots.findIndex(s => s.eventFlags.propertyInterventionStarted);
    expect(firstIdx).toBeGreaterThan(-1); // 대출이 실제로 발생해야 함

    // 대출 발생 전 모든 스냅샷: securedLoanBalanceEnd = 0
    const preIntervention = snapshots.slice(0, firstIdx);
    expect(preIntervention.every(s => s.securedLoanBalanceEnd === 0)).toBe(true);
  });

  it('대출 발생 이후 잔고가 단조 증가해야 함 (이자 + draw 누적)', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 100, inflationRate: 0 },
      status: { currentAge: 40, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 0,      expectedReturn: 0 },
        deposit:    { amount: 0,      expectedReturn: 0 },
        bond:       { amount: 0,      expectedReturn: 0 },
        stock_kr:   { amount: 0,      expectedReturn: 0 },
        stock_us:   { amount: 0,      expectedReturn: 0 },
        crypto:     { amount: 0,      expectedReturn: 0 },
        realEstate: { amount: 100000, expectedReturn: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 100, 'secured_loan', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const postIntervention = snapshots.filter(s => s.securedLoanBalanceEnd > 0);
    if (postIntervention.length < 2) return;

    // 이자 + draw 누적으로 잔고는 단조 증가
    for (let i = 1; i < postIntervention.length; i++) {
      expect(postIntervention[i].securedLoanBalanceEnd).toBeGreaterThanOrEqual(
        postIntervention[i - 1].securedLoanBalanceEnd,
      );
    }
  });

  it('대출 첫 달 잔고 = draw 금액 (이자 붙기 전)', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 100, inflationRate: 0 },
      status: { currentAge: 40, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 0,      expectedReturn: 0 },
        deposit:    { amount: 0,      expectedReturn: 0 },
        bond:       { amount: 0,      expectedReturn: 0 },
        stock_kr:   { amount: 0,      expectedReturn: 0 },
        stock_us:   { amount: 0,      expectedReturn: 0 },
        crypto:     { amount: 0,      expectedReturn: 0 },
        realEstate: { amount: 100000, expectedReturn: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 100, 'secured_loan', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // 대출 최초 발생 월 찾기
    const firstDrawIdx = snapshots.findIndex(s => s.eventFlags.propertyInterventionStarted);
    if (firstDrawIdx < 0) return; // 대출 발생 안 하면 스킵

    const firstDrawMonth = snapshots[firstDrawIdx];
    const drawBalance = firstDrawMonth.securedLoanBalanceEnd;

    // 직전 달은 0 (대출 전)
    const prevBalance = firstDrawIdx > 0 ? snapshots[firstDrawIdx - 1].securedLoanBalanceEnd : 0;
    expect(prevBalance).toBe(0);

    // 다음 달: drawBalance * (1 + 4.5%/12) + 추가 draw ≥ drawBalance * (1 + rate)
    if (firstDrawIdx + 1 < snapshots.length) {
      const nextBalance = snapshots[firstDrawIdx + 1].securedLoanBalanceEnd;
      const monthlyRate = 4.5 / 100 / 12;
      // 이자만 붙으면: drawBalance * (1+rate). 추가 draw가 있으면 더 높음.
      expect(nextBalance).toBeGreaterThanOrEqual(drawBalance * (1 + monthlyRate) - 1);
    }
  });
});

// ─── [P6] 과매도 방지 — 단일 인출 ───────────────────────────────────────────

describe('[P6] 과매도 방지 — 부족 상황에서 단 1번 인출', () => {
  it('은퇴 후 부족 달의 shortfall이 0이어야 함 (자산 충분히 있으면)', () => {
    // 자산이 충분하면 drawFromBuckets 1번으로 모든 부족분 해결 → shortfall=0
    const inputs = makeInputs({
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 100, inflationRate: 0 },
      status: { currentAge: 40, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 100000, expectedReturn: 0 }, // 충분한 현금
        deposit:    { amount: 0,      expectedReturn: 0 },
        bond:       { amount: 0,      expectedReturn: 0 },
        stock_kr:   { amount: 0,      expectedReturn: 0 },
        stock_us:   { amount: 0,      expectedReturn: 0 },
        crypto:     { amount: 0,      expectedReturn: 0 },
        realEstate: { amount: 0,      expectedReturn: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 100, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // 충분한 자산 → 모든 달 shortfall = 0
    const anyShortfall = snapshots.some(s => s.shortfallThisMonth > 0);
    expect(anyShortfall).toBe(false);
  });

  it('모든 자산 소진 시 shortfallThisMonth > 0이어야 함 (failureOccurred)', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 1000, inflationRate: 0 },
      status: { currentAge: 40, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 100, expectedReturn: 0 }, // 매우 적은 자산
        deposit:    { amount: 0,   expectedReturn: 0 },
        bond:       { amount: 0,   expectedReturn: 0 },
        stock_kr:   { amount: 0,   expectedReturn: 0 },
        stock_us:   { amount: 0,   expectedReturn: 0 },
        crypto:     { amount: 0,   expectedReturn: 0 },
        realEstate: { amount: 0,   expectedReturn: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 1000, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const failureMonth = snapshots.find(s => s.shortfallThisMonth > 0);
    expect(failureMonth).toBeDefined();
    expect(failureMonth!.eventFlags.failureOccurred).toBe(true);
  });

  it('cashLikeEnd가 음수가 되면 안 됨 (이중 인출 방지)', () => {
    // 부족 상황에서 이중 인출이면 음수가 될 수 있음
    const inputs = makeInputs({
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 200, inflationRate: 2.5 },
    });

    const snapshots = simulateMonthlyV2(
      inputs, 200, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );

    for (const s of snapshots) {
      expect(s.cashLikeEnd).toBeGreaterThanOrEqual(0);
      expect(s.financialInvestableEnd).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * [P6 강화] deficit > 0 AND bufferGap > 0 상황 — 이중 인출 방지 검증
   *
   * 시나리오:
   *   - currentAge = retirementAge = 65 (즉시 은퇴)
   *   - 소득·연금 = 0, 생활비 = 100/월, inflationRate = 0
   *   - 자산: cash=300, bond=100000 (수익률=0)
   *   - buffer = 100 * 6 = 600 (liquidityBufferMonths=6)
   *
   * 수정된 동작 (이진탐색 단조성 fix 이후):
   *   Step 1: drawFromBuckets(deficit=100): cash에서 100 차감 → cash=200
   *   Step 2: topUpCashBuffer(buffer=600): cashLike=200 → bond에서 400 → cash=600, bond=99600
   *
   * 포트폴리오 순 감소 = 100 (생활비만, buffer top-up은 내부 리밸런싱)
   * 이중 인출이면 포트폴리오 감소 > 100
   */
  it('[P6 강화] deficit(100)만 포트폴리오에서 차감되고 buffer top-up은 내부 리밸런싱임을 검증', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 100, inflationRate: 0 },
      status: { currentAge: 65, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 300,    expectedReturn: 0 }, // cashLike=300 < buffer(600)
        deposit:    { amount: 0,      expectedReturn: 0 },
        bond:       { amount: 100000, expectedReturn: 0 }, // 충분한 자산
        stock_kr:   { amount: 0,      expectedReturn: 0 },
        stock_us:   { amount: 0,      expectedReturn: 0 },
        crypto:     { amount: 0,      expectedReturn: 0 },
        realEstate: { amount: 0,      expectedReturn: 0 },
      },
    });

    const fundingPolicy: FundingPolicy = { liquidityBufferMonths: 6 };
    const snapshots = simulateMonthlyV2(inputs, 100, 'keep', fundingPolicy, DEFAULT_LIQUIDATION);
    const m0 = snapshots[0]; // ageYear=65, ageMonthIndex=0

    // 초기 총자산 (수익률 0)
    const initialTotal = 300 + 100000; // cash + bond
    const finalTotal = m0.cashEnd + m0.depositEnd + m0.bondEnd + m0.stockKrEnd + m0.stockUsEnd + m0.cryptoEnd;
    const actualWithdrawal = initialTotal - finalTotal;

    // 포트폴리오 순 감소 = deficit(100)만 (buffer top-up은 bond→cash 내부 이동)
    expect(actualWithdrawal).toBeCloseTo(100, 0);

    // 개별 버킷 검증:
    // Step 1: cash(300) → cash(200) after deficit draw
    // Step 2: bond(100000) → bond(99600), cash(200) → cash(600) after buffer top-up
    expect(m0.cashEnd).toBeCloseTo(600, 0);    // buffer 완전 복원
    expect(m0.bondEnd).toBeCloseTo(99600, 0);  // 400 이동됨 (buffer top-up)

    // shortfall 없음
    expect(m0.shortfallThisMonth).toBe(0);
  });
});

// ─── D. 주택연금 상한 ────────────────────────────────────────────────────────

describe('D. 주택연금 상한 (12억 = 120,000만원)', () => {
  it('15억 주택도 12억 상한 적용으로 12억과 동일한 연금액', () => {
    const result15 = calcHousingAnnuityMonthly(150_000, 65, 2.5, 25);
    const result12 = calcHousingAnnuityMonthly(120_000, 65, 2.5, 25);
    expect(result15).toBeCloseTo(result12, 0);
    expect(result12).toBeGreaterThan(100);
    expect(result12).toBeLessThan(300);
  });
});

// ─── E. 부채상환 타이밍 ─────────────────────────────────────────────────────

describe('E. 부채상환 타이밍', () => {
  it('부채 있는 경우 연간 총 상환액이 대출 규모에 부합해야 함', () => {
    const inputs = makeInputs({
      debts: {
        mortgage: {
          balance: 30000,
          interestRate: 4.0,
          repaymentType: 'equal_payment',
          repaymentYears: 20,
        },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(
      inputs, inputs.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );

    // 2년차 연간 상환액
    const year2 = snapshots.filter(s => s.ageYear === inputs.status.currentAge + 1);
    const totalDebtYear2 = year2.reduce((s, m) => s + m.debtServiceThisMonth, 0);

    // 3억, 4%, 20년 원리금균등 → 월 약 181.9만원 × 12 ≈ 2182만원/년
    expect(totalDebtYear2).toBeGreaterThan(1800);
    expect(totalDebtYear2).toBeLessThan(2500);
  });

  it('부채 없으면 상환액 0', () => {
    const inputs = makeInputs();
    const snapshots = simulateMonthlyV2(
      inputs, inputs.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );
    const totalDebt = snapshots.reduce((s, m) => s + m.debtServiceThisMonth, 0);
    expect(totalDebt).toBe(0);
  });
});

// ─── F. 매각 후 임대비 물가 연동 ─────────────────────────────────────────────

describe('F. 매각 후 임대비 물가 연동', () => {
  it('집 팔고 나서 임대비가 시간이 갈수록 증가해야 함', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 400, inflationRate: 2.5 },
      status: {
        currentAge: 40, annualIncome: 6000, incomeGrowthRate: 2.0,
        annualExpense: 4800, expenseGrowthRate: 2.0,
      },
      assets: {
        cash:       { amount: 100,   expectedReturn: 1.0 },
        deposit:    { amount: 100,   expectedReturn: 2.0 },
        stock_kr:   { amount: 200,   expectedReturn: 6.0 },
        stock_us:   { amount: 200,   expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 50000, expectedReturn: 3.0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 400, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleMonth = snapshots.find(s => s.eventFlags.propertySold);
    if (!saleMonth) return;

    const saleIndex = snapshots.indexOf(saleMonth);
    const saleRental = snapshots[saleIndex + 1]?.rentalCostThisMonth ?? 0;

    const laterIndex = saleIndex + 120;
    if (laterIndex >= snapshots.length) return;
    const laterRental = snapshots[laterIndex].rentalCostThisMonth;

    if (saleRental > 0 && laterRental > 0) {
      expect(laterRental).toBeGreaterThan(saleRental);
    }
  });
});

// ─── 연봉별 시나리오 ──────────────────────────────────────────────────────────

describe('연봉별 시나리오 (고소득일수록 은퇴 자산·지속가능 생활비 더 높아야 함)', () => {
  const incomes = [6000, 8000, 10000, 15000, 20000];

  it('연봉이 높을수록 은퇴 시점 자산이 더 많아야 함', () => {
    const assetsAtRetirement = incomes.map((income) => {
      const inputs = makeInputs({
        status: { currentAge: 40, annualIncome: income, incomeGrowthRate: 2.0, annualExpense: 3600, expenseGrowthRate: 2.0 },
      });
      const snapshots = simulateMonthlyV2(inputs, inputs.goal.targetMonthly, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
      const atRetirement = snapshots.find(s => s.ageYear === 65 && s.ageMonthIndex === 0);
      return atRetirement ? atRetirement.cashLikeEnd + atRetirement.financialInvestableEnd : 0;
    });

    for (let i = 0; i < assetsAtRetirement.length - 1; i++) {
      expect(assetsAtRetirement[i + 1]).toBeGreaterThan(assetsAtRetirement[i]);
    }
  });

  it('연봉이 높을수록 지속가능 월 생활비가 더 높아야 함', () => {
    const sustainables = incomes.map((income) => {
      const inputs = makeInputs({
        status: { currentAge: 40, annualIncome: income, incomeGrowthRate: 2.0, annualExpense: 3600, expenseGrowthRate: 2.0 },
      });
      return findMaxSustainableMonthlyV2(inputs, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    });

    for (let i = 0; i < sustainables.length - 1; i++) {
      expect(sustainables[i + 1]).toBeGreaterThanOrEqual(sustainables[i]);
    }
  });
});

// ─── 금융자산별 시나리오 ──────────────────────────────────────────────────────

describe('금융자산별 시나리오 (자산 많을수록 지속가능 생활비 높아야 함)', () => {
  const financialAssets = [5000, 10000, 30000, 100000];

  it('금융자산이 많을수록 지속가능 월 생활비가 더 높아야 함', () => {
    const sustainables = financialAssets.map((total) => {
      const inputs = makeInputs({
        assets: {
          cash:       { amount: total * 0.1, expectedReturn: 1.0 },
          deposit:    { amount: total * 0.1, expectedReturn: 2.0 },
          stock_kr:   { amount: total * 0.3, expectedReturn: 6.0 },
          stock_us:   { amount: total * 0.5, expectedReturn: 8.0 },
          bond:       { amount: 0,           expectedReturn: 3.5 },
          crypto:     { amount: 0,           expectedReturn: 0   },
          realEstate: { amount: 50000,       expectedReturn: 3.0 },
        },
      });
      return findMaxSustainableMonthlyV2(inputs, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    });

    for (let i = 0; i < sustainables.length - 1; i++) {
      expect(sustainables[i + 1]).toBeGreaterThan(sustainables[i]);
    }
  });
});

// ─── 생활비별 시나리오 ────────────────────────────────────────────────────────

describe('생활비별 시나리오 (높을수록 결과 나빠져야 함)', () => {
  const monthlies = [200, 400, 600];

  it('목표 생활비가 높을수록 자금 부족이 더 일찍 발생하거나 최종 자산이 적어야 함', () => {
    const getResultScore = (monthly: number): number => {
      const inputs = makeInputs({
        goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: monthly, inflationRate: 2.5 },
      });
      const snapshots = simulateMonthlyV2(inputs, monthly, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
      const failureMonth = snapshots.find(s => s.shortfallThisMonth > 0);
      if (failureMonth) {
        // 실패 나이(낮을수록 나쁨)를 점수로 사용
        return failureMonth.ageYear;
      }
      // 실패 없으면 최종 잔고를 점수로 (높을수록 좋음)
      const last = snapshots[snapshots.length - 1];
      return last.cashLikeEnd + last.financialInvestableEnd + 10000; // 실패 없음은 항상 실패보다 높은 점수
    };

    const scores = monthlies.map(getResultScore);
    // 생활비가 낮을수록 점수(지속성)가 높거나 같아야 함
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('생활비가 높을수록 지속가능 vs 목표 gap이 줄거나 부족해야 함', () => {
    const gaps = monthlies.map((monthly) => {
      const inputs = makeInputs({
        goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: monthly, inflationRate: 2.5 },
      });
      const sustainable = findMaxSustainableMonthlyV2(inputs, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
      return sustainable - monthly;
    });

    for (let i = 0; i < gaps.length - 1; i++) {
      expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i + 1]);
    }
  });
});

// ─── 기본 동작 검증 ──────────────────────────────────────────────────────────

describe('기본 동작', () => {
  it('스냅샷 개수가 (lifeExpectancy - currentAge + 1) × 12 이어야 함', () => {
    const inputs = makeInputs();
    const snapshots = simulateMonthlyV2(inputs, inputs.goal.targetMonthly, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    // currentAge 40, lifeExpectancy 90 → 51년 × 12 = 612개
    // [W6] lifeExpectancy 해 전체 12개월 시뮬레이션 (기존 첫 달만 → 전체)
    expect(snapshots.length).toBe(612);
  });

  it('[W6] currentAge=30, lifeExpectancy=90이면 총 732개월이어야 함', () => {
    const inputs = makeInputs({
      status: { currentAge: 30, annualIncome: 6000, incomeGrowthRate: 2.0, annualExpense: 3600, expenseGrowthRate: 2.0 },
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 300, inflationRate: 2.5 },
    });
    const snapshots = simulateMonthlyV2(
      inputs,
      inputs.goal.targetMonthly,
      'keep',
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION,
    );

    expect(snapshots.length).toBe(732);
    expect(snapshots[snapshots.length - 1]?.ageYear).toBe(90);
    expect(snapshots[snapshots.length - 1]?.ageMonthIndex).toBe(11);
  });

  it('[W6] currentAge=64, lifeExpectancy=67이면 총 48개월이어야 함', () => {
    const inputs = makeInputs({
      status: { currentAge: 64, annualIncome: 6000, incomeGrowthRate: 2.0, annualExpense: 3600, expenseGrowthRate: 2.0 },
      goal: { retirementAge: 65, lifeExpectancy: 67, targetMonthly: 300, inflationRate: 2.5 },
    });
    const snapshots = simulateMonthlyV2(
      inputs,
      inputs.goal.targetMonthly,
      'keep',
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION,
    );

    expect(snapshots.length).toBe(48);
    expect(snapshots[snapshots.length - 1]?.ageYear).toBe(67);
    expect(snapshots[snapshots.length - 1]?.ageMonthIndex).toBe(11);
  });

  it('모든 스냅샷의 cashLikeEnd / financialInvestableEnd는 음수가 없어야 함', () => {
    const inputs = makeInputs();
    const snapshots = simulateMonthlyV2(inputs, inputs.goal.targetMonthly, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    for (const s of snapshots) {
      expect(s.cashLikeEnd).toBeGreaterThanOrEqual(0);
      expect(s.financialInvestableEnd).toBeGreaterThanOrEqual(0);
    }
  });

  it('isSustainableV2: 여유 있는 케이스는 true를 반환해야 함', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 50, inflationRate: 2.5 },
    });
    const snapshots = simulateMonthlyV2(inputs, 50, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    expect(isSustainableV2(snapshots)).toBe(true);
  });

  it('isSustainableV2: 자산 없이 지출이 많으면 false를 반환해야 함', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 41, lifeExpectancy: 90, targetMonthly: 1000, inflationRate: 2.5 },
      status: { currentAge: 40, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 100, expectedReturn: 0 },
        deposit:    { amount: 0,   expectedReturn: 0 },
        stock_kr:   { amount: 0,   expectedReturn: 0 },
        stock_us:   { amount: 0,   expectedReturn: 0 },
        bond:       { amount: 0,   expectedReturn: 0 },
        crypto:     { amount: 0,   expectedReturn: 0 },
        realEstate: { amount: 0,   expectedReturn: 0 },
      },
    });
    const snapshots = simulateMonthlyV2(inputs, 1000, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    expect(isSustainableV2(snapshots)).toBe(false);
  });

  it('은퇴 전 incomeThisMonth > 0, 은퇴 후 incomeThisMonth = 0이어야 함', () => {
    const inputs = makeInputs({
      status: { currentAge: 40, annualIncome: 6000, incomeGrowthRate: 2.0, annualExpense: 3600, expenseGrowthRate: 2.0 },
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 300, inflationRate: 2.5 },
    });

    const snapshots = simulateMonthlyV2(inputs, inputs.goal.targetMonthly, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const preRetirement = snapshots.filter(s => s.ageYear < 65 && s.ageYear > 40);
    const postRetirement = snapshots.filter(s => s.ageYear >= 65);

    expect(preRetirement.every(s => s.incomeThisMonth > 0)).toBe(true);
    expect(postRetirement.every(s => s.incomeThisMonth === 0)).toBe(true);
  });
});

// ─── C. V2 Debt Schedule Single Source ──────────────────────────────────────
//
// 검증 목표:
//   1) simulateMonthlyV2에 prebuiltSchedules를 주입하면 내부 재계산과 동일한 결과
//   2) runCalculationV2도 주입된 schedules를 사용해 동일한 결과를 냄
//
// 이 두 테스트를 통해 "주입된 단일 인스턴스" vs "내부 계산 인스턴스"가
// 동일한 debt service 값을 생성함을 확인한다.
// ────────────────────────────────────────────────────────────────────────────

describe('C. V2 debt schedule single source', () => {
  const DEBT_INPUTS = makeInputs({
    debts: {
      mortgage:   { balance: 30000, interestRate: 4.0, repaymentType: 'equal_payment', repaymentYears: 20 },
      creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
  });

  it('simulateMonthlyV2에 prebuiltSchedules 주입 결과 = 내부 계산 결과', () => {
    const debtSchedules = precomputeDebtSchedules(DEBT_INPUTS.debts);

    // 주입된 schedules 사용
    const snapshots1 = simulateMonthlyV2(
      DEBT_INPUTS, DEBT_INPUTS.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION, debtSchedules,
    );
    // 내부에서 재계산 (prebuiltSchedules 미전달)
    const snapshots2 = simulateMonthlyV2(
      DEBT_INPUTS, DEBT_INPUTS.goal.targetMonthly, 'keep',
      DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION,
    );

    // 첫 달 부채 상환액이 동일해야 함
    expect(snapshots1[0].debtServiceThisMonth).toBeGreaterThan(0);
    expect(snapshots1[0].debtServiceThisMonth).toBeCloseTo(snapshots2[0].debtServiceThisMonth, 1);

    // 12달치 모두 동일
    for (let i = 0; i < 12; i++) {
      expect(snapshots1[i].debtServiceThisMonth).toBeCloseTo(snapshots2[i].debtServiceThisMonth, 1);
    }
  });

  it('runCalculationV2에 prebuiltSchedules 주입 결과 = 내부 계산 결과', () => {
    const debtSchedules = precomputeDebtSchedules(DEBT_INPUTS.debts);

    // 주입된 schedules 사용
    const result1 = runCalculationV2(
      DEBT_INPUTS, CALC_FUNDING_POLICY, CALC_LIQUIDATION_POLICY, debtSchedules,
    );
    // 내부에서 재계산
    const result2 = runCalculationV2(
      DEBT_INPUTS, CALC_FUNDING_POLICY, CALC_LIQUIDATION_POLICY,
    );

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();

    // 권장 전략의 첫 달 부채 상환액이 동일해야 함
    const debt1 = result1!.detailYearlyAggregates[0]?.months[0]?.debtServiceThisMonth ?? -1;
    const debt2 = result2!.detailYearlyAggregates[0]?.months[0]?.debtServiceThisMonth ?? -1;

    expect(debt1).toBeGreaterThan(0);
    expect(debt1).toBeCloseTo(debt2, 1);

    // 외부에서 직접 계산한 첫 달 상환액과도 일치해야 함
    const expectedDebt = debtSchedules.mortgage[0]?.payment ?? 0;
    expect(debt1).toBeCloseTo(expectedDebt, 1);
  });

  it('주입된 debtSchedules의 첫 달 상환액이 실제로 0보다 크다', () => {
    const debtSchedules = precomputeDebtSchedules(DEBT_INPUTS.debts);
    // 3억, 4%, 20년 원리금균등 → 월 약 181.9만원
    const firstPayment = debtSchedules.mortgage[0]?.payment ?? 0;
    expect(firstPayment).toBeGreaterThan(150);
    expect(firstPayment).toBeLessThan(220);
  });
});

// ─── [단조성] 이진탐색 역전 버그 회귀 테스트 ────────────────────────────────────

describe('[단조성] 투자자산 증가 → 지속가능 생활비 ≥ 유지 (역전 버그 방지)', () => {
  /**
   * 버그 재현 시나리오: 투자자산이 더 많은데 지속가능 생활비가 오히려 낮게 나오는 역전 현상.
   * 원인: deficit 달에 bufferGap도 drawFromBuckets에 포함시켜 이진탐색 단조성 위반.
   * 수정: deficit만 shortfall로 판정 + topUpCashBuffer를 별도 호출.
   */
  const makeMonotoneInputs = (stock_us_amount: number): PlannerInputs =>
    makeInputs({
      status: { currentAge: 45, annualIncome: 6000, annualExpense: 3600, incomeGrowthRate: 2, expenseGrowthRate: 2 },
      goal: { retirementAge: 65, lifeExpectancy: 85, targetMonthly: 400, inflationRate: 2 },
      assets: {
        cash:       { amount: 0,     expectedReturn: 0 },
        deposit:    { amount: 0,     expectedReturn: 2 },
        stock_kr:   { amount: 3000,  expectedReturn: 6 },
        stock_us:   { amount: stock_us_amount, expectedReturn: 8 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0 },
        realEstate: { amount: 50000, expectedReturn: 2 },
      },
    });

  it('stock_us=6000 지속가능액 ≥ stock_us=60 (해외주식 많을수록 생활비 ↑)', () => {
    const schedules = precomputeDebtSchedules(makeMonotoneInputs(0).debts);
    const result_high = findMaxSustainableMonthlyV2(makeMonotoneInputs(6000), 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION, schedules);
    const result_low  = findMaxSustainableMonthlyV2(makeMonotoneInputs(60),   'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION, schedules);
    expect(result_high).toBeGreaterThanOrEqual(result_low);
  });

  it('stock_kr=5000 지속가능액 ≥ stock_kr=500 (국내주식 많을수록 생활비 ↑)', () => {
    const makeKr = (amount: number) => makeInputs({
      status: { currentAge: 45, annualIncome: 6000, annualExpense: 3600, incomeGrowthRate: 2, expenseGrowthRate: 2 },
      goal: { retirementAge: 65, lifeExpectancy: 85, targetMonthly: 400, inflationRate: 2 },
      assets: {
        cash:       { amount: 0,     expectedReturn: 0 },
        deposit:    { amount: 0,     expectedReturn: 2 },
        stock_kr:   { amount: amount, expectedReturn: 6 },
        stock_us:   { amount: 0,     expectedReturn: 8 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0 },
        realEstate: { amount: 50000, expectedReturn: 2 },
      },
    });
    const schedules = precomputeDebtSchedules(makeKr(0).debts);
    const result_high = findMaxSustainableMonthlyV2(makeKr(5000), 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION, schedules);
    const result_low  = findMaxSustainableMonthlyV2(makeKr(500),  'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION, schedules);
    expect(result_high).toBeGreaterThanOrEqual(result_low);
  });
});

describe('G. 매각 이벤트 메타데이터 및 부동산 부채 추적', () => {
  it('sell 전략 매각 월에 순매각대금 메타데이터가 보존되어야 함', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 65, lifeExpectancy: 90, targetMonthly: 500, inflationRate: 0 },
      status: { currentAge: 65, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 0, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 0,      expectedReturn: 0 },
        deposit:    { amount: 0,      expectedReturn: 0 },
        bond:       { amount: 0,      expectedReturn: 0 },
        stock_kr:   { amount: 0,      expectedReturn: 0 },
        stock_us:   { amount: 0,      expectedReturn: 0 },
        crypto:     { amount: 0,      expectedReturn: 0 },
        realEstate: { amount: 100000, expectedReturn: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 500, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const saleMonth = snapshots.find((s) => s.eventFlags.propertySold);

    expect(saleMonth).toBeDefined();
    expect(saleMonth!.propertySaleGrossProceedsThisMonth).toBeCloseTo(100000, 2);
    expect(saleMonth!.propertySaleDebtSettledThisMonth).toBe(0);
    // 정책표 기준 매각 헤어컷 5% 반영
    expect(saleMonth!.propertySaleNetProceedsThisMonth).toBeCloseTo(95000, 2);
  });

  it('mortgageDebtEnd는 주담대 잔액만 반영해야 함 (신용/기타 대출 제외)', () => {
    const inputs = makeInputs({
      debts: {
        mortgage: {
          balance: 10000,
          interestRate: 4.0,
          repaymentType: 'equal_payment',
          repaymentYears: 10,
        },
        creditLoan: {
          balance: 5000,
          interestRate: 6.0,
          repaymentType: 'equal_payment',
          repaymentYears: 5,
        },
        otherLoan: {
          balance: 3000,
          interestRate: 7.0,
          repaymentType: 'equal_payment',
          repaymentYears: 3,
        },
      },
    });

    const schedules = precomputeDebtSchedules(inputs.debts);
    const snapshots = simulateMonthlyV2(
      inputs,
      inputs.goal.targetMonthly,
      'keep',
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION,
      schedules,
    );

    const firstMonth = snapshots[0];
    const mortgageOnly = schedules.mortgage[0]?.remainingBalance ?? 0;
    const totalDebtBalance =
      (schedules.mortgage[0]?.remainingBalance ?? 0) +
      (schedules.creditLoan[0]?.remainingBalance ?? 0) +
      (schedules.otherLoan[0]?.remainingBalance ?? 0);

    const nonMortgageOnly =
      (schedules.creditLoan[0]?.remainingBalance ?? 0) +
      (schedules.otherLoan[0]?.remainingBalance ?? 0);

    // 주담대만 있을 때: mortgageDebtEnd > 0, nonMortgageDebtEnd = 0
    // 신용/기타대출만 있을 때: mortgageDebtEnd = 0, nonMortgageDebtEnd > 0
    // 둘 다 있을 때: totalDebtEnd = mortgageDebtEnd + nonMortgageDebtEnd
    expect(firstMonth.mortgageDebtEnd).toBeCloseTo(mortgageOnly, 6);
    expect(firstMonth.nonMortgageDebtEnd).toBeCloseTo(nonMortgageOnly, 6);
    expect(firstMonth.totalDebtEnd).toBeCloseTo(totalDebtBalance, 6);
    expect(firstMonth.mortgageDebtEnd).toBeLessThan(totalDebtBalance);
    expect(firstMonth.nonMortgageDebtEnd).toBeGreaterThan(0);
  });

  it('주담대만 있을 때: mortgageDebtEnd > 0, nonMortgageDebtEnd = 0', () => {
    const inputs = makeInputs({
      debts: {
        mortgage:   { balance: 10000, interestRate: 4.0, repaymentType: 'equal_payment',   repaymentYears: 10 },
        creditLoan: { balance: 0,     interestRate: 0,   repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0,     interestRate: 0,   repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });
    const schedules = precomputeDebtSchedules(inputs.debts);
    const snapshots = simulateMonthlyV2(inputs, 200, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION, schedules);
    const first = snapshots[0];
    expect(first.mortgageDebtEnd).toBeGreaterThan(0);
    expect(first.nonMortgageDebtEnd).toBe(0);
    expect(first.totalDebtEnd).toBeCloseTo(first.mortgageDebtEnd, 6);
  });

  it('신용/기타대출만 있을 때: mortgageDebtEnd = 0, nonMortgageDebtEnd > 0', () => {
    const inputs = makeInputs({
      debts: {
        mortgage:   { balance: 0,    interestRate: 0,   repaymentType: 'equal_payment',   repaymentYears: 0 },
        creditLoan: { balance: 3000, interestRate: 6.0, repaymentType: 'equal_payment',   repaymentYears: 5 },
        otherLoan:  { balance: 1000, interestRate: 5.0, repaymentType: 'equal_payment',   repaymentYears: 3 },
      },
    });
    const schedules = precomputeDebtSchedules(inputs.debts);
    const snapshots = simulateMonthlyV2(inputs, 200, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION, schedules);
    const first = snapshots[0];
    expect(first.mortgageDebtEnd).toBe(0);
    expect(first.nonMortgageDebtEnd).toBeGreaterThan(0);
    expect(first.totalDebtEnd).toBeCloseTo(first.nonMortgageDebtEnd, 6);
  });

  // ─── W1: sell 후 mortgageDebtEnd → 0 ──────────────────────────────────────
  //
  // 버그: 집 매각 시 netProceeds = grossProceedsAfterHaircut - remainingMortgage 로
  //       주담대를 일괄 상환함에도, 이후 스냅샷에서 debtSchedules 정적 배열을
  //       그대로 읽어 mortgageDebtEnd > 0이 유지되는 문제.
  //
  // 핵심: 20년 모기지 + 65세 은퇴 시나리오에서는 모기지가 이미 만료돼
  //       우연히 0이 되어 버그를 숨긴다. 버그를 잡으려면 반드시
  //       30년 모기지처럼 매각 시점까지 잔액이 남는 시나리오가 필요하다.
  //
  // 시나리오: currentAge=50, retirementAge=55, lifeExpectancy=70
  //           자산 부족 → 은퇴 직후 집 매각 (totalMonthIndex ≈ 60~72)
  //           30년 모기지 잔액이 남아있는 시점에 매각 발생 → 버그 재현
  //
  // 기대: propertySold 이후 모든 스냅샷의 mortgageDebtEnd === 0
  // ─────────────────────────────────────────────────────────────────────────

  it('[W1] sell 전략: 30년 모기지 보유 중 매각 → 이후 모든 snapshot.mortgageDebtEnd === 0', () => {
    // 자산이 적어 은퇴 직후 집을 팔아야 하는 시나리오
    // 30년 모기지(360개월 스케줄)가 있으므로 매각 시점(totalMonthIndex≈60)에
    // 스케줄 잔액이 남아있어 버그가 재현된다
    const inputs = makeInputs({
      goal: { retirementAge: 55, lifeExpectancy: 70, targetMonthly: 600, inflationRate: 2.5 },
      status: { currentAge: 50, annualIncome: 3000, incomeGrowthRate: 0, annualExpense: 4800, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 200,   expectedReturn: 1.0 },
        deposit:    { amount: 200,   expectedReturn: 2.0 },
        stock_kr:   { amount: 0,     expectedReturn: 6.0 },
        stock_us:   { amount: 0,     expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 50000, expectedReturn: 1.0 },
      },
      debts: {
        mortgage:   { balance: 30000, interestRate: 4.0, repaymentType: 'equal_payment', repaymentYears: 30 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 600, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleIdx = snapshots.findIndex((s) => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0); // 매각이 발생해야 함

    // 매각 시점에 모기지 스케줄 잔액이 실제로 남아있는지 확인 (버그 재현 조건)
    const saleMonth = snapshots[saleIdx];
    expect(saleMonth.ageYear).toBeLessThan(80); // 30년 모기지 만료 전에 팔아야 함

    // 핵심 검증: 매각 이후 모든 스냅샷의 mortgageDebtEnd === 0
    const afterSale = snapshots.slice(saleIdx);
    const nonZero = afterSale.filter((s) => s.mortgageDebtEnd !== 0);
    expect(nonZero).toHaveLength(0);
  });

  it('[W1] keep/secured_loan 전략: 주담대 있으면 mortgageDebtEnd > 0 유지 (W1 영향 없음)', () => {
    const inputs = makeInputs({
      debts: {
        mortgage:   { balance: 20000, interestRate: 4.0, repaymentType: 'equal_payment', repaymentYears: 20 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });

    const keepSnaps = simulateMonthlyV2(inputs, inputs.goal.targetMonthly, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const loanSnaps = simulateMonthlyV2(inputs, inputs.goal.targetMonthly, 'secured_loan', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // keep: 초기에 mortgageDebtEnd > 0 이어야 함
    expect(keepSnaps[0].mortgageDebtEnd).toBeGreaterThan(0);
    // secured_loan: 초기에 mortgageDebtEnd > 0 이어야 함
    expect(loanSnaps[0].mortgageDebtEnd).toBeGreaterThan(0);
  });

  it('[W1] sell 전략: 주담대 없을 때도 매각 이후 mortgageDebtEnd === 0 (기존 동작 유지)', () => {
    const inputs = makeInputs({
      goal: { retirementAge: 55, lifeExpectancy: 70, targetMonthly: 600, inflationRate: 2.5 },
      status: { currentAge: 50, annualIncome: 3000, incomeGrowthRate: 0, annualExpense: 4800, expenseGrowthRate: 0 },
      assets: {
        cash:       { amount: 200,   expectedReturn: 1.0 },
        deposit:    { amount: 200,   expectedReturn: 2.0 },
        stock_kr:   { amount: 0,     expectedReturn: 6.0 },
        stock_us:   { amount: 0,     expectedReturn: 8.0 },
        bond:       { amount: 0,     expectedReturn: 3.5 },
        crypto:     { amount: 0,     expectedReturn: 0   },
        realEstate: { amount: 50000, expectedReturn: 1.0 },
      },
      debts: {
        mortgage:   { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
        otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      },
    });

    const snapshots = simulateMonthlyV2(inputs, 600, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleIdx = snapshots.findIndex((s) => s.eventFlags.propertySold);
    if (saleIdx >= 0) {
      const afterSale = snapshots.slice(saleIdx);
      afterSale.forEach((s) => {
        expect(s.mortgageDebtEnd).toBe(0);
      });
    }
  });
});

// ─── H. W3: YearlyAggregateV2 totalRentalCost ─────────────────────────────────
//
// 버그: aggregateToYearly가 rentalCostThisMonth를 연간 합산하지 않아
//       sell 전략 매각 후 임대비가 연도 집계에서 누락됨.
// 기대: YearlyAggregateV2.totalRentalCost === 해당 연도 월별 rentalCostThisMonth 합계
// ─────────────────────────────────────────────────────────────────────────────

describe('H. W3: YearlyAggregateV2 totalRentalCost 집계', () => {
  // sell 전략 + 매각 후 임대비 발생 시나리오 공통 입력
  const SELL_INPUTS = makeInputs({
    goal: { retirementAge: 55, lifeExpectancy: 70, targetMonthly: 300, inflationRate: 2.5 },
    status: { currentAge: 50, annualIncome: 3000, incomeGrowthRate: 0, annualExpense: 4800, expenseGrowthRate: 0 },
    assets: {
      cash:       { amount: 200,   expectedReturn: 1.0 },
      deposit:    { amount: 200,   expectedReturn: 2.0 },
      stock_kr:   { amount: 0,     expectedReturn: 6.0 },
      stock_us:   { amount: 0,     expectedReturn: 8.0 },
      bond:       { amount: 0,     expectedReturn: 3.5 },
      crypto:     { amount: 0,     expectedReturn: 0   },
      realEstate: { amount: 50000, expectedReturn: 1.0 },
    },
    debts: {
      mortgage:   { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      creditLoan: { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
      otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
  });

  it('[W3-1] sell 전략: 매각 후 연도에 totalRentalCost > 0이어야 함', () => {
    const snapshots = simulateMonthlyV2(SELL_INPUTS, 300, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const yearly = aggregateToYearly(snapshots);

    // 매각이 발생했는지 확인
    const saleMonth = snapshots.find(s => s.eventFlags.propertySold);
    expect(saleMonth).toBeDefined();

    // 매각 이후 연도에 totalRentalCost > 0인 연도가 있어야 함
    const saleAge = saleMonth!.ageYear;
    const afterSaleYears = yearly.filter(y => y.ageYear > saleAge);
    expect(afterSaleYears.length).toBeGreaterThan(0);

    const anyRentalCost = afterSaleYears.some(y => y.totalRentalCost > 0);
    expect(anyRentalCost).toBe(true);
  });

  it('[W3-2] sell 전략: 월별 rentalCostThisMonth 합계 === yearly.totalRentalCost (정확도 검증)', () => {
    const snapshots = simulateMonthlyV2(SELL_INPUTS, 300, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const yearly = aggregateToYearly(snapshots);

    for (const year of yearly) {
      const monthlySum = year.months.reduce((s, m) => s + m.rentalCostThisMonth, 0);
      expect(year.totalRentalCost).toBeCloseTo(monthlySum, 6);
    }
  });

  it('[W3-4] sell 전략: 월세가 발생한 연도의 yearly.totalRentalCost는 0이 아니고 월합과 같다', () => {
    const snapshots = simulateMonthlyV2(SELL_INPUTS, 300, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const yearly = aggregateToYearly(snapshots);

    const yearsWithRent = yearly.filter((year) => year.months.some((m) => m.rentalCostThisMonth > 0));
    expect(yearsWithRent.length).toBeGreaterThan(0);

    yearsWithRent.forEach((year) => {
      const monthlySum = year.months.reduce((sum, m) => sum + m.rentalCostThisMonth, 0);
      expect(year.totalRentalCost).toBeGreaterThan(0);
      expect(year.totalRentalCost).toBeCloseTo(monthlySum, 6);
    });
  });

  it('[W3-3] keep/secured_loan 전략: 임대 없으므로 모든 연도 totalRentalCost === 0', () => {
    const keepSnaps = simulateMonthlyV2(SELL_INPUTS, 300, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const loanSnaps = simulateMonthlyV2(SELL_INPUTS, 300, 'secured_loan', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    for (const year of aggregateToYearly(keepSnaps)) {
      expect(year.totalRentalCost).toBe(0);
    }
    for (const year of aggregateToYearly(loanSnaps)) {
      expect(year.totalRentalCost).toBe(0);
    }
  });
});

describe('H2. YearlyAggregateV2 부채/순자산 정합성', () => {
  const DEBT_AGG_INPUTS = makeInputs({
    goal: { retirementAge: 65, lifeExpectancy: 68, targetMonthly: 300, inflationRate: 2.5 },
    status: { currentAge: 64, annualIncome: 3000, incomeGrowthRate: 0, annualExpense: 3600, expenseGrowthRate: 0 },
    assets: {
      cash:       { amount: 1000,  expectedReturn: 1.0 },
      deposit:    { amount: 1000,  expectedReturn: 2.0 },
      stock_kr:   { amount: 0,     expectedReturn: 6.0 },
      stock_us:   { amount: 0,     expectedReturn: 8.0 },
      bond:       { amount: 0,     expectedReturn: 3.5 },
      crypto:     { amount: 0,     expectedReturn: 0   },
      realEstate: { amount: 50000, expectedReturn: 1.0 },
    },
    debts: {
      mortgage:   { balance: 12000, interestRate: 4.0, repaymentType: 'equal_payment', repaymentYears: 10 },
      creditLoan: { balance: 3000,  interestRate: 6.0, repaymentType: 'equal_payment', repaymentYears: 5 },
      otherLoan:  { balance: 1000,  interestRate: 5.0, repaymentType: 'equal_payment', repaymentYears: 3 },
    },
  });

  it('[W7-1] 연도 집계에서도 totalDebtEnd = mortgageDebtEnd + nonMortgageDebtEnd가 유지되어야 함', () => {
    const snapshots = simulateMonthlyV2(
      DEBT_AGG_INPUTS,
      DEBT_AGG_INPUTS.goal.targetMonthly,
      'keep',
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION,
    );
    const yearly = aggregateToYearly(snapshots);

    yearly.forEach((year) => {
      const lastMonth = year.months[year.months.length - 1];
      expect(year.mortgageDebtEnd).toBeCloseTo(lastMonth.mortgageDebtEnd, 6);
      expect(year.nonMortgageDebtEnd).toBeCloseTo(lastMonth.nonMortgageDebtEnd, 6);
      expect(year.totalDebtEnd).toBeCloseTo(lastMonth.totalDebtEnd, 6);
      expect(year.totalDebtEnd).toBeCloseTo(year.mortgageDebtEnd + year.nonMortgageDebtEnd, 6);
    });
  });

  it('[W7-2] netWorthEnd는 마지막 월 스냅샷 기준 순자산과 같아야 함', () => {
    const snapshots = simulateMonthlyV2(
      DEBT_AGG_INPUTS,
      DEBT_AGG_INPUTS.goal.targetMonthly,
      'keep',
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION,
    );
    const yearly = aggregateToYearly(snapshots);

    yearly.forEach((year) => {
      const lastMonth = year.months[year.months.length - 1];
      const expectedNetWorth =
        lastMonth.cashLikeEnd +
        lastMonth.financialInvestableEnd +
        lastMonth.propertyValueEnd +
        lastMonth.propertySaleProceedsBucketEnd -
        lastMonth.securedLoanBalanceEnd -
        lastMonth.totalDebtEnd;

      expect(year.netWorthEnd).toBeCloseTo(expectedNetWorth, 6);
    });
  });
});

// ─── I. W4: all_debts 모드 이중 상환 방지 ────────────────────────────────────
//
// 버그: propertySold 이후 debtServiceThisMonth는 "전체 - mortgage" 방식이라
//       all_debts 모드에서 매각으로 정산한 신용/기타 대출이 계속 차감됨.
//
// 기대:
//   - all_debts + sell: 매각 이후 debtServiceThisMonth === 0
//   - mortgage_only + sell: 매각 이후 credit/other 납입은 유지, mortgage만 제외
//   - keep / secured_loan: 전략 영향 없음
//
// 구현 메모: getPlannerPolicy를 vi.spyOn으로 mock해 all_debts 경로를 직접 실행.
//            production 코드 변경 없이 두 분기를 모두 테스트 가능.
// ─────────────────────────────────────────────────────────────────────────────

describe('I. W4: all_debts 모드 이중 상환 방지', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 주담대 + 신용대출 동시 보유 시나리오 (매각 전 두 대출 모두 active)
  const DEBT_SELL_INPUTS = makeInputs({
    goal: { retirementAge: 55, lifeExpectancy: 70, targetMonthly: 400, inflationRate: 2.5 },
    status: { currentAge: 50, annualIncome: 3000, incomeGrowthRate: 0, annualExpense: 4800, expenseGrowthRate: 0 },
    assets: {
      cash:       { amount: 200,   expectedReturn: 1.0 },
      deposit:    { amount: 200,   expectedReturn: 2.0 },
      stock_kr:   { amount: 0,     expectedReturn: 6.0 },
      stock_us:   { amount: 0,     expectedReturn: 8.0 },
      bond:       { amount: 0,     expectedReturn: 3.5 },
      crypto:     { amount: 0,     expectedReturn: 0   },
      realEstate: { amount: 50000, expectedReturn: 1.0 },
    },
    debts: {
      // 30년 모기지 — 매각 후에도 스케줄 잔여 있음
      mortgage:   { balance: 20000, interestRate: 4.0, repaymentType: 'equal_payment', repaymentYears: 30 },
      // 5년 신용대출 — 매각 시점에 아직 납입 진행 중
      creditLoan: { balance: 5000, interestRate: 6.0, repaymentType: 'equal_payment', repaymentYears: 5 },
      otherLoan:  { balance: 0, interestRate: 0, repaymentType: 'balloon_payment', repaymentYears: 0 },
    },
  });

  it('[W4-1] sell + all_debts: 매각 이후 debtServiceThisMonth === 0', () => {
    // all_debts 모드: 매각 시 전체 부채 정산 → 이후 월 상환 없어야 함
    const realPolicy = policyModule.getPlannerPolicy();
    vi.spyOn(policyModule, 'getPlannerPolicy').mockReturnValue({
      ...realPolicy,
      property: { ...realPolicy.property, saleDebtSettlementMode: 'all_debts' },
    });

    const snapshots = simulateMonthlyV2(DEBT_SELL_INPUTS, 400, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleIdx = snapshots.findIndex(s => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0);

    // 매각 다음 달부터 debtServiceThisMonth가 0이어야 함
    const afterSale = snapshots.slice(saleIdx + 1);
    expect(afterSale.length).toBeGreaterThan(0);
    const nonZero = afterSale.filter(s => s.debtServiceThisMonth !== 0);
    expect(nonZero).toHaveLength(0);
  });

  it('[W4-2] sell + mortgage_only: 매각 이후 신용대출 납입은 유지, mortgage만 제외', () => {
    // mortgage_only 모드 (현재 기본값): 신용대출은 계속 차감되어야 함
    // getPlannerPolicy mock 없이 기본 동작 사용
    const snapshots = simulateMonthlyV2(DEBT_SELL_INPUTS, 400, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleIdx = snapshots.findIndex(s => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0);

    // 매각 이후 debtServiceThisMonth > 0 이어야 함 (신용대출 납입 계속)
    // (신용대출 5년=60개월, 매각이 충분히 이른 시점이면 납입 잔여분 있음)
    const afterSale = snapshots.slice(saleIdx + 1);
    expect(afterSale.length).toBeGreaterThan(0);

    // 매각 직후 최소 1달은 신용대출 납입이 있어야 함 (스케줄이 남아있는 경우)
    // 매각 month index 확인: 신용대출 60개월 스케줄 내에서 매각이 일어나는지 체크
    const saleMonthIdx = snapshots[saleIdx].ageMonthIndex + (snapshots[saleIdx].ageYear - DEBT_SELL_INPUTS.status.currentAge) * 12;
    if (saleMonthIdx < 60) {
      // 신용대출 스케줄이 남아있는 기간 → debtService > 0
      const nextMonth = afterSale[0];
      expect(nextMonth.debtServiceThisMonth).toBeGreaterThan(0);
    }
  });

  it('[W4-3] keep/secured_loan: all_debts mock에서도 debtService 정상 동작 (propertySold 없음)', () => {
    // keep/secured_loan에서는 propertySold가 false → W4 수정의 영향 없어야 함
    const realPolicy = policyModule.getPlannerPolicy();
    vi.spyOn(policyModule, 'getPlannerPolicy').mockReturnValue({
      ...realPolicy,
      property: { ...realPolicy.property, saleDebtSettlementMode: 'all_debts' },
    });

    const keepSnaps = simulateMonthlyV2(DEBT_SELL_INPUTS, 400, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);
    const loanSnaps = simulateMonthlyV2(DEBT_SELL_INPUTS, 400, 'secured_loan', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // keep/secured_loan: 첫 달 debtService > 0 이어야 함 (부채 있으므로)
    expect(keepSnaps[0].debtServiceThisMonth).toBeGreaterThan(0);
    expect(loanSnaps[0].debtServiceThisMonth).toBeGreaterThan(0);

    // 집 매각 이벤트가 발생하지 않아야 함
    expect(keepSnaps.some(s => s.eventFlags.propertySold)).toBe(false);
  });
});

// ─── J. W5: all_debts 매각 후 nonMortgageDebtEnd 정산 ───────────────────────
//
// 버그(A1b 파생): propertySold + all_debts 이후에도 nonMortgageDebtEnd가
//                 정적 debtSchedules 잔액을 그대로 읽어, 이미 상환된 신용/기타
//                 대출이 스냅샷과 finalNetWorth에 계속 차감됨.
//
// 수정 후 기대:
//   - all_debts + sell: 매각 당월부터 nonMortgageDebtEnd === 0
//   - mortgage_only + sell: 매각 후에도 신용대출 잔액 > 0 유지 (정상 스케줄)
//   - keep / secured_loan: 비매각 전략에서 영향 없음
// ─────────────────────────────────────────────────────────────────────────────

describe('J. W5: all_debts 매각 후 nonMortgageDebtEnd 정산', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 주담대 + 신용대출 + 기타대출 동시 보유 시나리오
  const W5_INPUTS = makeInputs({
    goal: { retirementAge: 55, lifeExpectancy: 70, targetMonthly: 400, inflationRate: 2.5 },
    status: { currentAge: 50, annualIncome: 3000, incomeGrowthRate: 0, annualExpense: 4800, expenseGrowthRate: 0 },
    assets: {
      cash:       { amount: 200,   expectedReturn: 1.0 },
      deposit:    { amount: 200,   expectedReturn: 2.0 },
      stock_kr:   { amount: 0,     expectedReturn: 6.0 },
      stock_us:   { amount: 0,     expectedReturn: 8.0 },
      bond:       { amount: 0,     expectedReturn: 3.5 },
      crypto:     { amount: 0,     expectedReturn: 0   },
      realEstate: { amount: 50000, expectedReturn: 1.0 },
    },
    debts: {
      mortgage:   { balance: 20000, interestRate: 4.0, repaymentType: 'equal_payment',  repaymentYears: 30 },
      creditLoan: { balance: 3000,  interestRate: 6.0, repaymentType: 'equal_payment',  repaymentYears: 5  },
      otherLoan:  { balance: 1000,  interestRate: 5.0, repaymentType: 'equal_payment',  repaymentYears: 3  },
    },
  });

  // 매각이 즉시 발생하도록 설계한 settlement mode 전용 케이스
  // (매각 당월 규칙 검증: 부채잔액/월상환액)
  const SETTLEMENT_MODE_INPUTS = makeInputs({
    goal: { retirementAge: 65, lifeExpectancy: 70, targetMonthly: 700, inflationRate: 2.5 },
    status: { currentAge: 65, annualIncome: 0, incomeGrowthRate: 0, annualExpense: 8400, expenseGrowthRate: 0 },
    assets: {
      cash:       { amount: 0,     expectedReturn: 1.0 },
      deposit:    { amount: 0,     expectedReturn: 2.0 },
      stock_kr:   { amount: 0,     expectedReturn: 6.0 },
      stock_us:   { amount: 0,     expectedReturn: 8.0 },
      bond:       { amount: 0,     expectedReturn: 3.5 },
      crypto:     { amount: 0,     expectedReturn: 0   },
      realEstate: { amount: 50000, expectedReturn: 1.0 },
    },
    debts: {
      mortgage:   { balance: 20000, interestRate: 4.0, repaymentType: 'equal_payment', repaymentYears: 30 },
      creditLoan: { balance: 3000,  interestRate: 6.0, repaymentType: 'equal_payment', repaymentYears: 5 },
      otherLoan:  { balance: 1000,  interestRate: 5.0, repaymentType: 'equal_payment', repaymentYears: 3 },
    },
  });

  it('[W5-1] sell + all_debts: 매각 당월부터 nonMortgageDebtEnd === 0', () => {
    const realPolicy = policyModule.getPlannerPolicy();
    vi.spyOn(policyModule, 'getPlannerPolicy').mockReturnValue({
      ...realPolicy,
      property: { ...realPolicy.property, saleDebtSettlementMode: 'all_debts' },
    });

    const snapshots = simulateMonthlyV2(W5_INPUTS, 400, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleIdx = snapshots.findIndex(s => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0);

    // 매각 직전: 신용·기타 대출 스케줄 잔액 > 0 이어야 함 (매각 이벤트 이전이므로)
    const beforeSale = snapshots[saleIdx - 1];
    if (beforeSale) {
      expect(beforeSale.nonMortgageDebtEnd).toBeGreaterThan(0);
    }

    // 매각 당월부터 nonMortgageDebtEnd === 0
    const fromSale = snapshots.slice(saleIdx);
    expect(fromSale.length).toBeGreaterThan(0);
    const nonZero = fromSale.filter(s => s.nonMortgageDebtEnd !== 0);
    expect(nonZero).toHaveLength(0);
  });

  it('[W5-2] sell + all_debts: 매각 이후 debtServiceThisMonth === 0 (W4와 일관성)', () => {
    const realPolicy = policyModule.getPlannerPolicy();
    vi.spyOn(policyModule, 'getPlannerPolicy').mockReturnValue({
      ...realPolicy,
      property: { ...realPolicy.property, saleDebtSettlementMode: 'all_debts' },
    });

    const snapshots = simulateMonthlyV2(W5_INPUTS, 400, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleIdx = snapshots.findIndex(s => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0);

    const afterSale = snapshots.slice(saleIdx + 1);
    expect(afterSale.length).toBeGreaterThan(0);
    // debtService도 0이어야 함 (W4 검증)
    expect(afterSale.filter(s => s.debtServiceThisMonth !== 0)).toHaveLength(0);
  });

  it('[W5-3] sell + mortgage_only: 매각 후 nonMortgageDebtEnd > 0 유지 (스케줄 살아있음)', () => {
    // mortgage_only(기본값): 신용/기타 대출은 살아있으므로 잔액 > 0 이어야 함
    const snapshots = simulateMonthlyV2(W5_INPUTS, 400, 'sell', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    const saleIdx = snapshots.findIndex(s => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0);

    const saleTotalMonth = (W5_INPUTS.goal.retirementAge - W5_INPUTS.status.currentAge) * 12;
    // creditLoan 5년(60개월), otherLoan 3년(36개월) — 매각이 충분히 이른 시점이면 잔액 > 0
    const saleMonthIndex = snapshots[saleIdx].ageMonthIndex +
      (snapshots[saleIdx].ageYear - W5_INPUTS.status.currentAge) * 12;

    if (saleMonthIndex < 36) {
      // otherLoan도 아직 살아있는 시점 → nonMortgageDebtEnd > 0
      expect(snapshots[saleIdx].nonMortgageDebtEnd).toBeGreaterThan(0);
    }
    // 어떤 경우든 mortgage_only에서는 매각 직후 비담보 대출 잔액이 갑자기 0이 되면 안 됨
    const beforeSale = snapshots[saleIdx - 1];
    if (beforeSale && beforeSale.nonMortgageDebtEnd > 0) {
      expect(snapshots[saleIdx].nonMortgageDebtEnd).toBeGreaterThan(0);
    }
    void saleTotalMonth; // 미사용 경고 방지
  });

  it('[W5-4] keep 전략: 매각 없으므로 nonMortgageDebtEnd가 스케줄 잔액을 정상 반영', () => {
    const realPolicy = policyModule.getPlannerPolicy();
    vi.spyOn(policyModule, 'getPlannerPolicy').mockReturnValue({
      ...realPolicy,
      property: { ...realPolicy.property, saleDebtSettlementMode: 'all_debts' },
    });

    const snapshots = simulateMonthlyV2(W5_INPUTS, 200, 'keep', DEFAULT_FUNDING_POLICY, DEFAULT_LIQUIDATION);

    // keep: 집 매각 없음
    expect(snapshots.some(s => s.eventFlags.propertySold)).toBe(false);

    // 첫 달: 신용·기타 잔액 > 0 이어야 함
    expect(snapshots[0].nonMortgageDebtEnd).toBeGreaterThan(0);

    // 대출 상환 종료 이후 (creditLoan 5년 = 60개월): 잔액 = 0
    const after60 = snapshots.filter(
      s => (s.ageYear - W5_INPUTS.status.currentAge) * 12 + s.ageMonthIndex >= 60,
    );
    if (after60.length > 0) {
      // otherLoan도 3년(36개월)이면 60개월 이후엔 둘 다 0
      expect(after60[0].nonMortgageDebtEnd).toBe(0);
    }
  });

  it('[W5-A] all_debts: 매각 당월부터 mortgage/non-mortgage/totalDebt/debtService 모두 0', () => {
    const realPolicy = policyModule.getPlannerPolicy();
    vi.spyOn(policyModule, 'getPlannerPolicy').mockReturnValue({
      ...realPolicy,
      property: { ...realPolicy.property, saleDebtSettlementMode: 'all_debts' },
    });

    const snapshots = simulateMonthlyV2(
      SETTLEMENT_MODE_INPUTS,
      SETTLEMENT_MODE_INPUTS.goal.targetMonthly,
      'sell',
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION,
    );

    const saleIdx = snapshots.findIndex((s) => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0);

    const fromSale = snapshots.slice(saleIdx);
    expect(fromSale.length).toBeGreaterThan(0);

    fromSale.forEach((s) => {
      expect(s.mortgageDebtEnd).toBe(0);
      expect(s.nonMortgageDebtEnd).toBe(0);
      expect(s.totalDebtEnd).toBe(0);
      expect(s.debtServiceThisMonth).toBe(0);
    });
  });

  it('[W5-B] mortgage_only: 매각 당월부터 주담대 0 + 비주담보 유지 + debtService는 비주담보만', () => {
    // 기본 정책(mortgage_only) 검증
    const snapshots = simulateMonthlyV2(
      SETTLEMENT_MODE_INPUTS,
      SETTLEMENT_MODE_INPUTS.goal.targetMonthly,
      'sell',
      DEFAULT_FUNDING_POLICY,
      DEFAULT_LIQUIDATION,
    );
    const schedules = precomputeDebtSchedules(SETTLEMENT_MODE_INPUTS.debts);

    const saleIdx = snapshots.findIndex((s) => s.eventFlags.propertySold);
    expect(saleIdx).toBeGreaterThanOrEqual(0);

    const saleMonth = snapshots[saleIdx];
    const saleMonthIndex =
      (saleMonth.ageYear - SETTLEMENT_MODE_INPUTS.status.currentAge) * 12 + saleMonth.ageMonthIndex;
    const expectedNonMortgageService =
      (schedules.creditLoan[saleMonthIndex]?.payment ?? 0) +
      (schedules.otherLoan[saleMonthIndex]?.payment ?? 0);

    // 매각 당월: 주담대는 정산 0, 비주담보는 유지
    expect(saleMonth.mortgageDebtEnd).toBe(0);
    expect(saleMonth.nonMortgageDebtEnd).toBeGreaterThan(0);
    expect(saleMonth.totalDebtEnd).toBeCloseTo(saleMonth.nonMortgageDebtEnd, 6);
    expect(saleMonth.debtServiceThisMonth).toBeCloseTo(expectedNonMortgageService, 6);
    expect(saleMonth.debtServiceThisMonth).toBeGreaterThan(0);

    // 매각 이후: totalDebtEnd = mortgageDebtEnd + nonMortgageDebtEnd 불변
    //           mortgage_only에서는 mortgageDebtEnd가 계속 0
    const fromSale = snapshots.slice(saleIdx);
    fromSale.forEach((s) => {
      expect(s.mortgageDebtEnd).toBe(0);
      expect(s.totalDebtEnd).toBeCloseTo(s.mortgageDebtEnd + s.nonMortgageDebtEnd, 6);
      expect(s.totalDebtEnd).toBeCloseTo(s.nonMortgageDebtEnd, 6);
    });
  });
});
