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
} from '../types/calculationV2';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
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
import { precomputeDebtSchedules } from './assetWeighting';
import {
  getTotalMonthlyPensionTodayValue,
} from './pensionEstimation';

const STRATEGIES: PropertyStrategyV2[] = ['keep', 'secured_loan', 'sell'];

function buildPropertyOption(
  inputs: PlannerInputs,
  strategy: PropertyStrategyV2,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
  debtSchedules: ReturnType<typeof precomputeDebtSchedules>,
  _lifeExpectancy: number,
): PropertyOptionResult {
  const sustainableMonthly = findMaxSustainableMonthlyV2(
    inputs,
    strategy,
    fundingPolicy,
    liquidationPolicy,
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
      ? '집을 건드리지 않아도 기대수명까지 유지돼요'
      : `${failureAge}세부터 자금이 부족해요`;
  } else if (strategy === 'secured_loan') {
    headline =
      interventionAge !== null
        ? `${interventionAge}세부터 집을 담보로 버텨요`
        : survivesToLifeExpectancy
        ? '집 담보 없이도 기대수명까지 유지돼요'
        : `${failureAge}세부터 자금이 부족해요`;
  } else {
    headline =
      interventionAge !== null
        ? `${interventionAge}세에 집을 팔아 현금화해요`
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

function pickRecommendedV2(options: PropertyOptionResult[]): PropertyStrategyV2 {
  // 우선순위: keep > secured_loan > sell
  // 동점 시: failureAge 늦은 순 → sustainableMonthly 큰 순 → finalNetWorth 큰 순
  const sorted = [...options].sort((a, b) => {
    // keep 우선
    const priority = (s: PropertyStrategyV2) =>
      s === 'keep' ? 0 : s === 'secured_loan' ? 1 : 2;
    const pDiff = priority(a.strategy) - priority(b.strategy);
    if (pDiff !== 0) return pDiff;

    // failureAge null(= 기대수명까지 유지)이 더 좋음
    const aFail = a.failureAge ?? Infinity;
    const bFail = b.failureAge ?? Infinity;
    if (aFail !== bFail) return bFail - aFail;

    if (a.sustainableMonthly !== b.sustainableMonthly)
      return b.sustainableMonthly - a.sustainableMonthly;

    return b.finalNetWorth - a.finalNetWorth;
  });

  // keep이 목표 달성 가능하면 keep 권장
  const keepOption = options.find((o) => o.strategy === 'keep');
  if (keepOption && keepOption.survivesToLifeExpectancy) return 'keep';

  return sorted[0].strategy;
}

function buildFundingTimeline(
  aggregates: YearlyAggregateV2[],
  retirementAge: number,
): FundingStage[] {
  const stages: FundingStage[] = [];

  let incomeEnd: number | null = null;
  let cashEnd: number | null = null;
  let financialEnd: number | null = null;
  let propertyStart: number | null = null;
  let failureStart: number | null = null;

  for (const agg of aggregates) {
    if (agg.totalIncome > 0 && incomeEnd === null) {
      incomeEnd = agg.ageYear;
    }
    if (agg.eventSummary.includes('투자자산 매도 시작') && cashEnd === null) {
      cashEnd = agg.ageYear;
    }
    if (agg.eventSummary.includes('투자자산 소진') && financialEnd === null) {
      financialEnd = agg.ageYear;
    }
    if (agg.eventSummary.includes('부동산 전략 개시') && propertyStart === null) {
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
      label: '현금/예금 사용',
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
        label: '투자자산 매도',
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
      label: '부동산 활용',
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
  return [
    { label: '물가상승률', value: `${inputs.goal.inflationRate}%` },
    { label: '수입 증가율', value: `${inputs.status.incomeGrowthRate}%` },
    { label: '유동성 버퍼', value: `목표 생활비 ${fundingPolicy.liquidityBufferMonths}개월치` },
    { label: '부동산 매각 비용', value: '매각가의 5%' },
    { label: '담보대출 금리', value: '연 4.5%' },
    { label: '담보대출 LTV', value: '60%' },
  ];
}

function buildWarnings(
  inputs: PlannerInputs,
  options: PropertyOptionResult[],
): WarningItem[] {
  const warnings: WarningItem[] = [];

  const keepOption = options.find((o) => o.strategy === 'keep');
  if (keepOption && !keepOption.survivesToLifeExpectancy) {
    warnings.push({
      severity: 'warning',
      message: '집을 건드리지 않으면 기대수명 전에 자금이 부족해질 수 있어요.',
    });
  }

  const allFail = options.every((o) => !o.survivesToLifeExpectancy);
  if (allFail) {
    warnings.push({
      severity: 'critical',
      message: '어떤 전략을 써도 기대수명까지 자금이 부족해요. 목표 생활비를 낮추거나 저축을 늘려보세요.',
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

  const debtSchedules = precomputeDebtSchedules(inputs.debts);

  // 3가지 전략 병렬 계산
  const propertyOptions: PropertyOptionResult[] = STRATEGIES.map((strategy) =>
    buildPropertyOption(inputs, strategy, fundingPolicy, liquidationPolicy, debtSchedules, goal.lifeExpectancy),
  );

  // 추천 전략 결정
  const recommendedStrategy = pickRecommendedV2(propertyOptions);
  for (const opt of propertyOptions) {
    opt.isRecommended = opt.strategy === recommendedStrategy;
  }

  // 권장 전략 기준 snapshots (상세 테이블용)
  const recommendedOption = propertyOptions.find((o) => o.isRecommended)!;
  const detailYearlyAggregates: YearlyAggregateV2[] = recommendedOption.yearlyAggregates;

  // 권장 전략 기준 이벤트 나이
  const recommendedSnapshots = simulateMonthlyV2(
    inputs,
    goal.targetMonthly,
    recommendedStrategy,
    fundingPolicy,
    liquidationPolicy,
    debtSchedules,
  );

  const cashRunoutAge = findFinancialSellStartAgeV2(recommendedSnapshots);
  const financialSellStartAge = findFinancialSellStartAgeV2(recommendedSnapshots);
  const financialExhaustionAge = findFinancialExhaustionAgeV2(recommendedSnapshots);
  const propertyInterventionAge = findPropertyInterventionAgeV2(recommendedSnapshots);
  const failureAge = findFailureAgeV2(recommendedSnapshots);

  const sustainableMonthly = recommendedOption.sustainableMonthly;
  const targetGap = sustainableMonthly - goal.targetMonthly;

  const fundingTimeline = buildFundingTimeline(detailYearlyAggregates, goal.retirementAge);
  const assumptions = buildAssumptions(inputs, fundingPolicy);
  const warnings = buildWarnings(inputs, propertyOptions);

  return {
    summary: {
      sustainableMonthly,
      targetGap,
      cashRunoutAge,
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
