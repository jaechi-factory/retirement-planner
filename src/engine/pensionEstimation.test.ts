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
} from './pensionEstimation';
import { estimatePublicPensionWithMeta } from './pensionMeta';
import type { PensionInputs } from '../types/pension';

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
