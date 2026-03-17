import type { PensionInputs, RetirementPensionInput, PrivatePensionInput } from '../types/pension';

// ─── 내부 상수 ────────────────────────────────────────────────────────────────
const DEFAULT_NET_TO_GROSS_RATIO = 0.78;
const ASSUMED_CAREER_START_AGE = 25;
const NPS_MIN_MONTHLY = 40;    // 40만원 (하한)
const NPS_MAX_MONTHLY = 637;   // 637만원 (상한)
const NPS_BASE_REPLACEMENT_RATE_40Y = 0.43;
const RETIREMENT_CONTRIBUTION_RATE = 1 / 12;

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

function futureValue(pv: number, annualContrib: number, annualRatePercent: number, years: number): number {
  if (years <= 0) return pv;
  const r = annualRatePercent / 100;
  if (r === 0) return pv + annualContrib * years;
  const factor = Math.pow(1 + r, years);
  return pv * factor + annualContrib * (factor - 1) / r;
}

export function annuitize(totalBalance: number, annualPayoutRatePercent: number, payoutYears: number): number {
  if (totalBalance <= 0 || payoutYears <= 0) return 0;
  const m = annualPayoutRatePercent / 100 / 12;
  const n = payoutYears * 12;
  if (m === 0) return totalBalance / n;
  return totalBalance * m / (1 - Math.pow(1 + m, -n));
}

// ─── 추정 함수 ────────────────────────────────────────────────────────────────

export function estimatePublicPension(
  annualNetIncome: number,
  _currentAge: number,
  retirementAge: number,
): number {
  const grossAnnualIncome = annualNetIncome / DEFAULT_NET_TO_GROSS_RATIO;
  const grossMonthlyIncome = grossAnnualIncome / 12;
  const pensionableMonthly = Math.min(Math.max(grossMonthlyIncome, NPS_MIN_MONTHLY), NPS_MAX_MONTHLY);
  const contributionEndAge = Math.min(60, retirementAge);
  const contributionYears = Math.min(Math.max(contributionEndAge - ASSUMED_CAREER_START_AGE, 10), 40);
  const replacementRate = NPS_BASE_REPLACEMENT_RATE_40Y * (contributionYears / 40);
  return Math.round(pensionableMonthly * replacementRate);
}

export function estimateRetirementPension(
  p: RetirementPensionInput,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): number {
  const grossAnnualIncome = annualNetIncome / DEFAULT_NET_TO_GROSS_RATIO;
  const annualContrib = grossAnnualIncome * RETIREMENT_CONTRIBUTION_RATE;
  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
  const balanceAtRetirement = futureValue(p.currentBalance, annualContrib, p.accumulationReturnRate, yearsToRetirement);
  const yearsToStart = Math.max(p.startAge - retirementAge, 0);
  const balanceAtStart = balanceAtRetirement * Math.pow(1 + p.accumulationReturnRate / 100, yearsToStart);
  return Math.round(annuitize(balanceAtStart, p.payoutReturnRate, p.payoutYears));
}

export function estimatePrivatePension(
  p: PrivatePensionInput,
  currentAge: number,
): number {
  const yearsToStart = Math.max(p.startAge - currentAge, 0);
  const annualContrib = (p.monthlyContribution || 0) * 12;
  const balance = futureValue(p.currentBalance, annualContrib, p.accumulationReturnRate, yearsToStart);
  return Math.round(annuitize(balance, p.payoutReturnRate, p.payoutYears));
}

// ─── 메타 데이터 (근거·범위) ──────────────────────────────────────────────────

/** 국민연금 자동 추정 + 범위 + 근거 */
export interface PublicPensionEstimate {
  base: number;
  conservative: number;   // base * 0.8
  optimistic: number;     // base * 1.2
  confidenceLevel: 'low' | 'medium' | 'high';
  assumptions: string[];
  pensionableMonthly: number;
  contributionYears: number;
}

export function estimatePublicPensionWithMeta(
  annualNetIncome: number,
  retirementAge: number,
): PublicPensionEstimate {
  const grossAnnualIncome = annualNetIncome / DEFAULT_NET_TO_GROSS_RATIO;
  const grossMonthlyIncome = grossAnnualIncome / 12;
  const pensionableMonthly = Math.min(Math.max(grossMonthlyIncome, NPS_MIN_MONTHLY), NPS_MAX_MONTHLY);
  const contributionEndAge = Math.min(60, retirementAge);
  const contributionYears = Math.min(Math.max(contributionEndAge - ASSUMED_CAREER_START_AGE, 10), 40);
  const replacementRate = NPS_BASE_REPLACEMENT_RATE_40Y * (contributionYears / 40);
  const base = Math.round(pensionableMonthly * replacementRate);
  const conservative = Math.round(base * 0.8);
  const optimistic = Math.round(base * 1.2);

  const assumptions: string[] = [
    `세후 소득을 세전으로 역산했어요 (역산 비율 ${Math.round(DEFAULT_NET_TO_GROSS_RATIO * 100)}%)`,
    `국민연금 가입 시작 나이를 ${ASSUMED_CAREER_START_AGE}세로 가정했어요`,
    `예상 가입기간 ${contributionYears}년 (${ASSUMED_CAREER_START_AGE}세~${contributionEndAge}세)`,
    `기준소득월액 ${pensionableMonthly.toLocaleString('ko-KR')}만원 적용 (상한 ${NPS_MAX_MONTHLY}만원)`,
    `소득대체율 ${Math.round(replacementRate * 100)}% (40년 기준 43%에서 가입기간 비례 적용)`,
  ];

  return { base, conservative, optimistic, confidenceLevel: 'low', assumptions, pensionableMonthly, contributionYears };
}

/** 퇴직연금 자동 추정 근거 */
export interface RetirementPensionMeta {
  assumptions: string[];
  annualContrib: number;
  balanceAtRetirement: number;
  balanceAtStart: number;
}

export function getRetirementPensionMeta(
  p: RetirementPensionInput,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): RetirementPensionMeta {
  const grossAnnualIncome = annualNetIncome / DEFAULT_NET_TO_GROSS_RATIO;
  const annualContrib = grossAnnualIncome * RETIREMENT_CONTRIBUTION_RATE;
  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
  const balanceAtRetirement = futureValue(p.currentBalance, annualContrib, p.accumulationReturnRate, yearsToRetirement);
  const yearsToStart = Math.max(p.startAge - retirementAge, 0);
  const balanceAtStart = balanceAtRetirement * Math.pow(1 + p.accumulationReturnRate / 100, yearsToStart);

  const assumptions: string[] = [
    `연봉의 1/12 (연 ${Math.round(annualContrib).toLocaleString('ko-KR')}만원)가 매년 적립된다고 가정했어요`,
    p.currentBalance > 0
      ? `현재 적립금 ${p.currentBalance.toLocaleString('ko-KR')}만원을 반영했어요`
      : '현재 적립금을 입력하면 더 정확해져요',
    `은퇴 시점 예상 적립금 약 ${Math.round(balanceAtRetirement).toLocaleString('ko-KR')}만원`,
    `개시 시점(${p.startAge}세) 예상 적립금 약 ${Math.round(balanceAtStart).toLocaleString('ko-KR')}만원`,
    `수령 기간 ${p.payoutYears}년 · 수령 수익률 ${p.payoutReturnRate}% 가정`,
  ];

  return { assumptions, annualContrib, balanceAtRetirement, balanceAtStart };
}

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

function resolvePublicMonthly(
  pension: PensionInputs,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): number {
  const p = pension.publicPension;
  if (!p.enabled) return 0;
  if (p.mode === 'manual' && p.manualMonthlyTodayValue > 0) return p.manualMonthlyTodayValue;
  return estimatePublicPension(annualNetIncome, currentAge, retirementAge);
}

function resolveRetirementMonthly(
  pension: PensionInputs,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): number {
  const p = pension.retirementPension;
  if (!p.enabled) return 0;
  if (p.mode === 'manual' && p.manualMonthlyTodayValue > 0) return p.manualMonthlyTodayValue;
  return estimateRetirementPension(p, annualNetIncome, currentAge, retirementAge);
}

function resolvePrivateMonthly(
  pension: PensionInputs,
  currentAge: number,
): number {
  const p = pension.privatePension;
  if (!p.enabled) return 0;
  if (p.mode === 'manual' && p.manualMonthlyTodayValue > 0) return p.manualMonthlyTodayValue;
  return estimatePrivatePension(p, currentAge);
}

// ─── 시뮬레이션 통합 ──────────────────────────────────────────────────────────

export function getAnnualPensionIncomeForAge(
  pension: PensionInputs,
  currentAge: number,
  targetAge: number,
  inflationRate: number,
  annualNetIncome: number,
  retirementAge: number,
): number {
  const inflation = inflationRate / 100;
  let total = 0;

  const pub = pension.publicPension;
  if (pub.enabled && targetAge >= pub.startAge) {
    const monthlyToday = resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge);
    const nominalMonthly = monthlyToday * Math.pow(1 + inflation, targetAge - currentAge);
    total += nominalMonthly * 12;
  }

  const ret = pension.retirementPension;
  const retEndAge = ret.startAge + ret.payoutYears;
  if (ret.enabled && targetAge >= ret.startAge && targetAge < retEndAge) {
    const monthlyToday = resolveRetirementMonthly(pension, annualNetIncome, currentAge, retirementAge);
    const nominalMonthly = monthlyToday * Math.pow(1 + inflation, ret.startAge - currentAge);
    total += nominalMonthly * 12;
  }

  const priv = pension.privatePension;
  const privEndAge = priv.startAge + priv.payoutYears;
  if (priv.enabled && targetAge >= priv.startAge && targetAge < privEndAge) {
    const monthlyToday = resolvePrivateMonthly(pension, currentAge);
    const nominalMonthly = monthlyToday * Math.pow(1 + inflation, priv.startAge - currentAge);
    total += nominalMonthly * 12;
  }

  return total;
}

export function getTotalMonthlyPensionTodayValue(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
): number {
  return (
    resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge) +
    resolveRetirementMonthly(pension, annualNetIncome, currentAge, retirementAge) +
    resolvePrivateMonthly(pension, currentAge)
  );
}

export function getPensionBreakdown(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
): { publicMonthly: number; retirementMonthly: number; privateMonthly: number } {
  return {
    publicMonthly: resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge),
    retirementMonthly: resolveRetirementMonthly(pension, annualNetIncome, currentAge, retirementAge),
    privateMonthly: resolvePrivateMonthly(pension, currentAge),
  };
}

// ─── 타임라인 ─────────────────────────────────────────────────────────────────

export interface PensionEvent {
  age: number;
  pensionType: '국민연금' | '퇴직연금' | '개인연금';
  monthlyTodayValue: number;
  coverageRateBefore: number;  // 이 연금 시작 직전까지의 누적 커버율 (0~1)
  coverageRateAfter: number;   // 이 연금 포함 이후의 누적 커버율 (0~1)
}

/**
 * 연금 개시 이벤트를 나이 순으로 반환 — 결과 패널 타임라인용
 */
export function getPensionTimeline(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  targetMonthly: number,
): PensionEvent[] {
  if (targetMonthly <= 0) return [];

  const events: Omit<PensionEvent, 'coverageRateBefore' | 'coverageRateAfter'>[] = [];

  const pub = pension.publicPension;
  if (pub.enabled) {
    const m = resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge);
    if (m > 0) events.push({ age: pub.startAge, pensionType: '국민연금', monthlyTodayValue: m });
  }

  const ret = pension.retirementPension;
  if (ret.enabled) {
    const m = resolveRetirementMonthly(pension, annualNetIncome, currentAge, retirementAge);
    if (m > 0) events.push({ age: ret.startAge, pensionType: '퇴직연금', monthlyTodayValue: m });
  }

  const priv = pension.privatePension;
  if (priv.enabled) {
    const m = resolvePrivateMonthly(pension, currentAge);
    if (m > 0) events.push({ age: priv.startAge, pensionType: '개인연금', monthlyTodayValue: m });
  }

  events.sort((a, b) => a.age - b.age);

  // 누적 커버율 계산
  let cumulativeMonthly = 0;
  return events.map(ev => {
    const before = cumulativeMonthly / targetMonthly;
    cumulativeMonthly += ev.monthlyTodayValue;
    const after = cumulativeMonthly / targetMonthly;
    return { ...ev, coverageRateBefore: before, coverageRateAfter: after };
  });
}
