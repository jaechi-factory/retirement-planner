/**
 * V2 계산 조립기 — Store에서 호출, CalculationResultV2 반환
 *
 * V1 calculator.ts는 건드리지 않는다.
 */

import type { PlannerInputs } from '../types/inputs';
import type {
  CalculationResultV2,
  PropertyOptionResult,
  FundingStage,
  YearlyAggregateV2,
  AssumptionItem,
  WarningItem,
  RecommendationModeV2,
} from '../types/calculationV2';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
import type { DebtSchedules } from './debtSchedule';
import { PROPERTY_STRATEGY_LABELS } from './propertyStrategiesV2';
import type { PropertyStrategyV2 } from './propertyStrategiesV2';
import {
  simulateMonthlyV2,
  aggregateToYearly,
  findFinancialSellStartAgeV2,
  findFinancialExhaustionAgeV2,
  findPropertyInterventionAgeV2,
  findFailureAgeV2,
} from './simulatorV2';
import { findMaxSustainableMonthlyV2 } from './binarySearchV2';
import { precomputeDebtSchedules, calcTotalAnnualRepaymentFromSchedules } from './assetWeighting';
import {
  getTotalMonthlyPensionTodayValue,
} from './pensionEstimation';
import { getPlannerPolicy } from '../policy/policyTable';

const STRATEGIES: PropertyStrategyV2[] = ['keep', 'secured_loan', 'sell'];
const STRATEGY_TIE_BREAK_PRIORITY: Record<PropertyStrategyV2, number> = {
  keep: 3,
  secured_loan: 2,
  sell: 1,
};

function buildPropertyOption(
  inputs: PlannerInputs,
  strategy: PropertyStrategyV2,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
  debtSchedules: DebtSchedules,
): PropertyOptionResult {
  // 단일 source: 같은 debtSchedules를 binary search와 detail simulation에 공유
  const sustainableMonthly = findMaxSustainableMonthlyV2(
    inputs,
    strategy,
    fundingPolicy,
    liquidationPolicy,
    debtSchedules,
  );

  const snapshots = simulateMonthlyV2(
    inputs,
    inputs.goal.targetMonthly,
    strategy,
    fundingPolicy,
    liquidationPolicy,
    debtSchedules,
  );

  const yearlyAggregates = aggregateToYearly(snapshots);
  const interventionAge = findPropertyInterventionAgeV2(snapshots);
  const failureAge = findFailureAgeV2(snapshots);

  const lastYear = yearlyAggregates[yearlyAggregates.length - 1];
  const finalNetWorth = lastYear
    ? lastYear.cashLikeEnd +
      lastYear.financialInvestableEnd +
      lastYear.propertyValueEnd -
      lastYear.securedLoanBalanceEnd
    : 0;

  const survivesToLifeExpectancy = failureAge === null;

  let headline = '';
  if (strategy === 'keep') {
    headline = survivesToLifeExpectancy
      ? `집을 팔거나 담보대출을 받지 않아도 ${inputs.goal.lifeExpectancy}세까지 가능해요`
      : `${failureAge}세부터 자금이 부족해요`;
  } else if (strategy === 'secured_loan') {
    headline =
      interventionAge !== null
        ? `${interventionAge}세부터 집을 담보로 대출받아 생활비를 보태요`
        : survivesToLifeExpectancy
        ? '집 담보 없이도 기대수명까지 유지돼요'
        : `${failureAge}세부터 자금이 부족해요`;
  } else {
    headline =
      interventionAge !== null
        ? `${interventionAge}세에 집을 팔아 그 돈으로 생활비를 이어가요`
        : survivesToLifeExpectancy
        ? '집 매각 없이도 기대수명까지 유지돼요'
        : `${failureAge}세부터 자금이 부족해요`;
  }

  return {
    strategy,
    label: PROPERTY_STRATEGY_LABELS[strategy],
    sustainableMonthly,
    interventionAge,
    survivesToLifeExpectancy,
    failureAge,
    finalNetWorth,
    headline,
    isRecommended: false, // 아래에서 결정
    yearlyAggregates,
  };
}

function compareBySustainableDesc(a: PropertyOptionResult, b: PropertyOptionResult): number {
  if (a.sustainableMonthly !== b.sustainableMonthly) {
    return b.sustainableMonthly - a.sustainableMonthly;
  }
  if (a.survivesToLifeExpectancy !== b.survivesToLifeExpectancy) {
    return Number(b.survivesToLifeExpectancy) - Number(a.survivesToLifeExpectancy);
  }
  const aFail = a.failureAge ?? Infinity;
  const bFail = b.failureAge ?? Infinity;
  if (aFail !== bFail) return bFail - aFail;
  if (a.finalNetWorth !== b.finalNetWorth) return b.finalNetWorth - a.finalNetWorth;
  return STRATEGY_TIE_BREAK_PRIORITY[b.strategy] - STRATEGY_TIE_BREAK_PRIORITY[a.strategy];
}

function pickMaxSustainableOption(options: PropertyOptionResult[]): PropertyOptionResult {
  return [...options].sort(compareBySustainableDesc)[0];
}

function pickRecommendedV2(
  options: PropertyOptionResult[],
  recommendationMode: RecommendationModeV2,
): PropertyStrategyV2 {
  if (recommendationMode === 'max_sustainable') {
    return pickMaxSustainableOption(options).strategy;
  }

  // 1) keep이 기대수명까지 살아남으면 keep 권장 (집 안 건드려도 되니까)
  const keepOption = options.find((o) => o.strategy === 'keep');
  if (keepOption && keepOption.survivesToLifeExpectancy) return 'keep';

  // 2) 기대수명까지 살아남는 전략이 있으면, 그 중 월 생활비 최대 전략 권장
  const surviving = options.filter((o) => o.survivesToLifeExpectancy);
  if (surviving.length > 0) {
    return surviving.sort((a, b) => b.sustainableMonthly - a.sustainableMonthly)[0].strategy;
  }

  // 3) 모두 실패하는 경우: failureAge 늦은 순 → sustainableMonthly 큰 순으로 권장
  const sorted = [...options].sort((a, b) => {
    const aFail = a.failureAge ?? Infinity;
    const bFail = b.failureAge ?? Infinity;
    if (aFail !== bFail) return bFail - aFail;
    if (a.sustainableMonthly !== b.sustainableMonthly)
      return b.sustainableMonthly - a.sustainableMonthly;
    return b.finalNetWorth - a.finalNetWorth;
  });

  return sorted[0].strategy;
}

function buildFundingTimeline(
  aggregates: YearlyAggregateV2[],
  retirementAge: number,
): FundingStage[] {
  const stages: FundingStage[] = [];

  let cashEnd: number | null = null;
  let financialEnd: number | null = null;
  let propertyStart: number | null = null;
  let failureStart: number | null = null;

  for (const agg of aggregates) {
    if (agg.eventSummary.includes('주식·채권 팔기 시작') && cashEnd === null) {
      cashEnd = agg.ageYear;
    }
    if (agg.eventSummary.includes('주식·채권 소진') && financialEnd === null) {
      financialEnd = agg.ageYear;
    }
    if (agg.eventSummary.includes('집 활용 시작') && propertyStart === null) {
      propertyStart = agg.ageYear;
    }
    if (agg.eventSummary.includes('자금 부족') && failureStart === null) {
      failureStart = agg.ageYear;
    }
  }

  const firstYear = aggregates[0]?.ageYear ?? retirementAge;
  const lastYear = aggregates[aggregates.length - 1]?.ageYear ?? null;

  // 근로소득 구간
  if (retirementAge > firstYear) {
    stages.push({
      label: '근로소득',
      fromAge: firstYear,
      toAge: retirementAge,
      bucketType: 'income',
    });
  }

  // 현금성 사용 구간
  const cashStart = retirementAge;
  const cashEndAge = cashEnd ?? financialEnd ?? propertyStart ?? failureStart ?? lastYear;
  if (cashEndAge !== null && cashEndAge > cashStart) {
    stages.push({
      label: '현금·예금으로 생활',
      fromAge: cashStart,
      toAge: cashEndAge,
      bucketType: 'cash_like',
    });
  }

  // 투자자산 매도 구간
  if (cashEnd !== null) {
    const finEndAge = financialEnd ?? propertyStart ?? failureStart ?? lastYear;
    if (finEndAge !== null && finEndAge > cashEnd) {
      stages.push({
        label: '주식·채권 팔아서 생활',
        fromAge: cashEnd,
        toAge: finEndAge,
        bucketType: 'financial',
      });
    }
  }

  // 부동산 전략 구간
  if (propertyStart !== null) {
    const propEnd = failureStart ?? lastYear;
    stages.push({
      label: '집 활용해서 생활',
      fromAge: propertyStart,
      toAge: propEnd,
      bucketType: 'property_keep',
    });
  }

  // 자금 부족 구간
  if (failureStart !== null) {
    stages.push({
      label: '자금 부족',
      fromAge: failureStart,
      toAge: null,
      bucketType: 'failure',
    });
  }

  return stages;
}

function buildAssumptions(inputs: PlannerInputs, fundingPolicy: FundingPolicy): AssumptionItem[] {
  const policy = getPlannerPolicy();
  return [
    { label: '물가상승률', value: `${inputs.goal.inflationRate}%` },
    { label: '수입 증가율', value: `${inputs.status.incomeGrowthRate}%` },
    { label: '비상금 여유분', value: `목표 생활비 ${fundingPolicy.liquidityBufferMonths}개월치` },
    { label: '집 팔 때 드는 비용', value: `매각가의 ${(policy.property.propertySaleHaircut * 100).toFixed(1).replace('.0', '')}%` },
    { label: '집 담보 대출 금리', value: `연 ${(policy.property.securedLoanAnnualRate * 100).toFixed(1)}%` },
    { label: '집 담보 대출 한도', value: `집 시세의 ${(policy.property.securedLoanLtv * 100).toFixed(0)}%` },
  ];
}

function buildWarnings(
  inputs: PlannerInputs,
  options: PropertyOptionResult[],
  debtSchedules: DebtSchedules,
): WarningItem[] {
  const warnings: WarningItem[] = [];

  // 은퇴 전 유동성 위기: 현재 수입으로 지출+대출을 감당 못할 때
  // 단일 source: 외부에서 받은 debtSchedules 사용
  if (inputs.status.annualIncome > 0) {
    const totalAnnualRepayment = calcTotalAnnualRepaymentFromSchedules(debtSchedules, 0);
    const childExpense = inputs.children.hasChildren &&
      inputs.status.currentAge <= inputs.children.independenceAge
        ? inputs.children.count * inputs.children.monthlyPerChild * 12
        : 0;
    const annualNetSavings =
      inputs.status.annualIncome - inputs.status.annualExpense - totalAnnualRepayment - childExpense;
    if (annualNetSavings < 0) {
      warnings.push({
        severity: 'warning',
        message: `현재 수입으로는 생활비와 대출 상환을 감당하기 어려워요. 월 ${Math.round(Math.abs(annualNetSavings) / 12).toLocaleString()}만원이 부족해요.`,
      });
    }
  }

  const keepOption = options.find((o) => o.strategy === 'keep');
  if (keepOption && !keepOption.survivesToLifeExpectancy) {
    warnings.push({
      severity: 'warning',
      message: '집을 건드리지 않으면 기대수명 전에 자금이 부족해질 수 있어요.',
    });
  }

  const allFail = options.every((o) => !o.survivesToLifeExpectancy);
  if (allFail) {
    const bestSustainable = Math.max(...options.map((o) => o.sustainableMonthly));
    const targetMonthly = inputs.goal.targetMonthly;
    const gapPart =
      bestSustainable > 0 && targetMonthly > 0
        ? ` 지금 자산 기준으로 가능한 생활비는 최대 월 ${bestSustainable.toLocaleString()}만원이에요 (목표와 차이 ${(targetMonthly - bestSustainable).toLocaleString()}만원).`
        : '';
    warnings.push({
      severity: 'critical',
      message: `목표 생활비 월 ${targetMonthly.toLocaleString()}만원으로는 기대수명까지 자금을 유지하기 어려워요.${gapPart} 저축을 늘리거나 투자 수익률을 높이는 방법을 검토해보세요.`,
    });
  }

  if (inputs.assets.realEstate.amount === 0) {
    warnings.push({
      severity: 'info',
      message: '부동산 자산이 없어서 집 활용 전략 비교가 의미 없어요.',
    });
  }

  const pension = getTotalMonthlyPensionTodayValue(
    inputs.pension,
    inputs.status.currentAge,
    inputs.goal.retirementAge,
    inputs.status.annualIncome,
    inputs.goal.inflationRate,
  );
  if (pension === 0) {
    warnings.push({
      severity: 'info',
      message: '연금 수령액이 0이에요. 연금 정보를 입력하면 더 정확해져요.',
    });
  }

  return warnings;
}

/** V2 전체 계산 실행 — store에서 호출 */
export function runCalculationV2(
  inputs: PlannerInputs,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
  prebuiltSchedules?: DebtSchedules,
  recommendationMode: RecommendationModeV2 = 'keep_priority',
): CalculationResultV2 | null {
  const { goal, status } = inputs;

  // 필수 입력 미완성이면 null 반환
  const requiredMissing =
    status.currentAge <= 0 ||
    goal.retirementAge <= 0 ||
    goal.lifeExpectancy <= 0 ||
    goal.targetMonthly <= 0 ||
    goal.retirementAge <= status.currentAge ||
    goal.lifeExpectancy <= goal.retirementAge;

  if (requiredMissing) return null;

  // 단일 source: 외부에서 주입받거나 없으면 1회 계산
  const debtSchedules = prebuiltSchedules ?? precomputeDebtSchedules(inputs.debts);

  // 3가지 전략 병렬 계산
  const propertyOptions: PropertyOptionResult[] = STRATEGIES.map((strategy) =>
    buildPropertyOption(inputs, strategy, fundingPolicy, liquidationPolicy, debtSchedules),
  );
  const maxOption = pickMaxSustainableOption(propertyOptions);

  // 추천 전략 결정
  const recommendedStrategy = pickRecommendedV2(propertyOptions, recommendationMode);
  for (const opt of propertyOptions) {
    opt.isRecommended = opt.strategy === recommendedStrategy;
  }

  // 권장 전략 기준 데이터 (yearlyAggregates 안에 months 포함 — 중복 시뮬레이션 없음)
  const recommendedOption = propertyOptions.find((o) => o.isRecommended)!;
  const detailYearlyAggregates: YearlyAggregateV2[] = recommendedOption.yearlyAggregates;

  // 이벤트 나이: yearlyAggregates 안의 months에서 추출 (기준 통일)
  const allMonths = detailYearlyAggregates.flatMap((a) => a.months);
  const financialSellStartAge = findFinancialSellStartAgeV2(allMonths);
  const financialExhaustionAge = findFinancialExhaustionAgeV2(allMonths);
  const propertyInterventionAge = findPropertyInterventionAgeV2(allMonths);
  const failureAge = findFailureAgeV2(allMonths);

  const sustainableMonthly = recommendedOption.sustainableMonthly;
  const targetGap = sustainableMonthly - goal.targetMonthly;
  const maxSustainableMonthly = maxOption.sustainableMonthly;
  const maxTargetGap = maxSustainableMonthly - goal.targetMonthly;

  const fundingTimeline = buildFundingTimeline(detailYearlyAggregates, goal.retirementAge);
  const assumptions = buildAssumptions(inputs, fundingPolicy);
  const warnings = buildWarnings(inputs, propertyOptions, debtSchedules);

  return {
    summary: {
      sustainableMonthly,
      targetGap,
      maxSustainableMonthly,
      maxTargetGap,
      recommendedStrategy,
      maxSustainableStrategy: maxOption.strategy,
      recommendationMode,
      financialSellStartAge,
      financialExhaustionAge,
      propertyInterventionAge,
      failureAge,
    },
    fundingTimeline,
    propertyOptions,
    detailYearlyAggregates,
    assumptions,
    warnings,
  };
}
