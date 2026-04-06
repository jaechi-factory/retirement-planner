import { useEffect, useMemo, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { calcFinancialTotalAsset } from '../../engine/assetWeighting';
import { PROPERTY_STRATEGY_LABELS } from '../../engine/propertyStrategiesV2';
import type { PropertyOptionResult } from '../../types/calculationV2';
import InsightLinesSection from './InsightLinesSection';
import HouseDecisionSection from './HouseDecisionSection';
import VerificationSection from './VerificationSection';
import { buildResultNarrativeModel, type NarrativeMetric, type ResultNarrativeModel } from './resultNarrative';
import type { HouseDecisionStrategy } from './houseDecisionVM';
import { resolveSelectedStrategy } from './selectedStrategy';

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

function metricToneColor(tone?: NarrativeMetric['tone']): string {
  if (tone === 'positive') return 'var(--ux-status-positive)';
  if (tone === 'negative') return 'var(--ux-status-negative)';
  return 'var(--result-text-value-strong-color)';
}

function ReportConclusionSection({
  model,
  hasRealEstate,
}: {
  model: ResultNarrativeModel;
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
      <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)', marginBottom: 'var(--result-space-2)' }}>
        {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · 최대 생활비
      </div>

      <div
        style={{
          fontSize: 'var(--result-text-display)',
          fontWeight: 800,
          color: 'var(--result-text-strong-color)',
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
            <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)', marginBottom: 'var(--result-space-1)' }}>
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
          <span style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)' }}>권장 전략</span>
          <span style={{ fontSize: 'var(--result-text-title)', fontWeight: 700, color: 'var(--result-text-strong-color)' }}>{model.recommendedStrategyLabel}</span>
        </div>
        <div style={{ fontSize: 'var(--result-text-body)', color: 'var(--result-text-body-color)', lineHeight: 1.55 }}>
          {model.recommendationReasonLine}
        </div>
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

  const [selectedStrategy, setSelectedStrategy] = useState<HouseDecisionStrategy>('sell');

  useEffect(() => {
    if (recommendationMode !== 'max_sustainable') {
      setRecommendationMode('max_sustainable');
    }
  }, [recommendationMode, setRecommendationMode]);

  const recommendedStrategy = useMemo<HouseDecisionStrategy | null>(() => {
    if (!resultV2) return null;
    const recommendedOption = resultV2.propertyOptions.find((option) => option.isRecommended);
    return recommendedOption?.strategy ?? resultV2.summary.recommendedStrategy;
  }, [resultV2]);

  useEffect(() => {
    if (!resultV2 || !hasRealEstate) return;
    const next = resolveSelectedStrategy({
      propertyOptions: resultV2.propertyOptions,
      currentSelected: selectedStrategy,
      recommendedStrategy,
    });

    if (next && next !== selectedStrategy) {
      setSelectedStrategy(next);
    }
  }, [resultV2, hasRealEstate, recommendedStrategy, selectedStrategy]);

  const handleSelectStrategy = (strategy: HouseDecisionStrategy) => {
    setSelectedStrategy(strategy);
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

  const selectedOption = propertyOptions.find(
    (option) => option.strategy === selectedStrategy && option.yearlyAggregates.length > 0,
  ) ?? null;
  const verificationOption = hasRealEstate ? selectedOption : recommended;
  const timelineStrategyMode: 'recommended' | 'selected' = hasRealEstate ? 'selected' : 'recommended';

  const chartRows = verificationOption?.yearlyAggregates?.length
    ? verificationOption.yearlyAggregates
    : detailYearlyAggregates;

  const chartStrategy: PropertyOptionResult['strategy'] = verificationOption?.strategy ?? recommended?.strategy ?? selectedStrategy;
  const chartLabel = hasRealEstate
    ? (PROPERTY_STRATEGY_LABELS[chartStrategy] ?? chartStrategy)
    : '집 없음(금융자산 기준)';

  const narrative = buildResultNarrativeModel({
    summary,
    propertyOptions,
    inputs,
    hasRealEstate,
  });

  const selectedPropertyStrategy = hasRealEstate
    ? chartStrategy
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
      <ReportConclusionSection model={narrative} hasRealEstate={hasRealEstate} />

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
