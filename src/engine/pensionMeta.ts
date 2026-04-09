/**
 * 연금 추정 메타데이터 — 입력 화면 표시용 근거·범위 계산
 *
 * estimatePublicPensionWithMeta, getRetirementPensionMeta 는
 * PensionSection 등 UI 컴포넌트 전용. 시뮬레이션 엔진에서는 사용하지 않는다.
 */

import { getPlannerPolicy } from '../policy/policyTable';
import type { RetirementPensionInput } from '../types/pension';
import { estimatePublicPension, estimateRetirementPension, annuitize } from './pensionEstimation';

const pensionPolicy = getPlannerPolicy().pension;
const DEFAULT_NET_TO_GROSS_RATIO = pensionPolicy.netToGrossRatio;
const ASSUMED_CAREER_START_AGE  = pensionPolicy.assumedCareerStartAge;
const NPS_MIN_MONTHLY           = pensionPolicy.npsMinMonthly;
const NPS_MAX_MONTHLY           = pensionPolicy.npsMaxMonthly;
const NPS_AVERAGE_MONTHLY_INCOME = pensionPolicy.npsAverageMonthlyIncomeValue;
const NPS_PRE_2026_REPLACEMENT_RATE  = pensionPolicy.npsPreReformReplacementRate;
const NPS_POST_2026_REPLACEMENT_RATE = pensionPolicy.npsPostReformReplacementRate;
const NPS_REFORM_YEAR           = pensionPolicy.npsReformYear;
const CURRENT_YEAR              = new Date().getFullYear();
const RETIREMENT_CONTRIBUTION_RATE = 1 / 12;

function futureValue(pv: number, annualContrib: number, annualRatePercent: number, years: number): number {
  if (years <= 0) return pv;
  const r = annualRatePercent / 100;
  if (r === 0) return pv + annualContrib * years;
  const factor = Math.pow(1 + r, years);
  return pv * factor + annualContrib * (factor - 1) / r;
}

function computeNPSReplacementMeta(
  currentAge: number,
  retirementAge: number,
  workStartAge: number,
): {
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

  const contributionYears = Math.min(rawTotal, 40);

  if (rawTotal < 10) {
    return { pre2026Years: Math.round(rawPre), post2026Years: Math.round(rawPost), contributionYears, replacementRate: 0 };
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

// ─── 국민연금 메타 ─────────────────────────────────────────────────────────────

export interface PublicPensionEstimate {
  base: number;
  conservative: number;
  optimistic: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  assumptions: string[];
  pensionableMonthly: number;
  contributionYears: number;
  cappedByIncomeCeiling: boolean;
}

export function estimatePublicPensionWithMeta(
  annualNetIncome: number,
  currentAge: number,
  retirementAge: number,
  workStartAge: number = ASSUMED_CAREER_START_AGE,
): PublicPensionEstimate {
  const grossAnnualIncome = annualNetIncome / DEFAULT_NET_TO_GROSS_RATIO;
  const grossMonthlyIncome = grossAnnualIncome / 12;
  const cappedByIncomeCeiling = grossMonthlyIncome > NPS_MAX_MONTHLY;
  const pensionableMonthly = Math.min(Math.max(grossMonthlyIncome, NPS_MIN_MONTHLY), NPS_MAX_MONTHLY);

  const { pre2026Years, post2026Years, contributionYears, replacementRate } =
    computeNPSReplacementMeta(currentAge, retirementAge, workStartAge);
  const contributionEndAge = Math.min(60, retirementAge);

  const base = Math.round(pensionableMonthly * replacementRate);
  const conservative = Math.round(base * 0.8);
  const optimistic   = Math.round(base * 1.2);

  const assumptions: string[] = [
    `세후 소득을 세전으로 역산했어요 (역산 비율 ${Math.round(DEFAULT_NET_TO_GROSS_RATIO * 100)}%)`,
    `국민연금 가입 시작 나이를 만 ${workStartAge}세로 가정했어요`,
    `예상 가입기간 ${contributionYears}년 (만 ${workStartAge}세~${contributionEndAge}세)`,
    `공단 예상연금월액표 구조를 따라 A값 ${NPS_AVERAGE_MONTHLY_INCOME.toLocaleString('ko-KR')}만원과 내 소득(B값)을 함께 반영했어요`,
    ...(pre2026Years > 0 && post2026Years > 0
      ? [`2026년 개혁 전 ${pre2026Years}년(소득대체율 41.5%) + 이후 ${post2026Years}년(43%) 분리 적용`]
      : pre2026Years > 0
        ? [`2026년 개혁 이전 가입기간 기준 — 소득대체율 41.5% 적용`]
        : [`2026년 개혁 이후 가입기간 기준 — 소득대체율 43% 적용`]),
    `기준소득월액 ${pensionableMonthly.toLocaleString('ko-KR')}만원 적용 (상한 ${NPS_MAX_MONTHLY}만원)${cappedByIncomeCeiling ? ' — 상한 적용됨' : ''}`,
    `실효 소득대체율 ${Math.round(replacementRate * 100 * 10) / 10}%`,
  ];

  return {
    base, conservative, optimistic, confidenceLevel: 'low',
    assumptions, pensionableMonthly, contributionYears, cappedByIncomeCeiling,
  };
}

// ─── 퇴직연금 메타 ─────────────────────────────────────────────────────────────

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

// annuitize re-export — PensionSection에서 직접 필요한 경우 대비
export { estimatePublicPension, estimateRetirementPension, annuitize };
