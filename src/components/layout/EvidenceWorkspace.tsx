import { ContentBadge, SectionHeader, Typography } from '@wanteddev/wds';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyAssetChart from '../charts/PropertyAssetChart';
import type {
  AssumptionItem,
  WarningItem,
  PropertyOptionResult,
  YearlyAggregateV2,
  CalculationResultV2,
} from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import { extractKeyDecisionEvents } from '../../engine/timelineBuilder';
import { CompactLifetimeTimeline } from '../result/v3/LifetimeTimeline';

interface EvidenceWorkspaceProps {
  hasRealEstate: boolean;
  chartRows: YearlyAggregateV2[];
  retirementAge: number;
  strategyLabel: string;
  inputs: PlannerInputs;
  summary: CalculationResultV2['summary'];
  propertyOptions: PropertyOptionResult[];
  assumptions: AssumptionItem[];
  warnings: WarningItem[];
  timelineStrategyMode: 'recommended' | 'selected';
  selectedPropertyStrategy: PropertyOptionResult['strategy'] | null;
}

function buildChartInterpretation(
  summary: CalculationResultV2['summary'],
  hasRealEstate: boolean,
  lifeExpectancy: number,
): string {
  const { financialExhaustionAge, propertyInterventionAge, failureAge } = summary;

  if (failureAge !== null) {
    if (hasRealEstate && propertyInterventionAge !== null) {
      return `${propertyInterventionAge}세부터 집이 필요하고, ${failureAge}세부터 생활비가 부족해요.`;
    }
    return `${failureAge}세부터 생활비가 부족해져요. 자산 규모나 목표 생활비 조정이 필요해요.`;
  }

  if (financialExhaustionAge !== null) {
    if (hasRealEstate && propertyInterventionAge !== null) {
      return `${financialExhaustionAge}세 무렵 투자자산이 소진되고, ${propertyInterventionAge}세부터 집을 활용해요. ${lifeExpectancy}세까지 유지돼요.`;
    }
    return `${financialExhaustionAge}세 무렵 투자자산이 소진돼요. 그 이후엔 현금성 자산으로 ${lifeExpectancy}세까지 버텨요.`;
  }

  return `${lifeExpectancy}세까지 금융자산이 유지돼요.`;
}

export default function EvidenceWorkspace({
  hasRealEstate,
  chartRows,
  retirementAge,
  strategyLabel,
  inputs,
  summary,
  propertyOptions,
  assumptions,
  warnings,
  timelineStrategyMode,
  selectedPropertyStrategy,
}: EvidenceWorkspaceProps) {
  const filteredWarnings = warnings.filter((warning) => warning.severity !== 'info');
  const chartInterpretation = buildChartInterpretation(summary, hasRealEstate, inputs.goal.lifeExpectancy);

  const keyEvents = extractKeyDecisionEvents(
    chartRows,
    summary,
    propertyOptions,
    inputs,
    timelineStrategyMode,
    selectedPropertyStrategy,
  );

  return (
    <section style={{ marginBottom: 'var(--result-space-5)' }}>
      {/* 섹션 레이블 */}
      <SectionHeader
        headingContent="자산 흐름"
        size="small"
        headingTag="h2"
        style={{
          letterSpacing: '0.01em',
          marginBottom: 'var(--result-space-3)',
        }}
      />

      {/* 주의사항 — collapsible 밖으로 꺼내어 항상 표시 */}
      {filteredWarnings.length > 0 && (
        <div
          style={{
            borderRadius: 10,
            border: '1px solid var(--ux-status-warning-soft)',
            background: 'var(--ux-status-warning-bg)',
            padding: '10px 14px',
            marginBottom: 'var(--result-space-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <Typography
            variant="caption1"
            weight="bold"
            style={{ color: 'var(--ux-status-warning)', display: 'block', marginBottom: 2 }}
          >
            주의사항
          </Typography>
          {filteredWarnings.map((warning, index) => (
            <div
              key={index}
              style={{
                borderRadius: 6,
                border: `1px solid ${warning.severity === 'critical' ? 'var(--ux-status-negative-soft)' : 'var(--ux-status-warning-soft)'}`,
                background: warning.severity === 'critical' ? 'var(--ux-status-negative-bg)' : 'transparent',
                padding: '6px 10px',
              }}
            >
              <Typography
                variant="caption1"
                style={{ color: 'var(--result-text-body-color)', lineHeight: 1.6 }}
              >
                {warning.message}
              </Typography>
            </div>
          ))}
        </div>
      )}

      {/* 돈 흐름 */}
      <div
        style={{
          borderRadius: 12,
          background: 'var(--surface-card)',
          marginBottom: 'var(--result-space-2)',
        }}
      >
        {/* 돈 흐름 헤더 */}
        <div
          style={{
            padding: '12px 16px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--result-space-3)',
          }}
        >
          <div>
            <Typography
              variant="body1"
              weight="bold"
              style={{ color: 'var(--result-text-strong-color)', display: 'block', marginBottom: 4 }}
            >
              돈 흐름
            </Typography>
            <Typography
              variant="caption1"
              color="semantic.label.alternative"
              style={{ display: 'block', lineHeight: 1.55, marginBottom: 10 }}
            >
              {chartInterpretation}
            </Typography>
          </div>
          {hasRealEstate && (
            <ContentBadge
              variant="solid"
              size="xsmall"
              style={{
                color: 'var(--text-strong)',
                background: 'var(--accent-selected-bg)',
                border: 'none',
                borderRadius: 999,
                padding: '2px 8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontWeight: 600,
              }}
            >
              {strategyLabel}
            </ContentBadge>
          )}
        </div>

        {/* 차트 */}
        <div style={{ padding: '0 12px 10px' }}>
          <AssetBalanceChart
            rows={chartRows}
            retirementAge={retirementAge}
            targetMonthly={inputs.goal.targetMonthly}
            strategyLabel={strategyLabel}
            inputs={inputs}
          />
        </div>
      </div>

      {/* 나이별 주요 이벤트 */}
      <div
        style={{
          borderRadius: 12,
          background: 'var(--surface-card)',
          padding: '12px 14px',
          marginBottom: 'var(--result-space-2)',
        }}
      >
        <Typography
          variant="body1"
          weight="bold"
          style={{ color: 'var(--result-text-strong-color)', display: 'block', marginBottom: 10 }}
        >
          나이별 주요 이벤트
        </Typography>
        <CompactLifetimeTimeline events={keyEvents} />
      </div>

      {/* 계산 가정 (collapsible) */}
      {assumptions.length > 0 && (
        <details style={{ marginTop: 0 }}>
          <summary
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 2px',
            }}
          >
            <Typography
              as="span"
              variant="caption1"
              weight="bold"
              style={{ color: 'var(--result-text-body-color)' }}
            >
              계산 가정 보기
            </Typography>
          </summary>

          <div
            style={{
              marginTop: 'var(--result-space-2)',
              borderRadius: 10,
              background: 'var(--surface-card)',
              padding: '12px',
            }}
          >
            {hasRealEstate && (
              <div style={{ marginBottom: 'var(--result-space-3)' }}>
                <PropertyAssetChart rows={chartRows} retirementAge={retirementAge} />
              </div>
            )}

            <Typography
              variant="caption1"
              weight="bold"
              style={{ color: 'var(--result-text-body-color)', display: 'block', marginBottom: 'var(--result-space-2)' }}
            >
              주요 가정
            </Typography>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {assumptions.map((assumption, index) => (
                <li
                  key={`${assumption.label}-${index}`}
                  style={{
                    lineHeight: 1.6,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--result-space-2)',
                  }}
                >
                  <span aria-hidden style={{ fontWeight: 700, flexShrink: 0 }}>•</span>
                  <Typography variant="caption1" style={{ color: 'var(--result-text-body-color)' }}>
                    {assumption.label}: {assumption.value}
                  </Typography>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </section>
  );
}
