import type {
  PensionInputs,
  PrivatePensionInput,
  PrivatePensionProduct,
  PublicPensionInput,
  RetirementPensionInput,
} from '../types/pension';
import { getPlannerPolicy } from '../policy/policyTable';
import {
  estimateGrossAnnualFromNetAnnual,
  resolvePayrollReverseContext,
} from './payrollReverse';

const pensionPolicy = getPlannerPolicy().pension;
const ASSUMED_CAREER_START_AGE = pensionPolicy.assumedCareerStartAge;
const NPS_MIN_MONTHLY = pensionPolicy.npsMinMonthly;
const NPS_MAX_MONTHLY = pensionPolicy.npsMaxMonthly;
const NPS_AVERAGE_MONTHLY_INCOME = pensionPolicy.npsAverageMonthlyIncomeValue;
const NPS_PRE_2026_REPLACEMENT_RATE = pensionPolicy.npsPreReformReplacementRate;
const NPS_POST_2026_REPLACEMENT_RATE = pensionPolicy.npsPostReformReplacementRate;
const NPS_REFORM_YEAR = pensionPolicy.npsReformYear;
const RETIREMENT_CONTRIBUTION_RATE = 1 / 12;
const publicEstimateCache = new Map<string, PublicPensionEstimateDetails>();
const retirementNominalCache = new Map<string, number>();
const retirementStartTodayCache = new Map<string, number>();
const privateNominalCache = new Map<string, number>();
const privateStartTodayCache = new Map<string, number>();

export interface PensionBreakdownAtAge {
  publicMonthlyNominal: number;
  publicMonthlyRealTodayValue: number;
  retirementMonthlyNominal: number;
  retirementMonthlyRealTodayValue: number;
  privateMonthlyNominal: number;
  privateMonthlyRealTodayValue: number;
  totalNominal: number;
  totalRealTodayValue: number;
}

export interface PublicPensionEstimateDetails {
  todayValueMonthly: number;
  valuationYear: number;
  pensionableMonthly: number;
  grossMonthly: number;
  contributionYears: number;
  pre2026Years: number;
  post2026Years: number;
  replacementRate: number;
  assumptions: string[];
  taxTableVersion?: string;
}

function getPolicyEffectiveYear(): number {
  return Number.parseInt(getPlannerPolicy().effectiveDate.slice(0, 4), 10);
}

function getDefaultValuationYear(publicPension: PublicPensionInput): number {
  return publicPension.valuationYear ?? getPolicyEffectiveYear();
}

function monthInflationFactor(monthIndex: number, annualInflationRatePercent: number): number {
  return Math.pow(1 + annualToEffectiveMonthlyRate(annualInflationRatePercent), Math.max(0, monthIndex));
}

function getMonthIndexForAge(
  currentAge: number,
  targetAge: number,
  currentAgeMonth = 0,
  targetAgeMonth = 0,
): number {
  return (targetAge - currentAge) * 12 + targetAgeMonth - currentAgeMonth;
}

function isWithinPayoutWindow(monthIndex: number, startMonthIndex: number, payoutYears: number): boolean {
  if (monthIndex < startMonthIndex) return false;
  return monthIndex < startMonthIndex + payoutYears * 12;
}

export function getPublicPensionEstimateDetails(
  publicPension: PublicPensionInput,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): PublicPensionEstimateDetails {
  const cacheKey = JSON.stringify([publicPension, annualNetIncome, currentAge, retirementAge]);
  const cached = publicEstimateCache.get(cacheKey);
  if (cached) return cached;

  if (!publicPension.enabled) {
    const zero = {
      todayValueMonthly: 0,
      valuationYear: getDefaultValuationYear(publicPension),
      pensionableMonthly: 0,
      grossMonthly: 0,
      contributionYears: 0,
      pre2026Years: 0,
      post2026Years: 0,
      replacementRate: 0,
      assumptions: [],
    };
    publicEstimateCache.set(cacheKey, zero);
    return zero;
  }

  if (publicPension.mode === 'manual' && publicPension.manualMonthlyTodayValue > 0) {
    const manual = {
      todayValueMonthly: publicPension.manualMonthlyTodayValue,
      valuationYear: getDefaultValuationYear(publicPension),
      pensionableMonthly: 0,
      grossMonthly: 0,
      contributionYears: 0,
      pre2026Years: 0,
      post2026Years: 0,
      replacementRate: 0,
      assumptions: ['직접 입력한 국민연금 현재가치 월액을 사용했어요.'],
    };
    publicEstimateCache.set(cacheKey, manual);
    return manual;
  }

  const valuationYear = getDefaultValuationYear(publicPension);
  const workStartAge = publicPension.workStartAge ?? ASSUMED_CAREER_START_AGE;
  const reverseCtx = resolvePayrollReverseContext(publicPension.payrollReverse, valuationYear);
  const grossFromNet = estimateGrossAnnualFromNetAnnual(annualNetIncome, reverseCtx);
  const unclampedPensionableMonthly = publicPension.pensionableMonthlyOverride ?? grossFromNet.grossMonthly;
  const pensionableMonthly = publicPension.pensionableMonthlyOverride != null
    ? unclampedPensionableMonthly
    : Math.min(Math.max(unclampedPensionableMonthly, NPS_MIN_MONTHLY), NPS_MAX_MONTHLY);

  const replacement = computeNPSReplacement(
    valuationYear,
    currentAge,
    retirementAge,
    workStartAge,
  );

  if (replacement.contributionYears < 10 || replacement.replacementRate <= 0) {
    const insufficient = {
      todayValueMonthly: 0,
      valuationYear,
      pensionableMonthly,
      grossMonthly: grossFromNet.grossMonthly,
      contributionYears: replacement.contributionYears,
      pre2026Years: replacement.pre2026Years,
      post2026Years: replacement.post2026Years,
      replacementRate: replacement.replacementRate,
      assumptions: [
        ...((grossFromNet.assumptions ?? [])),
        '국민연금 가입기간이 10년 미만이면 노령연금 월액은 0으로 계산했어요.',
      ],
      taxTableVersion: grossFromNet.taxTableVersion,
    };
    publicEstimateCache.set(cacheKey, insufficient);
    return insufficient;
  }

  const redistributedMonthly =
    0.5 * replacement.replacementRate * (NPS_AVERAGE_MONTHLY_INCOME + pensionableMonthly);
  const todayValueMonthly = Math.min(redistributedMonthly, pensionableMonthly);

  const result = {
    todayValueMonthly,
    valuationYear,
    pensionableMonthly,
    grossMonthly: grossFromNet.grossMonthly,
    contributionYears: replacement.contributionYears,
    pre2026Years: replacement.pre2026Years,
    post2026Years: replacement.post2026Years,
    replacementRate: replacement.replacementRate,
    assumptions: [
      ...((grossFromNet.assumptions ?? [])),
      ...(publicPension.pensionableMonthlyOverride != null
        ? ['국민연금 기준소득월액 override를 그대로 사용했어요.']
        : ['세후 연소득을 급여 공제 역산 후 국민연금 기준소득월액으로 사용했어요.']),
    ],
    taxTableVersion: grossFromNet.taxTableVersion,
  };
  publicEstimateCache.set(cacheKey, result);
  return result;
}

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
export function computeNPSReplacement(
  valuationYear: number,
  currentAge: number,
  retirementAge: number,
  workStartAge: number = ASSUMED_CAREER_START_AGE,
): {
  pre2026Years: number;
  post2026Years: number;
  contributionYears: number;
  replacementRate: number;
} {
  const birthYear = valuationYear - currentAge;
  const careerStartYear = birthYear + workStartAge;
  const contributionEndAge = Math.min(60, retirementAge);
  const contributionEndYear = birthYear + contributionEndAge;

  const rawPre = Math.max(Math.min(NPS_REFORM_YEAR, contributionEndYear) - careerStartYear, 0);
  const rawPost = Math.max(contributionEndYear - Math.max(NPS_REFORM_YEAR, careerStartYear), 0);
  const rawTotal = rawPre + rawPost;
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

export function annualToEffectiveMonthlyRate(annualRatePercent: number): number {
  if (annualRatePercent === 0) return 0;
  return Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;
}

/** 월단위 적립식 미래가치 — 개인연금·퇴직연금 공용 */
export function futureValueMonthly(pv: number, monthlyContrib: number, annualRatePercent: number, years: number): number {
  if (years <= 0) return pv;
  const monthlyRate = annualToEffectiveMonthlyRate(annualRatePercent);
  const months = years * 12;
  if (monthlyRate === 0) return pv + monthlyContrib * months;
  const factor = Math.pow(1 + monthlyRate, months);
  return pv * factor + monthlyContrib * (factor - 1) / monthlyRate;
}

function futureValueByMonths(pv: number, monthlyContrib: number, annualRatePercent: number, months: number): number {
  if (months <= 0) return pv;
  const monthlyRate = annualToEffectiveMonthlyRate(annualRatePercent);
  if (monthlyRate === 0) return pv + monthlyContrib * months;
  const factor = Math.pow(1 + monthlyRate, months);
  return pv * factor + monthlyContrib * (factor - 1) / monthlyRate;
}

export function annuitize(totalBalance: number, annualPayoutRatePercent: number, payoutYears: number): number {
  if (totalBalance <= 0 || payoutYears <= 0) return 0;
  const monthlyRate = annualToEffectiveMonthlyRate(annualPayoutRatePercent);
  const months = payoutYears * 12;
  if (monthlyRate === 0) return totalBalance / months;
  return totalBalance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

export function estimatePublicPensionTodayValue(
  publicPension: PublicPensionInput,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): number {
  return Math.round(
    getPublicPensionEstimateDetails(publicPension, annualNetIncome, currentAge, retirementAge).todayValueMonthly,
  );
}

export function estimateRetirementPension(
  p: RetirementPensionInput,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
  retirementStartMonth = 0,
): number {
  const cacheKey = JSON.stringify([p, annualNetIncome, currentAge, retirementAge, retirementStartMonth]);
  const cached = retirementNominalCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const retirementMonthIndex = Math.max(0, getMonthIndexForAge(currentAge, retirementAge, 0, retirementStartMonth));
  const startMonthIndex = Math.max(0, getMonthIndexForAge(currentAge, p.startAge, 0, p.startMonth ?? 0));
  const grossFromNet = estimateGrossAnnualFromNetAnnual(
    annualNetIncome,
    resolvePayrollReverseContext(undefined, getPolicyEffectiveYear()),
  );
  const monthlyContrib = grossFromNet.grossMonthly * RETIREMENT_CONTRIBUTION_RATE / 12;
  const balanceAtRetirement = futureValueByMonths(
    p.currentBalance,
    monthlyContrib,
    p.accumulationReturnRate,
    retirementMonthIndex,
  );
  const balanceAtStart = futureValueByMonths(
    balanceAtRetirement,
    0,
    p.accumulationReturnRate,
    Math.max(0, startMonthIndex - retirementMonthIndex),
  );
  const result = Math.round(annuitize(balanceAtStart, p.payoutReturnRate, p.payoutYears));
  retirementNominalCache.set(cacheKey, result);
  return result;
}

export function estimatePrivatePension(
  p: PrivatePensionInput,
  currentAge: number,
  currentAgeMonth = 0,
): number {
  const cacheKey = JSON.stringify([p, currentAge, currentAgeMonth]);
  const cached = privateNominalCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const monthsToStart = Math.max(0, getMonthIndexForAge(currentAge, p.startAge, currentAgeMonth, p.startMonth ?? 0));
  const balance = futureValueByMonths(
    p.currentBalance,
    p.monthlyContribution || 0,
    p.accumulationReturnRate,
    monthsToStart,
  );
  const result = Math.round(annuitize(balance, p.payoutReturnRate, p.payoutYears));
  privateNominalCache.set(cacheKey, result);
  return result;
}

/** 국민연금 현재가치 기준 수령 시작 월액 (auto/manual 공통) */
export function resolvePublicMonthlyTodayValue(
  pension: PensionInputs,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
): number {
  const publicPension = pension.publicPension;
  if (!publicPension.enabled) return 0;
  if (publicPension.mode === 'manual' && publicPension.manualMonthlyTodayValue > 0) {
    return publicPension.manualMonthlyTodayValue;
  }
  return estimatePublicPensionTodayValue(publicPension, annualNetIncome, currentAge, retirementAge);
}

function resolveRetirementMonthlyNominal(
  pension: PensionInputs,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
  retirementStartMonth = 0,
): number {
  const cacheKey = JSON.stringify([pension.retirementPension, annualNetIncome, currentAge, retirementAge, retirementStartMonth]);
  const cached = retirementNominalCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const retirementPension = pension.retirementPension;
  if (!retirementPension.enabled) return 0;
  if (retirementPension.mode === 'manual' && retirementPension.manualMonthlyTodayValue > 0) {
    return retirementPension.manualMonthlyTodayValue;
  }
  const result = estimateRetirementPension(retirementPension, annualNetIncome, currentAge, retirementAge, retirementStartMonth);
  retirementNominalCache.set(cacheKey, result);
  return result;
}

function resolveRetirementMonthlyStartTodayValue(
  pension: PensionInputs,
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
  inflationRate: number,
  retirementStartMonth = 0,
): number {
  const cacheKey = JSON.stringify([
    pension.retirementPension,
    annualNetIncome,
    currentAge,
    retirementAge,
    inflationRate,
    retirementStartMonth,
  ]);
  const cached = retirementStartTodayCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const retirementPension = pension.retirementPension;
  if (!retirementPension.enabled) return 0;
  if (retirementPension.mode === 'manual' && retirementPension.manualMonthlyTodayValue > 0) {
    return retirementPension.manualMonthlyTodayValue;
  }
  const nominalMonthly = estimateRetirementPension(
    retirementPension,
    annualNetIncome,
    currentAge,
    retirementAge,
    retirementStartMonth,
  );
  const startMonthIndex = getMonthIndexForAge(currentAge, retirementPension.startAge, 0, retirementPension.startMonth ?? 0);
  const result = nominalMonthly / monthInflationFactor(startMonthIndex, inflationRate);
  retirementStartTodayCache.set(cacheKey, result);
  return result;
}

export function estimatePrivatePensionProducts(
  products: PrivatePensionProduct[],
  currentAge: number,
  currentAgeMonth = 0,
): number {
  return products.reduce((sum, product) => {
    const monthsToStart = Math.max(0, getMonthIndexForAge(currentAge, product.startAge, currentAgeMonth, product.startMonth ?? 0));
    const balance = futureValueByMonths(product.currentBalance, product.monthlyContribution || 0, product.accumulationReturnRate, monthsToStart);
    return sum + Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
  }, 0);
}

function resolvePrivateMonthlyStartTodayValue(
  pension: PensionInputs,
  currentAge: number,
  inflationRate: number,
): number {
  const cacheKey = JSON.stringify([pension.privatePension, currentAge, inflationRate]);
  const cached = privateStartTodayCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const privatePension = pension.privatePension;
  if (!privatePension.enabled) return 0;
  if (privatePension.mode === 'manual' && privatePension.manualMonthlyTodayValue > 0) {
    return privatePension.manualMonthlyTodayValue;
  }
  if (privatePension.detailMode && privatePension.products.length > 0) {
    const result = privatePension.products.reduce((sum, product) => {
      const startMonthIndex = getMonthIndexForAge(currentAge, product.startAge, 0, product.startMonth ?? 0);
      const monthsToStart = Math.max(0, startMonthIndex);
      const balance = futureValueByMonths(product.currentBalance, product.monthlyContribution || 0, product.accumulationReturnRate, monthsToStart);
      const nominalMonthly = Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
      return sum + nominalMonthly / monthInflationFactor(startMonthIndex, inflationRate);
    }, 0);
    privateStartTodayCache.set(cacheKey, result);
    return result;
  }
  const nominalMonthly = estimatePrivatePension(privatePension, currentAge);
  const startMonthIndex = getMonthIndexForAge(currentAge, privatePension.startAge, 0, privatePension.startMonth ?? 0);
  const result = nominalMonthly / monthInflationFactor(startMonthIndex, inflationRate);
  privateStartTodayCache.set(cacheKey, result);
  return result;
}

export function getPublicPensionNominalMonthlyAtAge(
  pension: PensionInputs,
  currentAge: number,
  targetAge: number,
  inflationRate: number,
  annualNetIncome: number,
  retirementAge: number,
): number {
  const monthIndex = getMonthIndexForAge(currentAge, targetAge, 0, 0);
  return getPensionMonthlyBreakdownForMonthIndex(
    pension,
    currentAge,
    monthIndex,
    inflationRate,
    annualNetIncome,
    retirementAge,
  ).publicMonthlyNominal;
}

export function getPublicPensionRealMonthlyAtAge(
  pension: PensionInputs,
  currentAge: number,
  targetAge: number,
  inflationRate: number,
  annualNetIncome: number,
  retirementAge: number,
): number {
  const monthIndex = getMonthIndexForAge(currentAge, targetAge, 0, 0);
  return getPensionMonthlyBreakdownForMonthIndex(
    pension,
    currentAge,
    monthIndex,
    inflationRate,
    annualNetIncome,
    retirementAge,
  ).publicMonthlyRealTodayValue;
}

export function getPensionMonthlyBreakdownForMonthIndex(
  pension: PensionInputs,
  currentAge: number,
  monthIndex: number,
  inflationRate: number,
  annualNetIncome: number,
  retirementAge: number,
  retirementStartMonth = 0,
): PensionBreakdownAtAge {
  const inflationFactor = monthInflationFactor(monthIndex, inflationRate);

  let publicMonthlyNominal = 0;
  let publicMonthlyRealTodayValue = 0;
  let retirementMonthlyNominal = 0;
  let retirementMonthlyRealTodayValue = 0;
  let privateMonthlyNominal = 0;
  let privateMonthlyRealTodayValue = 0;

  const publicStartMonthIndex = getMonthIndexForAge(
    currentAge,
    pension.publicPension.startAge,
    0,
    pension.publicPension.startMonth ?? 0,
  );
  const publicStartTodayValue = resolvePublicMonthlyTodayValue(pension, annualNetIncome, currentAge, retirementAge);
  if (pension.publicPension.enabled && publicStartTodayValue > 0 && monthIndex >= publicStartMonthIndex) {
    publicMonthlyNominal = publicStartTodayValue * inflationFactor;
    publicMonthlyRealTodayValue = publicStartTodayValue;
  }

  const retirementPension = pension.retirementPension;
  const retirementStartMonthIndex = getMonthIndexForAge(
    currentAge,
    retirementPension.startAge,
    0,
    retirementPension.startMonth ?? 0,
  );
  if (retirementPension.enabled && isWithinPayoutWindow(monthIndex, retirementStartMonthIndex, retirementPension.payoutYears)) {
    if (retirementPension.mode === 'manual' && retirementPension.manualMonthlyTodayValue > 0) {
      retirementMonthlyNominal = retirementPension.manualMonthlyTodayValue * inflationFactor;
      retirementMonthlyRealTodayValue = retirementPension.manualMonthlyTodayValue;
    } else {
      retirementMonthlyNominal = resolveRetirementMonthlyNominal(
        pension,
        annualNetIncome,
        currentAge,
        retirementAge,
        retirementStartMonth,
      );
      retirementMonthlyRealTodayValue = retirementMonthlyNominal / inflationFactor;
    }
  }

  const privatePension = pension.privatePension;
  if (privatePension.enabled) {
    if (privatePension.mode === 'manual' && privatePension.manualMonthlyTodayValue > 0) {
      const privateStartMonthIndex = getMonthIndexForAge(
        currentAge,
        privatePension.startAge,
        0,
        privatePension.startMonth ?? 0,
      );
      if (isWithinPayoutWindow(monthIndex, privateStartMonthIndex, privatePension.payoutYears)) {
        privateMonthlyNominal = privatePension.manualMonthlyTodayValue * inflationFactor;
        privateMonthlyRealTodayValue = privatePension.manualMonthlyTodayValue;
      }
    } else if (privatePension.detailMode && privatePension.products.length > 0) {
      for (const product of privatePension.products) {
        const productStartMonthIndex = getMonthIndexForAge(currentAge, product.startAge, 0, product.startMonth ?? 0);
        if (!isWithinPayoutWindow(monthIndex, productStartMonthIndex, product.payoutYears)) continue;
        const balance = futureValueByMonths(
          product.currentBalance,
          product.monthlyContribution || 0,
          product.accumulationReturnRate,
          Math.max(0, productStartMonthIndex),
        );
        const nominalMonthly = Math.round(annuitize(balance, product.payoutReturnRate, product.payoutYears));
        privateMonthlyNominal += nominalMonthly;
        privateMonthlyRealTodayValue += nominalMonthly / inflationFactor;
      }
    } else {
      const privateStartMonthIndex = getMonthIndexForAge(
        currentAge,
        privatePension.startAge,
        0,
        privatePension.startMonth ?? 0,
      );
      if (isWithinPayoutWindow(monthIndex, privateStartMonthIndex, privatePension.payoutYears)) {
        privateMonthlyNominal = estimatePrivatePension(privatePension, currentAge);
        privateMonthlyRealTodayValue = privateMonthlyNominal / inflationFactor;
      }
    }
  }

  return {
    publicMonthlyNominal,
    publicMonthlyRealTodayValue,
    retirementMonthlyNominal,
    retirementMonthlyRealTodayValue,
    privateMonthlyNominal,
    privateMonthlyRealTodayValue,
    totalNominal: publicMonthlyNominal + retirementMonthlyNominal + privateMonthlyNominal,
    totalRealTodayValue: publicMonthlyRealTodayValue + retirementMonthlyRealTodayValue + privateMonthlyRealTodayValue,
  };
}

/** @deprecated 월 인덱스 기반 계산을 age 단위로 감싼 호환 레이어 */
export function getPensionBreakdownAtAge(
  pension: PensionInputs,
  currentAge: number,
  targetAge: number,
  inflationRate: number,
  annualNetIncome: number,
  retirementAge: number,
  retirementStartMonth = 0,
): PensionBreakdownAtAge {
  const monthIndex = getMonthIndexForAge(currentAge, targetAge, 0, 0);
  return getPensionMonthlyBreakdownForMonthIndex(
    pension,
    currentAge,
    monthIndex,
    inflationRate,
    annualNetIncome,
    retirementAge,
    retirementStartMonth,
  );
}

/** 연금 전체 합산 — 오늘 가치 기준 (결과 비교용) */
export function getTotalMonthlyPensionTodayValue(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  inflationRate: number,
  retirementStartMonth = 0,
): number {
  return (
    resolvePublicMonthlyTodayValue(pension, annualNetIncome, currentAge, retirementAge) +
    resolveRetirementMonthlyStartTodayValue(
      pension,
      annualNetIncome,
      currentAge,
      retirementAge,
      inflationRate,
      retirementStartMonth,
    ) +
    resolvePrivateMonthlyStartTodayValue(pension, currentAge, inflationRate)
  );
}

/** 연금 항목별 분해 — 수령 시작 월액의 오늘 가치 기준 */
export function getPensionBreakdown(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  inflationRate: number,
  retirementStartMonth = 0,
): { publicMonthly: number; retirementMonthly: number; privateMonthly: number } {
  return {
    publicMonthly: resolvePublicMonthlyTodayValue(pension, annualNetIncome, currentAge, retirementAge),
    retirementMonthly: resolveRetirementMonthlyStartTodayValue(
      pension,
      annualNetIncome,
      currentAge,
      retirementAge,
      inflationRate,
      retirementStartMonth,
    ),
    privateMonthly: resolvePrivateMonthlyStartTodayValue(pension, currentAge, inflationRate),
  };
}

/** 은퇴 시작월 기준 연금 합계 — 오늘 가치 기준 (만원/월) */
export function getPensionMonthlyAtRetirementStart(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  inflationRate: number,
  retirementStartMonth = 0,
): number {
  const monthIndex = getMonthIndexForAge(currentAge, retirementAge, 0, retirementStartMonth);
  return getPensionMonthlyBreakdownForMonthIndex(
    pension,
    currentAge,
    monthIndex,
    inflationRate,
    annualNetIncome,
    retirementAge,
    retirementStartMonth,
  ).totalRealTodayValue;
}

export interface PensionEvent {
  age: number;
  pensionType: '국민연금' | '퇴직연금' | '개인연금';
  monthlyTodayValue: number;
  coverageRateBefore: number;
  coverageRateAfter: number;
}

/** 연금 개시 이벤트를 나이 순으로 반환 — 결과 패널 타임라인용 (오늘 가치 기준) */
export function getPensionTimeline(
  pension: PensionInputs,
  currentAge: number,
  retirementAge: number,
  annualNetIncome: number,
  targetMonthly: number,
  inflationRate: number,
  retirementStartMonth = 0,
): PensionEvent[] {
  if (targetMonthly <= 0) return [];

  const events: Omit<PensionEvent, 'coverageRateBefore' | 'coverageRateAfter'>[] = [];
  const breakdown = getPensionBreakdown(
    pension,
    currentAge,
    retirementAge,
    annualNetIncome,
    inflationRate,
    retirementStartMonth,
  );

  if (pension.publicPension.enabled && breakdown.publicMonthly > 0) {
    events.push({ age: pension.publicPension.startAge, pensionType: '국민연금', monthlyTodayValue: breakdown.publicMonthly });
  }
  if (pension.retirementPension.enabled && breakdown.retirementMonthly > 0) {
    events.push({ age: pension.retirementPension.startAge, pensionType: '퇴직연금', monthlyTodayValue: breakdown.retirementMonthly });
  }
  if (pension.privatePension.enabled && breakdown.privateMonthly > 0) {
    events.push({ age: pension.privatePension.startAge, pensionType: '개인연금', monthlyTodayValue: breakdown.privateMonthly });
  }

  events.sort((a, b) => a.age - b.age);

  let cumulativeMonthly = 0;
  return events.map((event) => {
    const coverageRateBefore = cumulativeMonthly / targetMonthly;
    cumulativeMonthly += event.monthlyTodayValue;
    const coverageRateAfter = cumulativeMonthly / targetMonthly;
    return { ...event, coverageRateBefore, coverageRateAfter };
  });
}
