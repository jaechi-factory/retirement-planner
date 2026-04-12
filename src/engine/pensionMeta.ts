/**
 * 연금 추정 메타데이터 — 입력 화면 표시용 근거·범위 계산
 *
 * estimatePublicPensionWithMeta, getRetirementPensionMeta 는
 * PensionSection 등 UI 컴포넌트 전용. 시뮬레이션 엔진에서는 사용하지 않는다.
 */

import { getPlannerPolicy } from '../policy/policyTable';
import type { RetirementPensionInput, PublicPensionInput } from '../types/pension';
import {
  estimateRetirementPension,
  futureValueMonthly,
  getPublicPensionEstimateDetails,
} from './pensionEstimation';
import { estimateGrossAnnualFromNetAnnual, resolvePayrollReverseContext } from './payrollReverse';

const pensionPolicy = getPlannerPolicy().pension;
const ASSUMED_CAREER_START_AGE = pensionPolicy.assumedCareerStartAge;
const RETIREMENT_CONTRIBUTION_RATE = 1 / 12;

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
  valuationYear = Number.parseInt(getPlannerPolicy().effectiveDate.slice(0, 4), 10),
): PublicPensionEstimate {
  const input: PublicPensionInput = {
    enabled: true,
    mode: 'auto',
    startAge: 65,
    startMonth: 0,
    manualMonthlyTodayValue: 0,
    workStartAge,
    valuationYear,
    pensionableMonthlyOverride: null,
    payrollReverse: undefined,
  };
  const details = getPublicPensionEstimateDetails(input, annualNetIncome, currentAge, retirementAge);
  const base = Math.round(details.todayValueMonthly);
  const conservative = Math.round(base * 0.9);
  const optimistic = Math.round(base * 1.1);
  const cappedByIncomeCeiling = details.pensionableMonthly >= pensionPolicy.npsMaxMonthly;

  return {
    base,
    conservative,
    optimistic,
    confidenceLevel: details.contributionYears >= 20 ? 'high' : details.contributionYears >= 10 ? 'medium' : 'low',
    assumptions: [
      ...details.assumptions,
      `평가연도 ${details.valuationYear}년 기준 가입기간 ${details.contributionYears}년을 적용했어요.`,
      details.taxTableVersion ? `간이세액표 버전 ${details.taxTableVersion}를 사용했어요.` : '간이세액표 버전을 확인하지 못했어요.',
      `국민연금 A값 ${pensionPolicy.npsAverageMonthlyIncomeValue.toLocaleString('ko-KR')}만원과 내 기준소득월액(B)을 함께 반영했어요.`,
      `실효 소득대체율 ${Math.round(details.replacementRate * 1000) / 10}%를 적용했어요.`,
    ],
    pensionableMonthly: details.pensionableMonthly,
    contributionYears: details.contributionYears,
    cappedByIncomeCeiling,
  };
}

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
  retirementStartMonth = 0,
): RetirementPensionMeta {
  const grossFromNet = estimateGrossAnnualFromNetAnnual(
    annualNetIncome,
    resolvePayrollReverseContext(undefined, Number.parseInt(getPlannerPolicy().effectiveDate.slice(0, 4), 10)),
  );
  const annualContrib = grossFromNet.grossMonthly * 12 * RETIREMENT_CONTRIBUTION_RATE;
  const monthlyContrib = annualContrib / 12;
  const retirementMonthIndex = Math.max(0, (retirementAge - currentAge) * 12 + retirementStartMonth);
  const startMonthIndex = Math.max(0, (p.startAge - currentAge) * 12 + (p.startMonth ?? 0));
  const balanceAtRetirement = futureValueMonthly(
    p.currentBalance,
    monthlyContrib,
    p.accumulationReturnRate,
    retirementMonthIndex / 12,
  );
  const balanceAtStart = futureValueMonthly(
    balanceAtRetirement,
    0,
    p.accumulationReturnRate,
    Math.max(0, startMonthIndex - retirementMonthIndex) / 12,
  );
  const optimistic = Math.round(estimateRetirementPension(p, annualNetIncome, currentAge, retirementAge, retirementStartMonth));

  return {
    assumptions: [
      ...(grossFromNet.assumptions ?? []),
      grossFromNet.taxTableVersion ? `간이세액표 버전 ${grossFromNet.taxTableVersion}를 사용했어요.` : '간이세액표 버전을 확인하지 못했어요.',
      `법정 적립률 1/12 기준으로 월 ${Math.round(monthlyContrib).toLocaleString('ko-KR')}만원 적립을 가정했어요.`,
      `은퇴 시점 예상 적립금 약 ${Math.round(balanceAtRetirement).toLocaleString('ko-KR')}만원`,
      `개시 시점(${p.startAge}세) 예상 적립금 약 ${Math.round(balanceAtStart).toLocaleString('ko-KR')}만원`,
      `수령 기간 ${p.payoutYears}년 · 수령 수익률 ${p.payoutReturnRate}% 가정`,
      `자동 추정 월액은 약 ${Math.round(optimistic).toLocaleString('ko-KR')}만원이에요.`,
    ],
    annualContrib,
    balanceAtRetirement,
    balanceAtStart,
  };
}

