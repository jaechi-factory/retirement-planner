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
    border: `1px solid ${active ? 'var(--ux-accent)' : 'var(--ux-border-strong)'}`,
    background: active ? 'var(--ux-accent-soft)' : 'var(--ux-surface)',
    color: active ? 'var(--ux-accent)' : 'var(--ux-text-muted)',
    fontSize: 12,
    fontWeight: 700,
    padding: '8px 12px',
    cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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
        borderRadius: 14,
        border: '1px solid var(--ux-border-strong)',
        background: 'var(--ux-surface)',
        padding: '20px 22px',
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--ux-text-subtle)', marginBottom: 6 }}>
        {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · {RECOMMENDATION_MODE_LABELS[mode]}
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ux-text-strong)', lineHeight: 1.4, marginBottom: 14 }}>
        {model.headline}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {model.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              borderRadius: 10,
              border: '1px solid var(--ux-border)',
              background: 'var(--ux-surface-muted)',
              padding: '10px 12px',
              minHeight: 72,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--ux-text-subtle)', marginBottom: 4 }}>{metric.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: metricToneColor(metric.tone), lineHeight: 1.4 }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--ux-border)', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--ux-text-subtle)' }}>권장 전략</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ux-text-strong)' }}>{model.recommendedStrategyLabel}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ux-text-base)', lineHeight: 1.6 }}>{model.recommendationReasonLine}</div>
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
        padding: '28px 24px 56px',
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
