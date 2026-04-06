import { getTotalMonthlyPensionTodayValue } from '../../engine/pensionEstimation';
import type { CalculationResultV2, PropertyOptionResult } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import { fmtKRW } from '../../utils/format';

export type NarrativeTone = 'neutral' | 'positive' | 'negative';

export interface NarrativeMetric {
  label: string;
  value: string;
  tone?: NarrativeTone;
}

export interface NarrativeEvidence {
  title: '수입 흐름' | '지출 흐름' | '바뀌는 시점';
  body: string;
}

export interface ResultNarrativeModel {
  headline: string;
  metrics: [NarrativeMetric, NarrativeMetric, NarrativeMetric, NarrativeMetric];
  evidence: [NarrativeEvidence, NarrativeEvidence, NarrativeEvidence];
  recommendedStrategyLabel: string;
}

const STRATEGY_ACTION_LABELS: Record<PropertyOptionResult['strategy'], string> = {
  keep: '집을 그대로 둘 때',
  secured_loan: '집을 담보로 대출받을 때',
  sell: '집을 팔아 쓸 때',
};

function buildTransitionLine(
  summary: CalculationResultV2['summary'],
  inputs: PlannerInputs,
  hasRealEstate: boolean,
): string {
  const events: string[] = [];

  if (summary.financialSellStartAge !== null) {
    events.push(`${summary.financialSellStartAge}세부터 투자자산을 팔아 생활비를 메워요`);
  }
  if (hasRealEstate && summary.propertyInterventionAge !== null) {
    events.push(`${summary.propertyInterventionAge}세부터는 집을 담보로 대출받거나 팔아야 해요`);
  }

  if (summary.failureAge === null) {
    events.push(`${inputs.goal.lifeExpectancy}세까지 돈이 유지돼요`);
  } else {
    events.push(`${summary.failureAge}세부터 생활비가 모자라요`);
  }

  return events.join(' · ');
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

export function buildResultNarrativeModel(params: {
  summary: CalculationResultV2['summary'];
  propertyOptions: CalculationResultV2['propertyOptions'];
  inputs: PlannerInputs;
  hasRealEstate: boolean;
}): ResultNarrativeModel {
  const { summary, propertyOptions, inputs, hasRealEstate } = params;
  const recommended = propertyOptions.find((option) => option.isRecommended);
  const recommendedStrategy = recommended?.strategy ?? summary.recommendedStrategy;
  const recommendedStrategyLabel = hasRealEstate
    ? STRATEGY_ACTION_LABELS[recommendedStrategy]
    : '집 없음(금융자산 기준)';

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
      ? `은퇴 전 수입은 근로소득, 은퇴 후 수입은 연금 월 ${fmtKRW(pensionMonthly)}으로 계산했어요.`
      : `근로소득 입력이 없어 은퇴 후 수입은 연금 월 ${fmtKRW(pensionMonthly)}으로 계산했어요.`;

  const expenseLine =
    `지출은 생활비·주거비·대출상환·자녀비를 합쳐 계산했어요. (목표 월 ${fmtKRW(inputs.goal.targetMonthly)})`;

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
        label: '돈이 버티는 나이',
        value: summary.failureAge === null ? `${inputs.goal.lifeExpectancy}세까지` : `${summary.failureAge}세부터 부족`,
        tone: runwayTone,
      },
      {
        label: '추천 전략',
        value: recommendedStrategyLabel,
      },
    ],
    evidence: [
      { title: '수입 흐름', body: incomeLine },
      { title: '지출 흐름', body: expenseLine },
      { title: '바뀌는 시점', body: buildTransitionLine(summary, inputs, hasRealEstate) },
    ],
    recommendedStrategyLabel,
  };
}
