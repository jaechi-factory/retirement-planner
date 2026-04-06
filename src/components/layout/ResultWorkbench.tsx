import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { calcFinancialTotalAsset } from '../../engine/assetWeighting';
import { PROPERTY_STRATEGY_LABELS } from '../../engine/propertyStrategiesV2';
import type {
  PropertyOptionResult,
  RecommendationModeV2,
} from '../../types/calculationV2';
import InsightLinesSection from './InsightLinesSection';
import HouseDecisionSection from './HouseDecisionSection';
import VerificationSection from './VerificationSection';
import { buildResultNarrativeModel, type NarrativeMetric, type ResultNarrativeModel } from './resultNarrative';
import type { HouseDecisionStrategy } from './houseDecisionVM';

const RECOMMENDATION_MODE_LABELS: Record<RecommendationModeV2, string> = {
  keep_priority: '안전 우선',
  max_sustainable: '최대 생활비',
};

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
  return b.finalNetWorth - a.finalNetWorth;
}

function pickRecommendedForMode(
  options: PropertyOptionResult[],
  mode: RecommendationModeV2,
): PropertyOptionResult['strategy'] {
  if (mode === 'max_sustainable') {
    return [...options].sort(compareBySustainableDesc)[0].strategy;
  }

  const keepOption = options.find((option) => option.strategy === 'keep');
  if (keepOption && keepOption.survivesToLifeExpectancy) return 'keep';

  const surviving = options.filter((option) => option.survivesToLifeExpectancy);
  if (surviving.length > 0) {
    return [...surviving].sort((a, b) => b.sustainableMonthly - a.sustainableMonthly)[0].strategy;
  }

  const sorted = [...options].sort((a, b) => {
    const aFail = a.failureAge ?? Infinity;
    const bFail = b.failureAge ?? Infinity;
    if (aFail !== bFail) return bFail - aFail;
    if (a.sustainableMonthly !== b.sustainableMonthly) return b.sustainableMonthly - a.sustainableMonthly;
    return b.finalNetWorth - a.finalNetWorth;
  });
  return sorted[0].strategy;
}

function EmptyStateCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--ux-border-strong)',
        background: 'var(--ux-surface)',
        padding: '56px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 28, color: 'var(--ux-text-subtle)' }}>—</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ux-text-base)', textAlign: 'center' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--ux-text-subtle)', textAlign: 'center', lineHeight: 1.7 }}>{body}</div>
    </div>
  );
}

function RecommendationModeSwitch({
  mode,
  onChange,
}: {
  mode: RecommendationModeV2;
  onChange: (mode: RecommendationModeV2) => void;
}) {
  const buttonStyle = (active: boolean): CSSProperties => ({
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--result-accent-muted)' : 'var(--result-border-soft)'}`,
    background: active ? 'var(--result-accent-soft)' : 'transparent',
    color: active ? 'var(--result-accent-muted)' : 'var(--ux-text-subtle)',
    fontSize: 'var(--result-text-meta)',
    fontWeight: 600,
    padding: '6px 11px',
    cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--result-space-2)', marginBottom: 'var(--result-space-4)' }}>
      <button type="button" style={buttonStyle(mode === 'keep_priority')} onClick={() => onChange('keep_priority')}>
        안전 우선
      </button>
      <button type="button" style={buttonStyle(mode === 'max_sustainable')} onClick={() => onChange('max_sustainable')}>
        최대 생활비
      </button>
    </div>
  );
}

function metricToneColor(tone?: NarrativeMetric['tone']): string {
  if (tone === 'positive') return 'var(--ux-status-positive)';
  if (tone === 'negative') return 'var(--ux-status-negative)';
  return 'var(--ux-text-strong)';
}

function ReportConclusionSection({
  model,
  mode,
  hasRealEstate,
}: {
  model: ResultNarrativeModel;
  mode: RecommendationModeV2;
  hasRealEstate: boolean;
}) {
  return (
    <section
      style={{
        borderRadius: 16,
        border: '1px solid var(--result-border-soft)',
        background: 'var(--result-surface-base)',
        padding: 'var(--result-space-5)',
        marginBottom: 'var(--result-space-4)',
      }}
    >
      <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--ux-text-subtle)', marginBottom: 'var(--result-space-2)' }}>
        {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · {RECOMMENDATION_MODE_LABELS[mode]}
      </div>

      <div
        style={{
          fontSize: 'var(--result-text-display)',
          fontWeight: 800,
          color: 'var(--ux-text-strong)',
          lineHeight: 1.26,
          letterSpacing: '-0.02em',
          marginBottom: 'var(--result-space-5)',
        }}
      >
        {model.headline}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 'var(--result-space-2)',
          marginBottom: 'var(--result-space-4)',
        }}
      >
        {model.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              borderRadius: 8,
              border: '1px solid var(--result-border-soft)',
              background: 'var(--result-surface-metric)',
              padding: 'var(--result-space-3)',
              minHeight: 64,
            }}
          >
            <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--ux-text-subtle)', marginBottom: 'var(--result-space-1)' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: 'var(--result-text-metric)', fontWeight: 700, color: metricToneColor(metric.tone), lineHeight: 1.3 }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--result-border-soft)', paddingTop: 'var(--result-space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--result-space-2)', marginBottom: 'var(--result-space-1)' }}>
          <span style={{ fontSize: 'var(--result-text-meta)', color: 'var(--ux-text-subtle)' }}>권장 전략</span>
          <span style={{ fontSize: 'var(--result-text-title)', fontWeight: 700, color: 'var(--ux-text-strong)' }}>{model.recommendedStrategyLabel}</span>
        </div>
        <div style={{ fontSize: 'var(--result-text-body)', color: 'var(--ux-text-base)', lineHeight: 1.55 }}>{model.recommendationReasonLine}</div>
      </div>
    </section>
  );
}

export default function ResultWorkbench() {
  const resultV2 = usePlannerStore((state) => state.resultV2);
  const result = usePlannerStore((state) => state.result);
  const inputs = usePlannerStore((state) => state.inputs);
  const recommendationMode = usePlannerStore((state) => state.recommendationMode);
  const setRecommendationMode = usePlannerStore((state) => state.setRecommendationMode);

  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  const financialAssetTotal = calcFinancialTotalAsset(inputs.assets);

  const preferredStrategy = useMemo<HouseDecisionStrategy>(() => {
    if (!resultV2 || !hasRealEstate) return 'keep';
    const recommended = resultV2.propertyOptions.find((option) => option.isRecommended);
    return recommended?.strategy ?? resultV2.summary.recommendedStrategy;
  }, [resultV2, hasRealEstate]);

  const [selectedStrategy, setSelectedStrategy] = useState<HouseDecisionStrategy>(preferredStrategy);
  const [isStrategyTouchedByUser, setIsStrategyTouchedByUser] = useState(false);

  useEffect(() => {
    setSelectedStrategy(preferredStrategy);
    setIsStrategyTouchedByUser(false);
  }, [preferredStrategy]);

  const handleSelectStrategy = (strategy: HouseDecisionStrategy) => {
    setSelectedStrategy(strategy);
    setIsStrategyTouchedByUser(true);
  };

  if (inputs.status.currentAge > 0 && inputs.goal.retirementAge > 0 && inputs.status.currentAge >= inputs.goal.retirementAge) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          padding: '24px 20px',
          borderLeft: '1px solid var(--ux-border-strong)',
        }}
      >
        <EmptyStateCard
          title="이 계산기는 은퇴 전 준비 단계에 맞춰져 있어요"
          body="현재 나이가 은퇴 나이 이상으로 설정돼 있어요. 왼쪽에서 현재 나이 또는 은퇴 나이를 조정해 주세요."
        />
      </div>
    );
  }

  if (result.isValid && financialAssetTotal === 0) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          padding: '24px 20px',
          borderLeft: '1px solid var(--ux-border-strong)',
        }}
      >
        <EmptyStateCard
          title="금융자산을 입력하면 결과를 볼 수 있어요"
          body="현금·예적금·주식 중 하나 이상 입력해 주세요. 부동산만으로는 계산이 어려워요."
        />
      </div>
    );
  }

  if (!resultV2 || !result.isValid) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          padding: '24px 20px',
          borderLeft: '1px solid var(--ux-border-strong)',
        }}
      >
        <EmptyStateCard
          title="입력하면 결과 리포트가 바로 나와요"
          body="왼쪽에서 나이, 은퇴 나이, 기대수명, 목표 생활비를 입력해 주세요."
        />
      </div>
    );
  }

  const { summary, propertyOptions, detailYearlyAggregates, assumptions, warnings } = resultV2;
  const recommended =
    propertyOptions.find((option) => option.isRecommended)
    ?? propertyOptions.find((option) => option.strategy === summary.recommendedStrategy)
    ?? null;

  const keepPriorityPick = pickRecommendedForMode(propertyOptions, 'keep_priority');
  const maxSustainablePick = pickRecommendedForMode(propertyOptions, 'max_sustainable');
  const modeHasMeaningfulDifference = keepPriorityPick !== maxSustainablePick;

  const timelineStrategyMode: 'recommended' | 'selected' = hasRealEstate && isStrategyTouchedByUser ? 'selected' : 'recommended';

  const selectedOption = propertyOptions.find((option) => option.strategy === selectedStrategy) ?? null;
  const verificationOption = timelineStrategyMode === 'selected' ? selectedOption : recommended;

  const chartRows = verificationOption?.yearlyAggregates?.length
    ? verificationOption.yearlyAggregates
    : detailYearlyAggregates;

  const chartStrategy: PropertyOptionResult['strategy'] = verificationOption?.strategy ?? recommended?.strategy ?? 'keep';
  const chartLabel = hasRealEstate
    ? (PROPERTY_STRATEGY_LABELS[chartStrategy] ?? chartStrategy)
    : '집 없음(금융자산 기준)';

  const narrative = buildResultNarrativeModel({
    summary,
    propertyOptions,
    inputs,
    hasRealEstate,
  });

  const selectedPropertyStrategy = timelineStrategyMode === 'selected' && hasRealEstate
    ? selectedStrategy
    : null;

  return (
    <div
      style={{
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '32px 28px 64px',
        scrollbarWidth: 'thin',
        borderLeft: '1px solid var(--ux-border-strong)',
        background: 'var(--ux-surface-subtle)',
      }}
    >
      <ReportConclusionSection model={narrative} mode={summary.recommendationMode} hasRealEstate={hasRealEstate} />

      {hasRealEstate && modeHasMeaningfulDifference && (
        <RecommendationModeSwitch mode={recommendationMode} onChange={setRecommendationMode} />
      )}

      <InsightLinesSection lines={narrative.insightLines} />

      <HouseDecisionSection
        hasRealEstate={hasRealEstate}
        propertyOptions={propertyOptions}
        selectedStrategy={selectedStrategy}
        lifeExpectancy={inputs.goal.lifeExpectancy}
        onSelectStrategy={handleSelectStrategy}
      />

      <VerificationSection
        hasRealEstate={hasRealEstate}
        chartRows={chartRows}
        retirementAge={inputs.goal.retirementAge}
        strategyLabel={chartLabel}
        inputs={inputs}
        summary={summary}
        propertyOptions={propertyOptions}
        assumptions={assumptions}
        warnings={warnings}
        timelineStrategyMode={timelineStrategyMode}
        selectedPropertyStrategy={selectedPropertyStrategy}
      />
    </div>
  );
}
