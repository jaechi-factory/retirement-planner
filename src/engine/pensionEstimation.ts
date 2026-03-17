import type { PensionInputs, RetirementPensionInput, PrivatePensionInput } from '../types/pension';

// ─── 내부 상수 ────────────────────────────────────────────────────────────────
const DEFAULT_NET_TO_GROSS_RATIO = 0.78;          // 세후→세전 역산 비율
const ASSUMED_CAREER_START_AGE = 25;              // 국민연금 가입 시작 나이 가정
const NPS_MIN_MONTHLY = 40;                       // 기준소득월액 하한 (만원 = 40만원)
const NPS_MAX_MONTHLY = 637;                      // 기준소득월액 상한 (만원 = 637만원)
const NPS_BASE_REPLACEMENT_RATE_40Y = 0.43;       // 40년 가입 시 소득대체율
const RETIREMENT_CONTRIBUTION_RATE = 1 / 12;     // 퇴직연금 연 적립률 (연봉의 1/12)

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

/**
 * 미래가치 계산 (만원)
 * FV = PV*(1+r)^n + annualContrib * ((1+r)^n - 1) / r
 */
function futureValue(pv: number, annualContrib: number, annualRatePercent: number, years: number): number {
  if (years <= 0) return pv;
  const r = annualRatePercent / 100;
  if (r === 0) return pv + annualContrib * years;
  const factor = Math.pow(1 + r, years);
  return pv * factor + annualContrib * (factor - 1) / r;
}

/**
 * 연금화 — 적립금에서 월 수령액 계산 (만원)
 * PMT = PV * m / (1 - (1+m)^-n)
 */
export function annuitize(totalBalance: number, annualPayoutRatePercent: number, payoutYears: number): number {
  if (totalBalance <= 0 || payoutYears <= 0) return 0;
  const m = annualPayoutRatePercent / 100 / 12;
  const n = payoutYears * 12;
  if (m === 0) return totalBalance / n;
  return totalBalance * m / (1 - Math.pow(1 + m, -n));
}

// ─── 추정 함수 ────────────────────────────────────────────────────────────────

/**
 * 국민연금 월 수령액 자동 추정 (현재가치, 만원)
 * - 세후 소득 → 세전 역산 → 기준소득월액 클램프 → 가입기간 비례 소득대체율
 */
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

/**
 * 퇴직연금 월 수령액 자동 추정 (현재가치, 만원)
 * - 세전 연봉 / 12 를 연간 기여금으로 가정
 * - currentBalance 가 있으면 정확도 상승
 */
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
  // 은퇴 후 연금 개시 전까지 추가 운용
  const yearsToStart = Math.max(p.startAge - retirementAge, 0);
  const balanceAtStart = balanceAtRetirement * Math.pow(1 + p.accumulationReturnRate / 100, yearsToStart);
  return Math.round(annuitize(balanceAtStart, p.payoutReturnRate, p.payoutYears));
}

/**
 * 개인연금 월 수령액 추정 (현재가치, 만원)
 * - 적립금 + 월납입액 → 개시 시점 적립금 → 연금화
 */
export function estimatePrivatePension(
  p: PrivatePensionInput,
  currentAge: number,
): number {
  const yearsToStart = Math.max(p.startAge - currentAge, 0);
  const annualContrib = (p.monthlyContribution || 0) * 12;
  const balance = futureValue(p.currentBalance, annualContrib, p.accumulationReturnRate, yearsToStart);
  return Math.round(annuitize(balance, p.payoutReturnRate, p.payoutYears));
}

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

/** 국민연금 최종 월액 (auto/manual 반영) */
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

/** 퇴직연금 최종 월액 */
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

/** 개인연금 최종 월액 */
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

/**
 * 특정 나이에 받는 연금 연간 수입 (명목가치, 만원)
 * - 국민연금: inflation-indexed (현재가치에서 물가상승률로 성장)
 * - 퇴직/개인연금: not-indexed (개시 시점 명목가치로 고정)
 */
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

  // 국민연금 (inflation-indexed: 수령기간 동안 물가 반영 증가)
  const pub = pension.publicPension;
  if (pub.enabled && targetAge >= pub.startAge) {
    const monthlyToday = resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge);
    const nominalMonthly = monthlyToday * Math.pow(1 + inflation, targetAge - currentAge);
    total += nominalMonthly * 12;
  }

  // 퇴직연금 (not-indexed: 개시 시점 명목가치 고정)
  const ret = pension.retirementPension;
  const retEndAge = ret.startAge + ret.payoutYears;
  if (ret.enabled && targetAge >= ret.startAge && targetAge < retEndAge) {
    const monthlyToday = resolveRetirementMonthly(pension, annualNetIncome, currentAge, retirementAge);
    const nominalMonthly = monthlyToday * Math.pow(1 + inflation, ret.startAge - currentAge);
    total += nominalMonthly * 12;
  }

  // 개인연금 (not-indexed: 개시 시점 명목가치 고정)
  const priv = pension.privatePension;
  const privEndAge = priv.startAge + priv.payoutYears;
  if (priv.enabled && targetAge >= priv.startAge && targetAge < privEndAge) {
    const monthlyToday = resolvePrivateMonthly(pension, currentAge);
    const nominalMonthly = monthlyToday * Math.pow(1 + inflation, priv.startAge - currentAge);
    total += nominalMonthly * 12;
  }

  return total;
}

/**
 * 연금 월 수령액 합계 (현재가치, 만원) — 결과 표시용
 */
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

/**
 * 각 연금 월액을 개별로 반환 — UI 표시용
 */
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
