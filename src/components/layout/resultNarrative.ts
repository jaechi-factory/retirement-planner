import { getTotalMonthlyPensionTodayValue } from '../../engine/pensionEstimation';
import { PROPERTY_STRATEGY_LABELS } from '../../engine/propertyStrategiesV2';
import type { CalculationResultV2, PropertyOptionResult } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import { fmtKRW } from '../../utils/format';

export type NarrativeTone = 'neutral' | 'positive' | 'negative';

export interface NarrativeMetric {
  label: string;
  value: string;
  tone?: NarrativeTone;
}

export interface ResultNarrativeModel {
  headline: string;
  metrics: [NarrativeMetric, NarrativeMetric, NarrativeMetric];
  recommendedStrategyLabel: string;
  recommendationReasonLine: string;
  insightLines: [string, string, string];
}

function buildTransitionLine(
  summary: CalculationResultV2['summary'],
  inputs: PlannerInputs,
  hasRealEstate: boolean,
): string {
  if (summary.failureAge === null) {
    if (hasRealEstate && summary.propertyInterventionAge !== null) {
      return `${summary.propertyInterventionAge}세부터는 집을 담보로 대출받거나 팔아야 해요.`;
    }
    return `${inputs.goal.lifeExpectancy}세까지 생활비가 부족하지 않아요.`;
  }

  if (hasRealEstate && summary.propertyInterventionAge !== null) {
    return `${summary.propertyInterventionAge}세부터 집을 담보로 대출받거나 팔아야 하고, ${summary.failureAge}세부터는 생활비가 모자라요.`;
  }

  return `${summary.failureAge}세부터 생활비가 모자라요.`;
}

function buildHeadline(summary: CalculationResultV2['summary']): string {
  if (summary.failureAge === null && summary.targetGap >= 0) {
    return '목표 생활비로 기대수명까지 버틸 수 있어요.';
  }
  if (summary.failureAge === null) {
    return '목표보다 조금 낮추면 기대수명까지 버틸 수 있어요.';
  }
  return `${summary.failureAge}세부터 생활비가 모자라요.`;
}

function getRecommendedStrategyLabel(
  recommendedStrategy: PropertyOptionResult['strategy'],
  hasRealEstate: boolean,
): string {
  if (!hasRealEstate) return '집 없음(금융자산 기준)';
  return PROPERTY_STRATEGY_LABELS[recommendedStrategy] ?? recommendedStrategy;
}

export function buildResultNarrativeModel(params: {
  summary: CalculationResultV2['summary'];
  propertyOptions: CalculationResultV2['propertyOptions'];
  inputs: PlannerInputs;
  hasRealEstate: boolean;
}): ResultNarrativeModel {
  const { summary, propertyOptions, inputs, hasRealEstate } = params;
  const recommended = propertyOptions.find((option) => option.isRecommended);
  const recommendedStrategy = recommended?.strategy ?? summary.recommendedStrategy;

  const recommendedStrategyLabel = getRecommendedStrategyLabel(recommendedStrategy, hasRealEstate);

  const pensionMonthly = getTotalMonthlyPensionTodayValue(
    inputs.pension,
    inputs.status.currentAge,
    inputs.goal.retirementAge,
    inputs.status.annualIncome,
    inputs.goal.inflationRate,
  );

  const gapTone: NarrativeTone = summary.targetGap >= 0 ? 'positive' : 'negative';
  const runwayTone: NarrativeTone = summary.failureAge === null ? 'positive' : 'negative';

  const incomeLine =
    inputs.status.annualIncome > 0
      ? `은퇴 뒤 고정 수입은 연금 월 ${fmtKRW(pensionMonthly)}이에요.`
      : `은퇴 뒤 수입은 연금 월 ${fmtKRW(pensionMonthly)}만 잡았어요.`;

  const expenseLine =
    `생활비 목표는 월 ${fmtKRW(inputs.goal.targetMonthly)}으로 계산했어요.`;

  const transitionLine = buildTransitionLine(summary, inputs, hasRealEstate);

  return {
    headline: buildHeadline(summary),
    metrics: [
      {
        label: '가능한 월 생활비',
        value: `월 ${fmtKRW(summary.sustainableMonthly)}`,
      },
      {
        label: '목표와 차이',
        value: summary.targetGap >= 0 ? `+${fmtKRW(summary.targetGap)}` : `-${fmtKRW(Math.abs(summary.targetGap))}`,
        tone: gapTone,
      },
      {
        label: '유지 가능 나이',
        value: summary.failureAge === null ? `${inputs.goal.lifeExpectancy}세까지` : `${summary.failureAge}세부터 부족`,
        tone: runwayTone,
      },
    ],
    recommendedStrategyLabel,
    recommendationReasonLine: recommended?.headline ?? '현재 입력 기준으로 가장 오래 유지되는 전략이에요.',
    insightLines: [incomeLine, expenseLine, transitionLine],
  };
}
