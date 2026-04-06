import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { calcFinancialTotalAsset } from '../../engine/assetWeighting';
import type {
  AssumptionItem,
  FundingStage,
  PropertyOptionResult,
  RecommendationModeV2,
  WarningItem,
  YearlyAggregateV2,
  CalculationResultV2,
} from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import FundingTimeline from '../result/v2/FundingTimeline';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyAssetChart from '../charts/PropertyAssetChart';
import ScenarioTabs from '../result/v3/ScenarioTabs';
import LifetimeTimeline from '../result/v3/LifetimeTimeline';
import { buildResultNarrativeModel, type NarrativeMetric, type ResultNarrativeModel } from './resultNarrative';

const SCENARIO_ACTION_LABELS: Record<string, string> = {
  keep: '집을 그대로 둘 때',
  secured_loan: '집을 담보로 대출받을 때',
  sell: '집을 팔아 쓸 때',
};

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
        marginBottom: 14,
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
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
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
    </section>
  );
}

function EvidenceSection({ evidence }: { evidence: ResultNarrativeModel['evidence'] }) {
  return (
    <section
      style={{
        borderRadius: 14,
        border: '1px solid var(--ux-border-strong)',
        background: 'var(--ux-surface)',
        padding: '16px 18px',
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-muted)', marginBottom: 12 }}>
        왜 이런 결과가 나왔나요?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {evidence.map((item) => (
          <div
            key={item.title}
            style={{
              borderRadius: 10,
              border: '1px solid var(--ux-border)',
              background: 'var(--ux-surface-muted)',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-strong)', marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ux-text-base)' }}>{item.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SupplementPanel({
  hasRealEstate,
  assumptions,
  warnings,
  chartRows,
  retirementAge,
}: {
  hasRealEstate: boolean;
  assumptions: Array<{ label: string; value: string }>;
  warnings: Array<{ severity: 'info' | 'warning' | 'critical'; message: string }>;
  chartRows: Parameters<typeof PropertyAssetChart>[0]['rows'];
  retirementAge: number;
}) {
  const filteredWarnings = warnings.filter((warning) => warning.severity !== 'info');

  return (
    <details style={{ marginTop: 14 }}>
      <summary
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--ux-accent)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        가정과 참고 그래프 보기
      </summary>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ux-border)' }}>
        {hasRealEstate && (
          <div style={{ marginBottom: 12 }}>
            <PropertyAssetChart rows={chartRows} retirementAge={retirementAge} />
          </div>
        )}

        {assumptions.length > 0 && (
          <div style={{ marginBottom: filteredWarnings.length > 0 ? 10 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-muted)', marginBottom: 8 }}>주요 가정</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {assumptions.map((assumption, i) => (
                <div key={`${assumption.label}-${i}`} style={{ fontSize: 12, color: 'var(--ux-text-base)', lineHeight: 1.6 }}>
                  {assumption.label}: {assumption.value}
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredWarnings.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-muted)', marginBottom: 8 }}>주의 사항</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredWarnings.map((warning, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${warning.severity === 'critical' ? 'var(--ux-status-negative-soft)' : 'var(--ux-status-warning-soft)'}`,
                    background: warning.severity === 'critical' ? 'var(--ux-status-negative-bg)' : 'var(--ux-status-warning-bg)',
                    color: 'var(--ux-text-base)',
                    fontSize: 12,
                    lineHeight: 1.6,
                    padding: '8px 10px',
                  }}
                >
                  {warning.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function DetailSection({
  hasRealEstate,
  selectedStrategy,
  onStrategyChange,
  propertyOptions,
  lifeExpectancy,
  fundingTimeline,
  retirementAge,
  detailYearlyAggregates,
  summary,
  inputs,
  strategyLabel,
  assumptions,
  warnings,
}: {
  hasRealEstate: boolean;
  selectedStrategy: 'sell' | 'secured_loan';
  onStrategyChange: (strategy: 'sell' | 'secured_loan') => void;
  propertyOptions: PropertyOptionResult[];
  lifeExpectancy: number;
  fundingTimeline: FundingStage[];
  retirementAge: number;
  detailYearlyAggregates: YearlyAggregateV2[];
  summary: CalculationResultV2['summary'];
  inputs: PlannerInputs;
  strategyLabel: string;
  assumptions: AssumptionItem[];
  warnings: WarningItem[];
}) {
  return (
    <section
      style={{
        borderRadius: 14,
        border: '1px solid var(--ux-border-strong)',
        background: 'var(--ux-surface)',
        padding: '16px 18px',
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-muted)', marginBottom: 12 }}>상세 분석</div>

      {hasRealEstate && (
        <ScenarioTabs
          propertyOptions={propertyOptions}
          lifeExpectancy={lifeExpectancy}
          activeStrategy={selectedStrategy}
          onStrategyChange={onStrategyChange}
        />
      )}

      {fundingTimeline.length > 0 && (
        <FundingTimeline
          stages={fundingTimeline}
          retirementAge={retirementAge}
          lifeExpectancy={lifeExpectancy}
        />
      )}

      <LifetimeTimeline
        detailYearlyAggregates={detailYearlyAggregates}
        summary={summary}
        propertyOptions={propertyOptions}
        inputs={inputs}
        selectedStrategy={hasRealEstate ? selectedStrategy : undefined}
      />

      <div
        style={{
          marginTop: 14,
          borderRadius: 12,
          border: '1px solid var(--ux-border)',
          background: 'var(--ux-surface-muted)',
          padding: '12px 12px 10px',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-muted)', marginBottom: 8 }}>핵심 자산 흐름</div>
        <AssetBalanceChart
          rows={detailYearlyAggregates}
          retirementAge={retirementAge}
          targetMonthly={inputs.goal.targetMonthly}
          strategyLabel={strategyLabel}
          inputs={inputs}
        />
      </div>

      <SupplementPanel
        hasRealEstate={hasRealEstate}
        assumptions={assumptions}
        warnings={warnings}
        chartRows={detailYearlyAggregates}
        retirementAge={retirementAge}
      />
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

  const preferredStrategy = useMemo<'sell' | 'secured_loan'>(() => {
    if (!resultV2 || !hasRealEstate) return 'sell';
    const recommended = resultV2.propertyOptions.find((option) => option.isRecommended);
    return recommended?.strategy === 'secured_loan' ? 'secured_loan' : 'sell';
  }, [resultV2, hasRealEstate]);

  const [selectedStrategy, setSelectedStrategy] = useState<'sell' | 'secured_loan'>(preferredStrategy);

  useEffect(() => {
    setSelectedStrategy(preferredStrategy);
  }, [preferredStrategy]);

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

  const { summary, propertyOptions, fundingTimeline, detailYearlyAggregates, assumptions, warnings } = resultV2;
  const recommended = propertyOptions.find((option) => option.isRecommended);
  const keepPriorityPick = pickRecommendedForMode(propertyOptions, 'keep_priority');
  const maxSustainablePick = pickRecommendedForMode(propertyOptions, 'max_sustainable');
  const modeHasMeaningfulDifference = keepPriorityPick !== maxSustainablePick;

  const selectedOption = hasRealEstate
    ? propertyOptions.find((option) => option.strategy === selectedStrategy)
      ?? propertyOptions.find((option) => option.strategy === 'sell' || option.strategy === 'secured_loan')
    : null;

  const chartRows = selectedOption ? selectedOption.yearlyAggregates : detailYearlyAggregates;
  const chartLabel = hasRealEstate
    ? (SCENARIO_ACTION_LABELS[selectedStrategy] ?? selectedStrategy)
    : (SCENARIO_ACTION_LABELS[recommended?.strategy ?? ''] ?? '집 없음(금융자산 기준)');

  const narrative = buildResultNarrativeModel({
    summary,
    propertyOptions,
    inputs,
    hasRealEstate,
  });

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
      {hasRealEstate && modeHasMeaningfulDifference && (
        <RecommendationModeSwitch
          mode={recommendationMode}
          onChange={setRecommendationMode}
        />
      )}
      {hasRealEstate && !modeHasMeaningfulDifference && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: 'var(--ux-text-subtle)',
            lineHeight: 1.6,
          }}
        >
          현재 입력에서는 두 모드 결과가 같아요.
        </div>
      )}

      <ReportConclusionSection model={narrative} mode={summary.recommendationMode} hasRealEstate={hasRealEstate} />
      <EvidenceSection evidence={narrative.evidence} />

      <DetailSection
        hasRealEstate={hasRealEstate}
        selectedStrategy={selectedStrategy}
        onStrategyChange={setSelectedStrategy}
        propertyOptions={propertyOptions}
        lifeExpectancy={inputs.goal.lifeExpectancy}
        fundingTimeline={fundingTimeline}
        retirementAge={inputs.goal.retirementAge}
        detailYearlyAggregates={chartRows}
        summary={summary}
        inputs={inputs}
        strategyLabel={chartLabel}
        assumptions={assumptions}
        warnings={warnings}
      />
    </div>
  );
}
