import { describe, expect, it } from 'vitest';
import type { PensionInputs, PublicPensionInput } from '../types/pension';
import {
  annualToEffectiveMonthlyRate,
  annuitize,
  computeNPSReplacement,
  estimatePrivatePension,
  estimatePublicPensionTodayValue,
  estimateRetirementPension,
  getPensionBreakdownAtAge,
  getPensionMonthlyAtRetirementStart,
  getPensionMonthlyBreakdownForMonthIndex,
  getPublicPensionNominalMonthlyAtAge,
  getPublicPensionRealMonthlyAtAge,
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
