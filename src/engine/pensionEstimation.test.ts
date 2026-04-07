/**
 * pensionEstimation.ts 계산 검증 테스트
 *
 * 주요 검증:
 * - 국민연금 기여기간 10년 미만 시 0 반환 (일시금 반환 대상)
 * - 기여기간 10년 이상 시 양수 반환
 * - annuitize / futureValue 수식 검증
 */

import { describe, it, expect } from 'vitest';
import {
  estimatePublicPension,
  annuitize,
  getAnnualPensionIncomeForAge,
  getPensionMonthlyAtRetirementStart,
  futureValueMonthly,
  estimatePrivatePension,
  estimateRetirementPension,
} from './pensionEstimation';
import { estimatePublicPensionWithMeta } from './pensionMeta';
import type { PensionInputs, PrivatePensionInput } from '../types/pension';

// ─── 국민연금 기여기간 경계값 ──────────────────────────────────────────────────

describe('estimatePublicPension — 기여기간 경계값', () => {
  /**
   * 기여기간 = min(60, retirementAge) - workStartAge
   * 10년 미만이면 연금 수령 불가 → 0 반환
   */

  it('기여기간 < 10년: 연금 0 반환 (49세 취업, 55세 은퇴 → 6년)', () => {
    // careerStart=49, contributionEnd=min(60,55)=55 → 6년
    const result = estimatePublicPension(
      6000, // annualNetIncome
      49,   // currentAge
      55,   // retirementAge
      49,   // workStartAge (늦은 취업)
    );
    expect(result).toBe(0);
  });

  it('기여기간 = 9년: 연금 0 반환', () => {
    // careerStart=46, contributionEnd=min(60,55)=55 → 9년
    const result = estimatePublicPension(6000, 46, 55, 46);
    expect(result).toBe(0);
  });

  it('기여기간 = 10년 (경계): 연금 > 0 반환', () => {
    // careerStart=45, contributionEnd=min(60,55)=55 → 10년
    const result = estimatePublicPension(6000, 45, 55, 45);
    expect(result).toBeGreaterThan(0);
  });

  it('기여기간 20년: 연금 > 0 반환', () => {
    // careerStart=26, contributionEnd=min(60,65)=60 → 34년
    const result = estimatePublicPension(6000, 26, 65);
    expect(result).toBeGreaterThan(0);
  });

  it('기여기간이 길수록 연금이 증가 (10년 < 20년 < 30년)', () => {
    // workStartAge를 조정해서 기여기간 제어
    // currentAge=50일 때: contributionEnd = min(60, retirementAge)
    // retirementAge=60 → contributionEnd=60, careerStart = birthYear+workStartAge
    // workStartAge=50 → 기여기간=10년
    // workStartAge=40 → 기여기간=20년
    // workStartAge=30 → 기여기간=30년
    const p10 = estimatePublicPension(6000, 50, 60, 50); // 10년
    const p20 = estimatePublicPension(6000, 50, 60, 40); // 20년
    const p30 = estimatePublicPension(6000, 50, 60, 30); // 30년
    expect(p20).toBeGreaterThan(p10);
    expect(p30).toBeGreaterThan(p20);
  });

  it('estimatePublicPensionWithMeta: 기여기간 < 10년 시 base=0', () => {
    const meta = estimatePublicPensionWithMeta(6000, 49, 55, 49);
    expect(meta.base).toBe(0);
    expect(meta.conservative).toBe(0);
    expect(meta.optimistic).toBe(0);
  });
});

// ─── annuitize 수식 검증 ──────────────────────────────────────────────────────

describe('annuitize — 표준 연금 현가 공식', () => {
  it('잔액 0이면 0 반환', () => {
    expect(annuitize(0, 3.0, 20)).toBe(0);
  });

  it('수령 기간 0이면 0 반환', () => {
    expect(annuitize(10000, 3.0, 0)).toBe(0);
  });

  it('이자율 0일 때: totalBalance / (n×12)', () => {
    const balance = 12000;
    const years = 10;
    const result = annuitize(balance, 0, years);
    expect(result).toBeCloseTo(balance / (years * 12), 2); // 100만원/월
  });

  it('이자율 3%, 잔액 10000, 20년 → 합리적 범위 (40~70만원/월)', () => {
    const result = annuitize(10000, 3.0, 20);
    expect(result).toBeGreaterThan(40);
    expect(result).toBeLessThan(70);
  });

  it('수령 기간 길수록 월 수령액 감소', () => {
    const short = annuitize(10000, 3.0, 10);
    const medium = annuitize(10000, 3.0, 20);
    const long = annuitize(10000, 3.0, 30);
    expect(short).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(long);
  });
});

describe('연금 지급 기간 경계값', () => {
  const pensionFixture: PensionInputs = {
    publicPension: {
      enabled: false,
      mode: 'auto',
      startAge: 65,
      manualMonthlyTodayValue: 0,
      workStartAge: 26,
    },
    retirementPension: {
      enabled: true,
      mode: 'manual',
      startAge: 60,
      payoutYears: 20,
      currentBalance: 0,
      accumulationReturnRate: 3.5,
      payoutReturnRate: 2.0,
      manualMonthlyTodayValue: 100,
    },
    privatePension: {
      enabled: true,
      mode: 'manual',
      startAge: 55,
      payoutYears: 10,
      currentBalance: 0,
      monthlyContribution: 0,
      expectedReturnRate: 3.5,
      accumulationReturnRate: 3.5,
      payoutReturnRate: 3.5,
      manualMonthlyTodayValue: 50,
      detailMode: false,
      products: [],
    },
  };

  it('퇴직연금은 종료 나이에서는 더 이상 지급되지 않아야 함', () => {
    // 60세 시작 + 20년 = 80세 종료(80세부터 미지급)
    const age79Annual = getAnnualPensionIncomeForAge(
      pensionFixture,
      40,
      79,
      0,
      6000,
      60,
    );
    const age80Annual = getAnnualPensionIncomeForAge(
      pensionFixture,
      40,
      80,
      0,
      6000,
      60,
    );
    expect(age79Annual).toBe(1200);
    expect(age80Annual).toBe(0);
  });

  it('은퇴 시점에 이미 종료된 연금은 retirementStart 합계에 포함되지 않아야 함', () => {
    // 은퇴 나이 90세: 퇴직(60~79), 개인(55~64) 모두 종료 상태
    const total = getPensionMonthlyAtRetirementStart(
      pensionFixture,
      40,
      90,
      6000,
      0,
    );
    expect(total).toBe(0);
  });
});

// ─── W7-1: 개인연금 월단위 적립식 전환 ──────────────────────────────────────────

describe('J. W7-1 futureValueMonthly 기본 수식 검증', () => {
  it('J-1: 이자율 0일 때 — pv + monthlyContrib × 개월수', () => {
    // r=0 이면 복리 없이 단순 합산: 100만원/월 × 120개월 = 12000만원
    expect(futureValueMonthly(0, 100, 0, 10)).toBeCloseTo(12000, 0);
  });

  it('J-2: 납입 없을 때 — pv 복리 성장만 반영 (연복리 동치)', () => {
    // montlyContrib=0이면 pv * (1+r)^years 와 동일
    // (1+r_m)^(12*years) = ((1+r)^(1/12))^(12*years) = (1+r)^years
    const expected = 1000 * Math.pow(1.06, 10);
    expect(futureValueMonthly(1000, 0, 6, 10)).toBeCloseTo(expected, 0);
  });

  it('J-3: years <= 0이면 pv 그대로 반환', () => {
    expect(futureValueMonthly(5000, 100, 5, 0)).toBe(5000);
    expect(futureValueMonthly(5000, 100, 5, -1)).toBe(5000);
  });

  it('J-4: 월납 있을 때 — 동일 연납입 금액 기준 연단위보다 크거나 같음', () => {
    // 월50万원 납입 vs 年600万원 납입 — 월납이 더 이른 복리로 결과 더 큼
    // 연단위 근사: annualContrib=600, factor=1.05^25
    const annualFactor = Math.pow(1.05, 25);
    const annualFV = 600 * (annualFactor - 1) / 0.05;
    const monthlyFV = futureValueMonthly(0, 50, 5, 25);
    expect(monthlyFV).toBeGreaterThanOrEqual(annualFV);
  });
});

describe('K. W7-1 estimatePrivatePension 월단위 전환 검증', () => {
  const baseInput: PrivatePensionInput = {
    enabled: true,
    mode: 'auto',
    startAge: 65,
    payoutYears: 20,
    currentBalance: 0,
    monthlyContribution: 50,
    expectedReturnRate: 5,
    accumulationReturnRate: 5,
    payoutReturnRate: 4,
    manualMonthlyTodayValue: 0,
    detailMode: false,
    products: [],
  };

  it('K-1: 25년 적립(40세→65세) 월50만원 5%: 월수령액 합리적 범위 내', () => {
    // futureValueMonthly(0, 50, 5, 25) ≈ 29288万원
    // annuitize(29288, 4, 20) ≈ 177万원/月
    const result = estimatePrivatePension(baseInput, 40);
    expect(result).toBeGreaterThan(170);
    expect(result).toBeLessThan(200);
  });

  it('K-2: 연단위 근사 대비 월단위 결과가 크거나 같음', () => {
    // 연단위 근사 수계산: annualBalance = 600*(1.05^25 - 1)/0.05 = 28636
    const annualFactor = Math.pow(1.05, 25);
    const annualBalance = 600 * (annualFactor - 1) / 0.05;
    const m = 0.04 / 12;
    const n = 240;
    const annualMonthly = Math.round(annualBalance * m / (1 - Math.pow(1 + m, -n)));

    const monthlyResult = estimatePrivatePension(baseInput, 40);
    expect(monthlyResult).toBeGreaterThanOrEqual(annualMonthly);
  });

  it('K-3: 기존 잔고만 있고 납입 없을 때 — 월/연 결과 동일 (PV 복리 동치)', () => {
    // monthlyContrib=0이면 PV 복리만: 월/연 동일 결과
    const pvOnly: PrivatePensionInput = { ...baseInput, monthlyContribution: 0, currentBalance: 10000 };
    const result = estimatePrivatePension(pvOnly, 40);
    // PV * 1.05^25 = 10000 * 3.38635 = 33864
    // annuitize(33864, 4, 20) = 33864 * 0.006060 ≈ 205
    expect(result).toBeGreaterThan(195);
    expect(result).toBeLessThan(220);
  });
});

describe('L. W7-1 manual mode 영향 없음 검증', () => {
  const manualPensionFixture: PensionInputs = {
    publicPension: { enabled: false, mode: 'auto', startAge: 65, manualMonthlyTodayValue: 0 },
    retirementPension: {
      enabled: false,
      mode: 'auto',
      startAge: 60,
      payoutYears: 20,
      currentBalance: 0,
      accumulationReturnRate: 3.5,
      payoutReturnRate: 2,
      manualMonthlyTodayValue: 0,
    },
    privatePension: {
      enabled: true,
      mode: 'manual',
      startAge: 60,
      payoutYears: 20,
      currentBalance: 0,
      monthlyContribution: 50,
      expectedReturnRate: 5,
      accumulationReturnRate: 5,
      payoutReturnRate: 4,
      manualMonthlyTodayValue: 80,
      detailMode: false,
      products: [],
    },
  };

  it('L-1: manual mode에서는 manualMonthlyTodayValue가 그대로 쓰임 (계산식 미사용)', () => {
    // 60세 시작이므로 targetAge=60일 때 수령 중
    // 80만원/월 × (1.02)^20 inflate ≈ 80 × 1.4859 = 118.9만원/월
    const annualIncome = getAnnualPensionIncomeForAge(manualPensionFixture, 40, 60, 2, 6000, 60);
    expect(annualIncome).toBeGreaterThan(0);
    // futureValueMonthly 전환과 무관하게 동일 결과 보장
    expect(annualIncome).toBeGreaterThan(1100);
    expect(annualIncome).toBeLessThan(1600);
  });
});

describe('M. W7-1 detail mode 상품별 월단위 전환 검증', () => {
  const detailFixture: PensionInputs = {
    publicPension: { enabled: false, mode: 'auto', startAge: 65, manualMonthlyTodayValue: 0 },
    retirementPension: {
      enabled: false,
      mode: 'auto',
      startAge: 60,
      payoutYears: 20,
      currentBalance: 0,
      accumulationReturnRate: 3.5,
      payoutReturnRate: 2,
      manualMonthlyTodayValue: 0,
    },
    privatePension: {
      enabled: true,
      mode: 'auto',
      startAge: 65,
      payoutYears: 20,
      currentBalance: 0,
      monthlyContribution: 0,
      expectedReturnRate: 5,
      accumulationReturnRate: 5,
      payoutReturnRate: 4,
      manualMonthlyTodayValue: 0,
      detailMode: true,
      products: [{
        id: 'p1',
        label: '연금저축펀드',
        currentBalance: 0,
        monthlyContribution: 50,
        startAge: 65,
        payoutYears: 20,
        expectedReturnRate: 5,
        accumulationReturnRate: 5,
        payoutReturnRate: 4,
      }],
    },
  };

  it('M-1: detail mode 상품 1개 — 연단위 근사 대비 월단위가 크거나 같음', () => {
    // 연단위 근사 기준 기대값 계산
    const annualFactor = Math.pow(1.05, 25);
    const annualBalance = 600 * (annualFactor - 1) / 0.05;
    const m = 0.04 / 12;
    const n = 240;
    const annualMonthly = Math.round(annualBalance * m / (1 - Math.pow(1 + m, -n)));

    // detail mode → getAnnualPensionIncomeForAge 에서 직접 경로 통과
    const annualIncome = getAnnualPensionIncomeForAge(detailFixture, 40, 65, 0, 6000, 65);
    const monthlyResult = annualIncome / 12;
    expect(monthlyResult).toBeGreaterThanOrEqual(annualMonthly);
  });

  it('M-2: detail mode 상품 1개 — 결과가 합리적 범위 내', () => {
    // ~177만원/月 기대
    const annualIncome = getAnnualPensionIncomeForAge(detailFixture, 40, 65, 0, 6000, 65);
    const monthlyResult = annualIncome / 12;
    expect(monthlyResult).toBeGreaterThan(170);
    expect(monthlyResult).toBeLessThan(200);
  });
});

// ─── W7-2: 퇴직연금 월단위 적립식 전환 ──────────────────────────────────────────

describe('N. W7-2 estimateRetirementPension 월단위 전환 검증', () => {
  // netToGrossRatio = 0.78, RETIREMENT_CONTRIBUTION_RATE = 1/12
  // annualNetIncome=12000 → grossAnnualIncome=12000/0.78≈15384.6
  // 구: annualContrib = 15384.6/12 ≈ 1282.1 (futureValue)
  // 신: monthlyContrib = 15384.6/144 ≈ 106.8 (futureValueMonthly)
  const baseRetInput = {
    enabled: true,
    mode: 'auto' as const,
    startAge: 60,
    payoutYears: 15,
    currentBalance: 5000,
    accumulationReturnRate: 4.5,
    payoutReturnRate: 3.0,
    manualMonthlyTodayValue: 0,
  };

  it('N-1: 월단위 결과가 연단위 근사보다 엄밀히 큼 (25년 4.5%)', () => {
    // 연단위 근사 수계산 (구 모델과 동일 수식)
    // annualContrib = gross/12, futureValue(pv, annualContrib, 4.5, 25)
    const grossAnnualIncome = 12000 / 0.78;
    const annualContrib = grossAnnualIncome / 12;
    const factor = Math.pow(1.045, 25);
    const annualBalance = 5000 * factor + annualContrib * (factor - 1) / 0.045;
    const m = 0.03 / 12;
    const n = 15 * 12;
    const annualMonthly = Math.round(annualBalance * m / (1 - Math.pow(1 + m, -n)));

    // 신 모델은 monthlyContrib=gross/144로 월납, 연단위보다 엄밀히 커야 함
    const monthlyResult = estimateRetirementPension(baseRetInput, 12000, 35, 60);
    expect(monthlyResult).toBeGreaterThan(annualMonthly);
  });

  it('N-2: 25년 4.5% 월단위 결과가 500초과 (연단위 근사 ~498보다 큰 범위)', () => {
    // 구 모델: ~498万원/月, 신 모델: ~507万원/月
    // 500 초과 조건은 구 모델에서 실패, 신 모델에서 통과
    const result = estimateRetirementPension(baseRetInput, 12000, 35, 60);
    expect(result).toBeGreaterThan(500);
    expect(result).toBeLessThan(540);
  });

  it('N-3: 납입 없을 때(pv only) — 월/연 결과 동치', () => {
    // monthlyContrib=0이면 PV 복리만, futureValueMonthly/futureValue 동일 결과
    const pvOnly = { ...baseRetInput, currentBalance: 10000 };
    // annualNetIncome=0 → grossAnnualIncome=0 → monthlyContrib=0
    // balance = 10000 * 1.045^25 = 10000 * 3.00543 = 30054.3
    // annuitize(30054.3, 3, 15) ≈ ?
    const result = estimateRetirementPension(pvOnly, 0, 35, 60);
    const factor = Math.pow(1.045, 25);
    const expectedBalance = 10000 * factor;
    const m = 0.03 / 12;
    const n = 180;
    const expectedMonthly = Math.round(expectedBalance * m / (1 - Math.pow(1 + m, -n)));
    expect(result).toBe(expectedMonthly);
  });

  it('N-4: startAge > retirementAge일 때 추가 성장 구간 반영', () => {
    // startAge=65, retirementAge=60 → 5년 추가 성장 후 annuitize
    const delayedStart = { ...baseRetInput, startAge: 65 };
    const resultDelayed = estimateRetirementPension(delayedStart, 12000, 35, 60);
    const resultImmediate = estimateRetirementPension(baseRetInput, 12000, 35, 60);
    // 5년 더 성장하므로 월수령액이 더 큼
    expect(resultDelayed).toBeGreaterThan(resultImmediate);
  });
});

describe('O. W7-2 퇴직연금 manual mode 영향 없음 검증', () => {
  const manualRetFixture: PensionInputs = {
    publicPension: { enabled: false, mode: 'auto', startAge: 65, manualMonthlyTodayValue: 0 },
    retirementPension: {
      enabled: true,
      mode: 'manual',
      startAge: 60,
      payoutYears: 20,
      currentBalance: 0,
      accumulationReturnRate: 3.5,
      payoutReturnRate: 2,
      manualMonthlyTodayValue: 120,
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
      payoutReturnRate: 3.5,
      manualMonthlyTodayValue: 0,
      detailMode: false,
      products: [],
    },
  };

  it('O-1: manual mode에서는 manualMonthlyTodayValue가 그대로 쓰임 (계산식 미사용)', () => {
    // 60세 시작, 2% 인플레이션: 60세 시점 120 * (1.02)^20 ≈ 178.2万원/月
    const annualIncome = getAnnualPensionIncomeForAge(manualRetFixture, 40, 60, 2, 6000, 60);
    expect(annualIncome).toBeGreaterThan(0);
    // futureValueMonthly 전환과 무관하게 동일 결과 보장
    expect(annualIncome).toBeGreaterThan(1500);
    expect(annualIncome).toBeLessThan(2500);
  });
});
