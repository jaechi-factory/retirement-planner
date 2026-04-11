import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyAssetChart from '../charts/PropertyAssetChart';
import FundingPathSection from './FundingPathSection';
import type {
  AssumptionItem,
  FundingStage,
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
  fundingTimeline: FundingStage[];
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
  fundingTimeline,
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
    <section style={{ marginBottom: 40 }}>
      {/* 섹션 레이블 */}
      <div style={{ marginBottom: 14 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-faint)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          돈이 어떻게 흘러가나
        </span>
      </div>

      {/* 자금 전환 타임라인 — FundingPath 통합 */}
      {fundingTimeline.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <FundingPathSection
            fundingTimeline={fundingTimeline}
            lifeExpectancy={inputs.goal.lifeExpectancy}
            retirementAge={retirementAge}
          />
        </div>
      )}

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
          <span
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-status-warning)', display: 'block', marginBottom: 2 }}
          >
            주의사항
          </span>
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
              <span style={{ fontSize: 12, color: 'var(--result-text-body-color)', lineHeight: 1.6, display: 'block' }}>
                {warning.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 돈 흐름 */}
      <div
        style={{
          borderRadius: 20,
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
            <span
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--result-text-strong-color)', display: 'block', marginBottom: 4 }}
            >
              돈 흐름
            </span>
            <span
              style={{ fontSize: 12, color: 'rgba(36,39,46,0.64)', display: 'block', lineHeight: 1.55, marginBottom: 10 }}
            >
              {chartInterpretation}
            </span>
          </div>
          {hasRealEstate && (
            <span
              style={{
                color: 'var(--text-strong)',
                background: 'var(--accent-selected-bg)',
                border: 'none',
                borderRadius: 999,
                padding: '2px 8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontWeight: 600,
                fontSize: 12,
                display: 'inline-block',
              }}
            >
              {strategyLabel}
            </span>
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
          borderRadius: 20,
          background: 'var(--surface-card)',
          padding: '12px 14px',
          marginBottom: 'var(--result-space-2)',
        }}
      >
        <span
          style={{ fontSize: 15, fontWeight: 700, color: 'var(--result-text-strong-color)', display: 'block', marginBottom: 10 }}
        >
          나이별 주요 이벤트
        </span>
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
            <span
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--result-text-body-color)' }}
            >
              계산 가정 보기
            </span>
          </summary>

          <div
            style={{
              marginTop: 'var(--result-space-2)',
              borderRadius: 20,
              background: 'var(--surface-card)',
              padding: '12px',
            }}
          >
            {hasRealEstate && (
              <div style={{ marginBottom: 'var(--result-space-3)' }}>
                <PropertyAssetChart rows={chartRows} retirementAge={retirementAge} />
              </div>
            )}

            <span
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--result-text-body-color)', display: 'block', marginBottom: 'var(--result-space-2)' }}
            >
              주요 가정
            </span>
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
                  <span style={{ fontSize: 12, color: 'var(--result-text-body-color)' }}>
                    {assumption.label}: {assumption.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </section>
  );
}
