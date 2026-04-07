import type { PensionInputs, RetirementPensionInput, PrivatePensionInput, PrivatePensionProduct } from '../types/pension';
import { getPlannerPolicy } from '../policy/policyTable';

// ─── 내부 상수 ────────────────────────────────────────────────────────────────
const pensionPolicy = getPlannerPolicy().pension;
const DEFAULT_NET_TO_GROSS_RATIO = pensionPolicy.netToGrossRatio;
const ASSUMED_CAREER_START_AGE = pensionPolicy.assumedCareerStartAge;
const NPS_MIN_MONTHLY = pensionPolicy.npsMinMonthly;    // 40만원 (하한)
const NPS_MAX_MONTHLY = pensionPolicy.npsMaxMonthly;    // 637만원 (상한)
const NPS_PRE_2026_REPLACEMENT_RATE = pensionPolicy.npsPreReformReplacementRate;   // 2026년 개혁 이전 소득대체율
const NPS_POST_2026_REPLACEMENT_RATE = pensionPolicy.npsPostReformReplacementRate; // 2026년 개혁 이후 소득대체율
const NPS_REFORM_YEAR = pensionPolicy.npsReformYear;
const CURRENT_YEAR = new Date().getFullYear();
const RETIREMENT_CONTRIBUTION_RATE = 1 / 12;

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

/** 출생연도 기반 국민연금 수령 개시 나이 (현행법 기준) */
export function getNPSStartAgeByBirthYear(birthYear: number): number {
  if (birthYear >= 1969) return 65;
  if (birthYear >= 1965) return 64;
  if (birthYear >= 1961) return 63;
  if (birthYear >= 1957) return 62;
  if (birthYear >= 1953) return 61;
  return 60;
}

/** 2026년 연금개혁 전/후 기여 기간 분리 기반 소득대체율 계산 */
function computeNPSReplacement(currentAge: number, retirementAge: number, workStartAge: number = ASSUMED_CAREER_START_AGE): {
  pre2026Years: number;
  post2026Years: number;
  contributionYears: number;
  replacementRate: number;
} {
  const birthYear = CURRENT_YEAR - currentAge;
  const careerStartYear = birthYear + workStartAge;
  const contributionEndAge = Math.min(60, retirementAge);
  const contributionEndYear = birthYear + contributionEndAge;

  const rawPre = Math.max(Math.min(NPS_REFORM_YEAR, contributionEndYear) - careerStartYear, 0);
  const rawPost = Math.max(contributionEndYear - Math.max(NPS_REFORM_YEAR, careerStartYear), 0);
  const rawTotal = rawPre + rawPost;

  // 10년 미만이면 연금 수령 불가 (일시금 반환 대상) → replacementRate = 0
  // 상한은 40년 유지 (가입기간 40년 초과분은 연금 산정에 반영되지 않음).
  const contributionYears = Math.min(rawTotal, 40);

  if (rawTotal < 10) {
    return {
      pre2026Years: Math.round(rawPre),
      post2026Years: Math.round(rawPost),
      contributionYears,
      replacementRate: 0,
    };
  }

  const scale = rawTotal > 0 ? contributionYears / rawTotal : 1;
  const replacementRate =
    (rawPre * scale * NPS_PRE_2026_REPLACEMENT_RATE + rawPost * scale * NPS_POST_2026_REPLACEMENT_RATE) / 40;

  return {
    pre2026Years: Math.round(rawPre),
    post2026Years: Math.round(rawPost),
    contributionYears,
    replacementRate,
  };
}

function futureValue(pv: number, annualContrib: number, annualRatePercent: number, years: number): number {
  if (years <= 0) return pv;
  const r = annualRatePercent / 100;
  if (r === 0) return pv + annualContrib * years;
  const factor = Math.pow(1 + r, years);
  return pv * factor + annualContrib * (factor - 1) / r;
}

/**
 * 월단위 적립식 미래가치 — 개인연금 전용
 * 월이율은 연이율의 복리 동치: r_m = (1 + annual/100)^(1/12) - 1
 * PV 복리 팩터는 futureValue와 동일 ((1+r)^years), 차이는 기여금 납입 주기
 */
export function futureValueMonthly(pv: number, monthlyContrib: number, annualRatePercent: number, years: number): number {
  if (years <= 0) return pv;
  const r_m = Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;
  const n_m = years * 12;
  if (r_m === 0) return pv + monthlyContrib * n_m;
  const factor = Math.pow(1 + r_m, n_m); // = (1 + annual/100)^years
  return pv * factor + monthlyContrib * (factor - 1) / r_m;
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
  currentAge: number,
  retirementAge: number,
  workStartAge: number = ASSUMED_CAREER_START_AGE,
): number {
  const grossAnnualIncome = annualNetIncome / DEFAULT_NET_TO_GROSS_RATIO;
  const grossMonthlyIncome = grossAnnualIncome / 12;
  const pensionableMonthly = Math.min(Math.max(grossMonthlyIncome, NPS_MIN_MONTHLY), NPS_MAX_MONTHLY);
  const { replacementRate } = computeNPSReplacement(currentAge, retirementAge, workStartAge);
  return Math.round(pensionableMonthly * replacementRate);
}

export function estimateRetirementPension(
  p: RetirementPensionInput,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): number {
  const grossAnnualIncome = annualNetIncome / DEFAULT_NET_TO_GROSS_RATIO;
  // 퇴직연금 법정 기여율: 연봉의 1/12 → 월납입 = 연봉 / 144
  const monthlyContrib = grossAnnualIncome * RETIREMENT_CONTRIBUTION_RATE / 12;
  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
  const balanceAtRetirement = futureValueMonthly(p.currentBalance, monthlyContrib, p.accumulationReturnRate, yearsToRetirement);
  const yearsToStart = Math.max(p.startAge - retirementAge, 0);
  const balanceAtStart = balanceAtRetirement * Math.pow(1 + p.accumulationReturnRate / 100, yearsToStart);
  return Math.round(annuitize(balanceAtStart, p.payoutReturnRate, p.payoutYears));
}

export function estimatePrivatePension(
  p: PrivatePensionInput,
  currentAge: number,
): number {
  const yearsToStart = Math.max(p.startAge - currentAge, 0);
  const balance = futureValueMonthly(p.currentBalance, p.monthlyContribution || 0, p.accumulationReturnRate, yearsToStart);
  return Math.round(annuitize(balance, p.payoutReturnRate, p.payoutYears));
}

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

/** 국민연금 현재가치 기준 월수령액 (auto/manual 공통) */
function resolvePublicMonthly(
  pension: PensionInputs,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): number {
  const p = pension.publicPension;
  if (!p.enabled) return 0;
  if (p.mode === 'manual' && p.manualMonthlyTodayValue > 0) return p.manualMonthlyTodayValue;
  return estimatePublicPension(annualNetIncome, currentAge, retirementAge, p.workStartAge ?? ASSUMED_CAREER_START_AGE);
}

/**
 * 퇴직연금 시뮬레이션용 월수령액 (명목가치)
 * - manual: today-value 그대로 반환 (호출측에서 inflate)
 * - auto: 미래 명목값으로 반환
 */
function resolveRetirementMonthlyNominal(
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

/**
 * 퇴직연금 비교용 현재가치 월수령액
 * - manual: 입력값 그대로 (이미 현재가치)
 * - auto: 미래 명목값을 물가상승률로 할인
 */
function resolveRetirementMonthlyTodayValue(
  pension: PensionInputs,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
  inflationRate: number,
): number {
  const p = pension.retirementPension;
  if (!p.enabled) return 0;
  if (p.mode === 'manual' && p.manualMonthlyTodayValue > 0) return p.manualMonthlyTodayValue;
  const nominalMonthly = estimateRetirementPension(p, annualNetIncome, currentAge, retirementAge);
  const yearsToStart = Math.max(p.startAge - currentAge, 0);
  return nominalMonthly / Math.pow(1 + inflationRate / 100, yearsToStart);
}

/** 개인연금 상품 목록 기반 합산 명목 월수령액 */
export function estimatePrivatePensionProducts(
  products: PrivatePensionProduct[],
  currentAge: number,
): number {
  return products.reduce((sum, product) => {
    const yearsToStart = Math.max(product.startAge - currentAge, 0);
    const balance = futureValueMonthly(product.currentBalance, product.monthlyContribution || 0, product.accumulationReturnRate, yearsToStart);
    return sum + Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
  }, 0);
}

/**
 * 개인연금 비교용 현재가치 월수령액
 * - manual: 입력값 그대로 (이미 현재가치)
 * - auto: 미래 명목값을 물가상승률로 할인
 */
function resolvePrivateMonthlyTodayValue(
  pension: PensionInputs,
  currentAge: number,
  inflationRate: number,
): number {
  const p = pension.privatePension;
  if (!p.enabled) return 0;
  if (p.mode === 'manual' && p.manualMonthlyTodayValue > 0) return p.manualMonthlyTodayValue;
  if (p.detailMode && p.products.length > 0) {
    return p.products.reduce((sum, product) => {
      const yearsToStart = Math.max(product.startAge - currentAge, 0);
      const balance = futureValueMonthly(product.currentBalance, product.monthlyContribution || 0, product.accumulationReturnRate, yearsToStart);
      const nominalMonthly = Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
      return sum + nominalMonthly / Math.pow(1 + inflationRate / 100, yearsToStart);
    }, 0);
  }
  const nominalMonthly = estimatePrivatePension(p, currentAge);
  const yearsToStart = Math.max(p.startAge - currentAge, 0);
  return nominalMonthly / Math.pow(1 + inflationRate / 100, yearsToStart);
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
  const breakdown = getPensionMonthlyBreakdownForAge(
    pension,
    currentAge,
    targetAge,
    inflationRate,
    annualNetIncome,
    retirementAge,
  );
  return breakdown.total * 12;
}

export function getPensionMonthlyBreakdownForAge(
  pension: PensionInputs,
  currentAge: number,
  targetAge: number,
  inflationRate: number,
  annualNetIncome: number,
  retirementAge: number,
): { publicMonthly: number; retirementMonthly: number; privateMonthly: number; total: number } {
  const inflation = inflationRate / 100;
  let publicMonthly = 0;
  let retirementMonthly = 0;
  let privateMonthly = 0;

  // 국민연금: 물가 연동 — 인플레이션 적용
  const pub = pension.publicPension;
  if (pub.enabled && targetAge >= pub.startAge) {
    const monthlyBase = resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge);
    publicMonthly = monthlyBase * Math.pow(1 + inflation, targetAge - currentAge);
  }

  // 퇴직연금: manual은 현재가치이므로 inflate, auto는 이미 명목값
  const ret = pension.retirementPension;
  const retEndAge = ret.startAge + ret.payoutYears;
  if (ret.enabled && targetAge >= ret.startAge && targetAge < retEndAge) {
    const base = resolveRetirementMonthlyNominal(pension, annualNetIncome, currentAge, retirementAge);
    retirementMonthly = ret.mode === 'manual'
      ? base * Math.pow(1 + inflation, targetAge - currentAge)
      : base;
  }

  // 개인연금: manual은 현재가치이므로 inflate, auto/detail은 이미 명목값
  const priv = pension.privatePension;
  if (priv.enabled) {
    if (priv.mode === 'manual' && priv.manualMonthlyTodayValue > 0) {
      const privEndAge = priv.startAge + priv.payoutYears;
      if (targetAge >= priv.startAge && targetAge < privEndAge) {
        privateMonthly += priv.manualMonthlyTodayValue * Math.pow(1 + inflation, targetAge - currentAge);
      }
    } else if (priv.detailMode && priv.products.length > 0) {
      // 상세 모드: 상품별 명목값 — 인플레이션 미적용
      for (const product of priv.products) {
        const productEndAge = product.startAge + product.payoutYears;
        if (targetAge >= product.startAge && targetAge < productEndAge) {
          const yearsToStart = Math.max(product.startAge - currentAge, 0);
          const balance = futureValueMonthly(product.currentBalance, product.monthlyContribution || 0, product.accumulationReturnRate, yearsToStart);
          privateMonthly += Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
        }
      }
    } else {
      const privEndAge = priv.startAge + priv.payoutYears;
      if (targetAge >= priv.startAge && targetAge < privEndAge) {
        privateMonthly += estimatePrivatePension(priv, currentAge);
      }
    }
  }

  return {
    publicMonthly,
    retirementMonthly,
    privateMonthly,
    total: publicMonthly + retirementMonthly + privateMonthly,
  };
}

/** 연금 전체 합산 — 현재가치 기준 (결과 비교용) */
export function getTotalMonthlyPensionTodayValue(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  inflationRate: number,
): number {
  return (
    resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge) +
    resolveRetirementMonthlyTodayValue(pension, annualNetIncome, currentAge, retirementAge, inflationRate) +
    resolvePrivateMonthlyTodayValue(pension, currentAge, inflationRate)
  );
}

/** 연금 항목별 분해 — 현재가치 기준 (결과 패널 표시용) */
export function getPensionBreakdown(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  inflationRate: number,
): { publicMonthly: number; retirementMonthly: number; privateMonthly: number } {
  return {
    publicMonthly: resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge),
    retirementMonthly: resolveRetirementMonthlyTodayValue(pension, annualNetIncome, currentAge, retirementAge, inflationRate),
    privateMonthly: resolvePrivateMonthlyTodayValue(pension, currentAge, inflationRate),
  };
}

/** 은퇴 직후 시점에 이미 개시된 연금 합계 — 현재가치 기준 (만원/월) */
export function getPensionMonthlyAtRetirementStart(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  inflationRate: number,
): number {
  let total = 0;

  const pub = pension.publicPension;
  if (pub.enabled && pub.startAge <= retirementAge) {
    total += resolvePublicMonthly(pension, annualNetIncome, currentAge, retirementAge);
  }

  const ret = pension.retirementPension;
  const retEndAge = ret.startAge + ret.payoutYears;
  if (ret.enabled && ret.startAge <= retirementAge && retirementAge < retEndAge) {
    total += resolveRetirementMonthlyTodayValue(pension, annualNetIncome, currentAge, retirementAge, inflationRate);
  }

  const priv = pension.privatePension;
  if (priv.enabled) {
    if (priv.detailMode && priv.products.length > 0) {
      // 상세 모드: 은퇴 시점까지 개시된 상품만 합산
      for (const product of priv.products) {
        const productEndAge = product.startAge + product.payoutYears;
        if (product.startAge <= retirementAge && retirementAge < productEndAge) {
          const yearsToStart = Math.max(product.startAge - currentAge, 0);
          const balance = futureValueMonthly(product.currentBalance, product.monthlyContribution || 0, product.accumulationReturnRate, yearsToStart);
          const nominalMonthly = Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
          total += nominalMonthly / Math.pow(1 + inflationRate / 100, yearsToStart);
        }
      }
    } else {
      const privEndAge = priv.startAge + priv.payoutYears;
      if (priv.startAge <= retirementAge && retirementAge < privEndAge) {
        total += resolvePrivateMonthlyTodayValue(pension, currentAge, inflationRate);
      }
    }
  }

  return total;
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
 * 연금 개시 이벤트를 나이 순으로 반환 — 결과 패널 타임라인용 (현재가치 기준)
 */
export function getPensionTimeline(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  targetMonthly: number,
  inflationRate: number,
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
    const m = resolveRetirementMonthlyTodayValue(pension, annualNetIncome, currentAge, retirementAge, inflationRate);
    if (m > 0) events.push({ age: ret.startAge, pensionType: '퇴직연금', monthlyTodayValue: m });
  }

  const priv = pension.privatePension;
  if (priv.enabled) {
    if (priv.detailMode && priv.products.length > 0) {
      // 상세 모드: 상품별로 별도 이벤트 생성
      for (const product of priv.products) {
        const yearsToStart = Math.max(product.startAge - currentAge, 0);
        const balance = futureValueMonthly(product.currentBalance, product.monthlyContribution || 0, product.accumulationReturnRate, yearsToStart);
        const nominalMonthly = Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
        const todayValue = nominalMonthly / Math.pow(1 + inflationRate / 100, yearsToStart);
        if (todayValue > 0) {
          events.push({ age: product.startAge, pensionType: '개인연금', monthlyTodayValue: todayValue });
        }
      }
    } else {
      const m = resolvePrivateMonthlyTodayValue(pension, currentAge, inflationRate);
      if (m > 0) events.push({ age: priv.startAge, pensionType: '개인연금', monthlyTodayValue: m });
    }
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
