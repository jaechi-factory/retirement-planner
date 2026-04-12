import { describe, expect, it } from 'vitest';
import type { PensionInputs, PublicPensionInput } from '../types/pension';
import {
  annualToEffectiveMonthlyRate,
  annuitize,
  clampMonth,
  computeNPSReplacement,
  estimatePrivatePension,
  estimatePublicPensionTodayValue,
  estimateRetirementPension,
  getPensionBreakdown,
  getPensionBreakdownAtAge,
  getPensionMonthlyAtRetirementStart,
  getPensionMonthlyBreakdownForMonthIndex,
  getPublicPensionEstimateDetails,
  getPublicPensionNominalMonthlyAtAge,
  getPublicPensionRealMonthlyAtAge,
  getTotalMonthlyPensionTodayValue,
} from './pensionEstimation';

function makePublicPension(overrides: Partial<PublicPensionInput> = {}): PublicPensionInput {
  return {
    enabled: true,
    mode: 'auto',
    startAge: 65,
    startMonth: 0,
    manualMonthlyTodayValue: 0,
    workStartAge: 20,
    valuationYear: 2026,
    pensionableMonthlyOverride: null,
    payrollReverse: undefined,
    ...overrides,
  };
}

function makePensionInputs(overrides: Partial<PensionInputs> = {}): PensionInputs {
  return {
    publicPension: makePublicPension(),
    retirementPension: {
      enabled: false,
      mode: 'auto',
      startAge: 60,
      startMonth: 0,
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
      startMonth: 0,
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
    ...overrides,
  };
}

describe('A. 국민연금 today-value / nominal / real 분리', () => {
  it('manual today-value 205.615는 95세 명목 약 577.119, today-value는 205.615로 유지된다', () => {
    const pension = makePensionInputs({
      publicPension: makePublicPension({
        mode: 'manual',
        manualMonthlyTodayValue: 205.615,
      }),
    });

    const nominal = getPublicPensionNominalMonthlyAtAge(pension, 65, 95, 3.5, 0, 65);
    const real = getPublicPensionRealMonthlyAtAge(pension, 65, 95, 3.5, 0, 65);

    expect(nominal).toBeCloseTo(577.119, 3);
    expect(real).toBeCloseTo(205.615, 3);
  });

  it('pensionableMonthlyOverride=637, 40년 가입 가정이면 시작 월액이 206만원이어야 한다', () => {
    const result = estimatePublicPensionTodayValue(
      makePublicPension({ pensionableMonthlyOverride: 637 }),
      0,
      20,
      65,
    );

    expect(result).toBe(206);
  });

  it('age breakdown도 nominal과 real을 분리해 유지한다', () => {
    const pension = makePensionInputs({
      publicPension: makePublicPension({
        mode: 'manual',
        manualMonthlyTodayValue: 205.615,
      }),
    });

    const breakdown = getPensionBreakdownAtAge(pension, 65, 95, 3.5, 0, 65);
    expect(breakdown.publicMonthlyNominal).toBeCloseTo(577.119, 3);
    expect(breakdown.publicMonthlyRealTodayValue).toBeCloseTo(205.615, 3);
    expect(breakdown.totalNominal).toBeCloseTo(577.119, 3);
    expect(breakdown.totalRealTodayValue).toBeCloseTo(205.615, 3);
  });
});

describe('B. valuationYear 고정 재현성', () => {
  it('같은 입력과 같은 valuationYear면 결과가 동일하다', () => {
    const publicPension = makePublicPension({ valuationYear: 2026, pensionableMonthlyOverride: 637 });

    expect(estimatePublicPensionTodayValue(publicPension, 0, 20, 65)).toBe(
      estimatePublicPensionTodayValue(publicPension, 0, 20, 65),
    );
  });

  it('valuationYear=2026 vs 2027은 의도적으로 달라질 수 있다', () => {
    const pension2026 = makePublicPension({ valuationYear: 2026, pensionableMonthlyOverride: 5000, workStartAge: 29 });
    const pension2027 = makePublicPension({ valuationYear: 2027, pensionableMonthlyOverride: 5000, workStartAge: 29 });

    const result2026 = estimatePublicPensionTodayValue(pension2026, 0, 30, 60);
    const result2027 = estimatePublicPensionTodayValue(pension2027, 0, 30, 60);

    expect(result2026).not.toBe(result2027);
  });

  it('computeNPSReplacement는 시스템 날짜와 무관하게 valuationYear만 사용한다', () => {
    expect(computeNPSReplacement(2026, 50, 60, 30)).toEqual(computeNPSReplacement(2026, 50, 60, 30));
  });
});

describe('C. 월경계와 연금 개시', () => {
  it('retirementStartMonth=6이면 은퇴 시작월 기준 합계는 그 달부터 계산된다', () => {
    const pension = makePensionInputs({
      publicPension: makePublicPension({ mode: 'manual', manualMonthlyTodayValue: 100, startAge: 60, startMonth: 3 }),
      retirementPension: {
        enabled: true,
        mode: 'manual',
        startAge: 60,
        startMonth: 6,
        payoutYears: 20,
        currentBalance: 0,
        accumulationReturnRate: 3.5,
        payoutReturnRate: 2.0,
        manualMonthlyTodayValue: 80,
      },
      privatePension: {
        enabled: true,
        mode: 'manual',
        startAge: 61,
        startMonth: 0,
        payoutYears: 10,
        currentBalance: 0,
        monthlyContribution: 0,
        expectedReturnRate: 3.5,
        accumulationReturnRate: 3.5,
        payoutReturnRate: 2.0,
        manualMonthlyTodayValue: 70,
        detailMode: false,
        products: [],
      },
    });

    const retirementStart = getPensionMonthlyAtRetirementStart(pension, 59, 60, 0, 3.5, 6);
    expect(retirementStart).toBeCloseTo(180, 6);

    const beforePrivate = getPensionMonthlyBreakdownForMonthIndex(pension, 59, 18, 3.5, 0, 60, 6);
    const afterPrivate = getPensionMonthlyBreakdownForMonthIndex(pension, 59, 24, 3.5, 0, 60, 6);

    expect(beforePrivate.totalRealTodayValue).toBeCloseTo(180, 6);
    expect(afterPrivate.totalRealTodayValue).toBeCloseTo(250, 6);
  });
});

describe('D. annuitize 유효월이율 컨벤션', () => {
  function independentAnnuitize(balance: number, annualRatePercent: number, years: number): number {
    if (balance <= 0 || years <= 0) return 0;
    const m = annualRatePercent === 0 ? 0 : Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;
    const n = years * 12;
    if (m === 0) return balance / n;
    return balance * m / (1 - Math.pow(1 + m, -n));
  }

  for (const rate of [0, 3, 8, 12]) {
    it(`${rate}%에서 독립 수식과 일치한다`, () => {
      expect(annuitize(10000, rate, 20)).toBeCloseTo(independentAnnuitize(10000, rate, 20), 10);
    });
  }

  it('annualToEffectiveMonthlyRate는 3.5%를 월복리 동치로 변환한다', () => {
    expect(annualToEffectiveMonthlyRate(3.5)).toBeCloseTo(Math.pow(1.035, 1 / 12) - 1, 12);
  });
});

describe('E. 기본 auto/manual 경로 회귀', () => {
  it('퇴직연금 auto는 양수 월액을 반환할 수 있다', () => {
    const monthly = estimateRetirementPension(
      {
        enabled: true,
        mode: 'auto',
        startAge: 60,
        startMonth: 0,
        payoutYears: 20,
        currentBalance: 30000,
        accumulationReturnRate: 3.5,
        payoutReturnRate: 2,
        manualMonthlyTodayValue: 0,
      },
      6000,
      40,
      60,
      0,
    );

    expect(monthly).toBeGreaterThan(0);
  });

  it('개인연금 auto는 startMonth를 포함해 양수 월액을 반환할 수 있다', () => {
    const monthly = estimatePrivatePension(
      {
        enabled: true,
        mode: 'auto',
        startAge: 60,
        startMonth: 3,
        payoutYears: 20,
        currentBalance: 10000,
        monthlyContribution: 30,
        expectedReturnRate: 4,
        accumulationReturnRate: 4,
        payoutReturnRate: 3,
        manualMonthlyTodayValue: 0,
        detailMode: false,
        products: [],
      },
      40,
      0,
    );

    expect(monthly).toBeGreaterThan(0);
  });
});

// ── A2: currentAgeMonth propagation tests ─────────────────────────────────────

describe('A2: currentAgeMonth propagation', () => {
  const retirementPensionInput = {
    enabled: true,
    mode: 'auto' as const,
    startAge: 60,
    startMonth: 0,
    payoutYears: 20,
    currentBalance: 30000,
    accumulationReturnRate: 3.5,
    payoutReturnRate: 2,
    manualMonthlyTodayValue: 0,
  };

  describe('estimateRetirementPension produces different results for different currentAgeMonth', () => {
    it('currentAgeMonth=0 returns 392', () => {
      const result = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 0);
      expect(result).toBe(392);
    });

    it('currentAgeMonth=6 returns 383', () => {
      const result = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 6);
      expect(result).toBe(383);
    });

    it('currentAgeMonth=11 returns 377', () => {
      const result = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 11);
      expect(result).toBe(377);
    });

    it('higher currentAgeMonth means fewer accumulation months and lower pension', () => {
      const r0 = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 0);
      const r6 = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 6);
      const r11 = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 11);

      expect(r0).toBeGreaterThan(r6);
      expect(r6).toBeGreaterThan(r11);
    });
  });

  describe('getTotalMonthlyPensionTodayValue passes currentAgeMonth through the chain', () => {
    const pension = makePensionInputs({
      retirementPension: retirementPensionInput,
    });

    it('currentAgeMonth=0 returns ~396.006', () => {
      const result = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 0);
      expect(result).toBeCloseTo(396.006, 2);
    });

    it('currentAgeMonth=6 returns ~394.822', () => {
      const result = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 6);
      expect(result).toBeCloseTo(394.822, 2);
    });

    it('currentAgeMonth=11 returns ~394.537', () => {
      const result = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 11);
      expect(result).toBeCloseTo(394.537, 2);
    });

    it('different currentAgeMonth values produce different totals', () => {
      const t0 = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 0);
      const t6 = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 6);
      const t11 = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 11);

      expect(t0).not.toEqual(t6);
      expect(t6).not.toEqual(t11);
      expect(t0).toBeGreaterThan(t6);
      expect(t6).toBeGreaterThan(t11);
    });
  });

  describe('getPensionBreakdown passes currentAgeMonth through the chain', () => {
    const pension = makePensionInputs({
      retirementPension: retirementPensionInput,
    });

    it('retirementMonthly changes with different currentAgeMonth', () => {
      const b0 = getPensionBreakdown(pension, 40, 60, 6000, 3.5, 0, 0);
      const b6 = getPensionBreakdown(pension, 40, 60, 6000, 3.5, 0, 6);

      expect(b0.retirementMonthly).toBeCloseTo(197.006, 2);
      expect(b6.retirementMonthly).toBeCloseTo(195.822, 2);
      expect(b0.retirementMonthly).toBeGreaterThan(b6.retirementMonthly);
    });
  });
});

// ── B3: NPS cap removal verification ──────────────────────────────────────────

describe('B3: NPS pension cap removal', () => {
  it('high-income case: output equals redistributedMonthly, NOT capped at pensionableMonthly', () => {
    // pensionableMonthlyOverride=50 is low enough that:
    // redistributedMonthly = 0.5 * 0.43 * (319.3511 + 50) = 79.41 > 50
    // Old bug: Math.min(79.41, 50) = 50 (capped)
    // Fixed: 79.41 (uncapped)
    const details = getPublicPensionEstimateDetails(
      makePublicPension({ pensionableMonthlyOverride: 50, workStartAge: 20 }),
      0, // annualNetIncome (not used when override is set)
      20, // currentAge
      65, // retirementAge
    );

    // Expected: 0.5 * 0.43 * (319.3511 + 50) = 79.41048650
    expect(details.todayValueMonthly).toBeCloseTo(79.4105, 3);
    // Must NOT equal pensionableMonthly (which would mean capping)
    expect(details.todayValueMonthly).not.toBe(details.pensionableMonthly);
    // redistributedMonthly exceeds pensionableMonthly
    expect(details.todayValueMonthly).toBeGreaterThan(details.pensionableMonthly);
  });

  it('low-income case: no regression when redistributedMonthly < pensionableMonthly', () => {
    // pensionableMonthlyOverride=200: redistributedMonthly = 0.5 * 0.43 * (319.3511 + 200) = 111.66
    // 111.66 < 200, so the old Math.min(111.66, 200) = 111.66 -- same either way
    const details = getPublicPensionEstimateDetails(
      makePublicPension({ pensionableMonthlyOverride: 200, workStartAge: 20 }),
      0,
      20,
      65,
    );

    // Expected: 0.5 * 0.43 * (319.3511 + 200) = 111.66048650
    expect(details.todayValueMonthly).toBeCloseTo(111.6605, 3);
    expect(details.todayValueMonthly).toBeLessThan(details.pensionableMonthly);
  });

  it('standard case with high income override: redistributedMonthly formula verified', () => {
    // pensionableMonthlyOverride=637 (NPS_MAX_MONTHLY) with 40 years
    // redistributedMonthly = 0.5 * 0.43 * (319.3511 + 637) = 205.625...
    const details = getPublicPensionEstimateDetails(
      makePublicPension({ pensionableMonthlyOverride: 637, workStartAge: 20 }),
      0,
      20,
      65,
    );

    const expectedReplacementRate = 0.43; // all post-2026 for birthYear=2006
    const expectedRedistributed = 0.5 * expectedReplacementRate * (319.3511 + 637);
    expect(details.todayValueMonthly).toBeCloseTo(expectedRedistributed, 3);
    expect(details.replacementRate).toBeCloseTo(expectedReplacementRate, 6);
  });
});

// ── B4-Edge: usePlannerStore passthrough verification ────────────────────────────
//
// usePlannerStore calls getTotalMonthlyPensionTodayValue and getPensionMonthlyAtRetirementStart
// with `status.currentAgeMonth ?? 0`. We verify this fallback pattern works correctly:
// 1. When currentAgeMonth is undefined, ?? 0 fallback produces valid results
// 2. When currentAgeMonth is a valid number, the result differs from month=0
// 3. The store's localStorage migration handles missing currentAgeMonth by defaulting to 0
//
// Direct Zustand store testing is deferred because:
// - Store requires DOM (localStorage), which is not available in vitest without jsdom setup
// - The computation path (buildCompatResult) is internal and not exported
// - These tests verify the exact same function calls the store makes

describe('B4-Edge: usePlannerStore currentAgeMonth passthrough pattern', () => {
  const retirementPensionInput = {
    enabled: true,
    mode: 'auto' as const,
    startAge: 60,
    startMonth: 0,
    payoutYears: 20,
    currentBalance: 30000,
    accumulationReturnRate: 3.5,
    payoutReturnRate: 2,
    manualMonthlyTodayValue: 0,
  };
  const pension = makePensionInputs({ retirementPension: retirementPensionInput });

  it('?? 0 fallback: undefined currentAgeMonth produces same result as explicit 0', () => {
    // Simulates: status.currentAgeMonth ?? 0 where currentAgeMonth is undefined
    const withExplicitZero = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 0);
    const withFallback = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, undefined as unknown as number);

    // clampMonth(undefined) returns 0, so these should be identical
    expect(withFallback).toBeCloseTo(withExplicitZero, 6);
    expect(withFallback).toBeCloseTo(396.006, 2);
  });

  it('store pension computation changes with different currentAgeMonth values', () => {
    // The store calls these exact functions with status.currentAgeMonth ?? 0
    const total0 = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 0);
    const total6 = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 6);

    const atRet0 = getPensionMonthlyAtRetirementStart(pension, 40, 60, 6000, 3.5, 0, 0);
    const atRet6 = getPensionMonthlyAtRetirementStart(pension, 40, 60, 6000, 3.5, 0, 6);

    // Both function results should differ between month 0 and 6
    expect(total0).not.toBe(total6);
    expect(atRet0).not.toBe(atRet6);

    // Concrete values to prevent smoke-test weakness
    expect(total0).toBeCloseTo(396.006, 2);
    expect(total6).toBeCloseTo(394.822, 2);
  });

  it('?? 0 fallback with null currentAgeMonth produces same result as explicit 0', () => {
    // Some migration paths may produce null instead of undefined
    const withNull = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, null as unknown as number);
    const withZero = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 0);

    expect(withNull).toBeCloseTo(withZero, 6);
  });
});

// ── A2-Edge: currentAgeMonth boundary values ────────────────────────────────────

describe('A2-Edge: currentAgeMonth boundary values', () => {
  const retirementPensionInput = {
    enabled: true,
    mode: 'auto' as const,
    startAge: 60,
    startMonth: 0,
    payoutYears: 20,
    currentBalance: 30000,
    accumulationReturnRate: 3.5,
    payoutReturnRate: 2,
    manualMonthlyTodayValue: 0,
  };

  it('currentAgeMonth=11 (December) produces valid, lower pension than month=0', () => {
    const r0 = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 0);
    const r11 = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 11);

    expect(r11).toBe(377);
    expect(r0).toBe(392);
    expect(r0).toBeGreaterThan(r11);
  });

  it('currentAgeMonth=-1 (invalid) is clamped to 0, no NaN or crash', () => {
    const result = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, -1);

    // Should be clamped to 0, so result === month=0
    expect(result).toBe(392);
    expect(Number.isNaN(result)).toBe(false);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('currentAgeMonth=12 (invalid) is clamped to 11, no NaN or crash', () => {
    const result = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, 12);

    // Should be clamped to 11, so result === month=11
    expect(result).toBe(377);
    expect(Number.isNaN(result)).toBe(false);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('currentAgeMonth=NaN is clamped to 0, no crash', () => {
    const result = estimateRetirementPension(retirementPensionInput, 6000, 40, 60, 0, NaN);

    expect(result).toBe(392); // same as month=0
    expect(Number.isNaN(result)).toBe(false);
  });

  it('getTotalMonthlyPensionTodayValue with currentAgeMonth=-1 returns same as month=0', () => {
    const pension = makePensionInputs({ retirementPension: retirementPensionInput });

    const t0 = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, 0);
    const tNeg = getTotalMonthlyPensionTodayValue(pension, 40, 60, 6000, 3.5, 0, -1);

    expect(tNeg).toBeCloseTo(t0, 6);
    expect(Number.isNaN(tNeg)).toBe(false);
  });

  it('getPensionBreakdown with currentAgeMonth=12 returns same as month=11', () => {
    const pension = makePensionInputs({ retirementPension: retirementPensionInput });

    const b11 = getPensionBreakdown(pension, 40, 60, 6000, 3.5, 0, 11);
    const b12 = getPensionBreakdown(pension, 40, 60, 6000, 3.5, 0, 12);

    expect(b12.retirementMonthly).toBeCloseTo(b11.retirementMonthly, 6);
    expect(Number.isNaN(b12.retirementMonthly)).toBe(false);
  });
});

// ── Defensive: clampMonth utility ────────────────────────────────────────────────

describe('Defensive: clampMonth utility', () => {
  it('clamps negative values to 0', () => {
    expect(clampMonth(-1)).toBe(0);
    expect(clampMonth(-100)).toBe(0);
  });

  it('clamps values > 11 to 11', () => {
    expect(clampMonth(12)).toBe(11);
    expect(clampMonth(100)).toBe(11);
  });

  it('returns 0 for NaN', () => {
    expect(clampMonth(NaN)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(clampMonth(undefined)).toBe(0);
  });

  it('floors fractional months', () => {
    expect(clampMonth(6.7)).toBe(6);
    expect(clampMonth(11.9)).toBe(11);
  });

  it('passes valid values through unchanged', () => {
    expect(clampMonth(0)).toBe(0);
    expect(clampMonth(6)).toBe(6);
    expect(clampMonth(11)).toBe(11);
  });
});

// ── B3-Edge: NPS formula edge cases ──────────────────────────────────────────────

describe('B3-Edge: NPS formula edge cases', () => {
  it('contributionYears=10 (minimum threshold) produces non-zero pension', () => {
    // workStartAge=50, currentAge=50, retirementAge=65 -> contributionEndAge = min(60, 65) = 60
    // contributionYears = 60 - 50 = 10
    const result = computeNPSReplacement(2026, 50, 65, 50);

    expect(result.contributionYears).toBe(10);
    expect(result.replacementRate).toBeGreaterThan(0);
    expect(Number.isNaN(result.replacementRate)).toBe(false);
    expect(Number.isFinite(result.replacementRate)).toBe(true);
  });

  it('contributionYears=9 (below threshold) produces zero replacementRate', () => {
    // workStartAge=51, currentAge=51, retirementAge=65 -> contributionEndAge = min(60, 65) = 60
    // contributionYears = 60 - 51 = 9
    const result = computeNPSReplacement(2026, 51, 65, 51);

    expect(result.contributionYears).toBe(9);
    expect(result.replacementRate).toBe(0);
  });

  it('contributionYears=40 (maximum cap) produces valid pension', () => {
    // workStartAge=20, currentAge=20, retirementAge=65 -> contributionEndAge = min(60, 65) = 60
    // contributionYears = 60 - 20 = 40 (capped at 40)
    const result = computeNPSReplacement(2026, 20, 65, 20);

    expect(result.contributionYears).toBe(40);
    expect(result.replacementRate).toBeGreaterThan(0);
    expect(Number.isNaN(result.replacementRate)).toBe(false);
    expect(Number.isFinite(result.replacementRate)).toBe(true);
  });

  it('contributionYears exceeding 40 is capped at 40', () => {
    // workStartAge=15, currentAge=15, retirementAge=65 -> contributionEndAge = min(60, 65) = 60
    // rawTotal = 60 - 15 = 45, capped at 40
    const result = computeNPSReplacement(2026, 15, 65, 15);

    expect(result.contributionYears).toBe(40);
    expect(result.replacementRate).toBeGreaterThan(0);
  });

  it('pensionableMonthly at NPS_MIN_MONTHLY (40) boundary produces valid result', () => {
    const details = getPublicPensionEstimateDetails(
      makePublicPension({ pensionableMonthlyOverride: 40, workStartAge: 20 }),
      0, 20, 65,
    );

    // 0.5 * replacementRate * (319.3511 + 40)
    // replacementRate for birthYear=2006 (all post-2026): 0.43
    // 0.5 * 0.43 * 359.3511 = 77.2604865
    expect(details.todayValueMonthly).toBeCloseTo(77.2605, 2);
    expect(Number.isNaN(details.todayValueMonthly)).toBe(false);
    expect(details.todayValueMonthly).toBeGreaterThan(0);
  });

  it('pensionableMonthly at NPS_MAX_MONTHLY (637) boundary produces valid result', () => {
    const details = getPublicPensionEstimateDetails(
      makePublicPension({ pensionableMonthlyOverride: 637, workStartAge: 20 }),
      0, 20, 65,
    );

    // 0.5 * 0.43 * (319.3511 + 637) = 0.215 * 956.3511 = 205.6154865
    expect(details.todayValueMonthly).toBeCloseTo(205.6155, 2);
    expect(Number.isNaN(details.todayValueMonthly)).toBe(false);
  });

  it('very high pensionableMonthly (10000) produces valid result without NaN or Infinity', () => {
    const details = getPublicPensionEstimateDetails(
      makePublicPension({ pensionableMonthlyOverride: 10000, workStartAge: 20 }),
      0, 20, 65,
    );

    // 0.5 * 0.43 * (319.3511 + 10000) = 0.215 * 10319.3511 = 2218.6604865
    expect(details.todayValueMonthly).toBeCloseTo(2218.6605, 2);
    expect(Number.isFinite(details.todayValueMonthly)).toBe(true);
  });

  it('replacementRate approaching 0 (very short contribution near threshold) returns 0 pension', () => {
    // workStartAge=50, currentAge=50, retirementAge=55 -> contributionEndAge = min(60, 55) = 55
    // contributionYears = 55 - 50 = 5 -> below 10 threshold -> replacementRate = 0
    const result = computeNPSReplacement(2026, 50, 55, 50);

    expect(result.contributionYears).toBe(5);
    expect(result.replacementRate).toBe(0);
  });
});

// ── Defensive: getMonthIndexForAge negative result handling ──────────────────────

describe('Defensive: estimateRetirementPension negative monthIndex guard', () => {
  it('retirementAge < currentAge produces 0 or valid non-negative result, no NaN', () => {
    // currentAge=60, retirementAge=50 -> negative monthIndex, but guarded by Math.max(0, ...)
    const result = estimateRetirementPension(
      {
        enabled: true,
        mode: 'auto' as const,
        startAge: 50,
        startMonth: 0,
        payoutYears: 20,
        currentBalance: 30000,
        accumulationReturnRate: 3.5,
        payoutReturnRate: 2,
        manualMonthlyTodayValue: 0,
      },
      6000, 60, 50, 0, 0,
    );

    expect(Number.isNaN(result)).toBe(false);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ── Defensive: computeNPSReplacement negative contributionYears guard ────────────

describe('Defensive: computeNPSReplacement edge cases', () => {
  it('retirementAge < workStartAge produces 0 contributionYears and 0 replacementRate', () => {
    // workStartAge=30, retirementAge=25 -> contributionEndAge = min(60, 25) = 25
    // careerStartYear > contributionEndYear -> rawPre=0, rawPost=0
    const result = computeNPSReplacement(2026, 50, 25, 30);

    expect(result.contributionYears).toBe(0);
    expect(result.replacementRate).toBe(0);
    expect(Number.isNaN(result.replacementRate)).toBe(false);
  });

  it('currentAge > retirementAge produces valid result without NaN', () => {
    const result = computeNPSReplacement(2026, 70, 65, 20);

    // contributionEndAge = min(60, 65) = 60, career start = 1976+20=1996
    // contributionEnd = 1976+60=2036
    // rawPre = min(2026, 2036) - 1996 = 2026-1996 = 30
    // rawPost = max(2036 - max(2026, 1996), 0) = 2036-2026 = 10
    // total = 40, capped at 40
    expect(result.contributionYears).toBe(40);
    expect(result.replacementRate).toBeGreaterThan(0);
    expect(Number.isNaN(result.replacementRate)).toBe(false);
  });
});
