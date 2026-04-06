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
      <div
        style={{
          fontSize: 'var(--result-text-meta)',
          fontWeight: 700,
          color: 'var(--result-text-meta-color)',
          marginBottom: 'var(--result-space-3)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        근거 확인
      </div>

      {/* 돈 흐름 */}
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--result-border-soft)',
          background: 'var(--result-surface-base)',
          overflow: 'hidden',
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
            <div
              style={{
                fontSize: 'var(--result-text-body)',
                fontWeight: 700,
                color: 'var(--result-text-strong-color)',
                marginBottom: 4,
              }}
            >
              돈 흐름
            </div>
            <div
              style={{
                fontSize: 'var(--result-text-meta)',
                color: 'var(--result-text-meta-color)',
                lineHeight: 1.55,
                marginBottom: 10,
              }}
            >
              {chartInterpretation}
            </div>
          </div>
          {hasRealEstate && (
            <span
              style={{
                fontSize: 'var(--result-text-meta)',
                fontWeight: 600,
                color: 'var(--result-accent-strong)',
                background: '#E1EDFF',
                border: '1px solid rgba(49,130,246,0.24)',
                borderRadius: 999,
                padding: '2px 8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
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
          borderRadius: 12,
          border: '1px solid var(--result-border-soft)',
          background: 'var(--result-surface-base)',
          padding: '12px 14px',
          marginBottom: 'var(--result-space-2)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--result-text-body)',
            fontWeight: 700,
            color: 'var(--result-text-strong-color)',
            marginBottom: 10,
          }}
        >
          나이별 주요 이벤트
        </div>
        <CompactLifetimeTimeline events={keyEvents} />
      </div>

      {/* 가정과 주의 */}
      <details style={{ marginTop: 0 }}>
        <summary
          style={{
            fontSize: 'var(--result-text-meta)',
            fontWeight: 700,
            color: 'var(--result-text-body-color)',
            cursor: 'pointer',
            userSelect: 'none',
            padding: '6px 2px',
          }}
        >
          가정과 주의 보기
        </summary>

        <div
          style={{
            marginTop: 'var(--result-space-2)',
            borderRadius: 10,
            border: '1px solid var(--result-border-soft)',
            background: 'var(--result-surface-base)',
            padding: '12px',
          }}
        >
          {hasRealEstate && (
            <div style={{ marginBottom: 'var(--result-space-3)' }}>
              <PropertyAssetChart rows={chartRows} retirementAge={retirementAge} />
            </div>
          )}

          {assumptions.length > 0 && (
            <div style={{ marginBottom: filteredWarnings.length > 0 ? 'var(--result-space-2)' : 0 }}>
              <div
                style={{
                  fontSize: 'var(--result-text-meta)',
                  fontWeight: 700,
                  color: 'var(--result-text-body-color)',
                  marginBottom: 'var(--result-space-2)',
                }}
              >
                주요 가정
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {assumptions.map((assumption, index) => (
                  <li
                    key={`${assumption.label}-${index}`}
                    style={{
                      fontSize: 'var(--result-text-meta)',
                      color: 'var(--result-text-body-color)',
                      lineHeight: 1.6,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--result-space-2)',
                    }}
                  >
                    <span aria-hidden style={{ fontWeight: 700, flexShrink: 0 }}>•</span>
                    <span>{assumption.label}: {assumption.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {filteredWarnings.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 'var(--result-text-meta)',
                  fontWeight: 700,
                  color: 'var(--result-text-body-color)',
                  marginBottom: 'var(--result-space-2)',
                }}
              >
                주의 사항
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredWarnings.map((warning, index) => (
                  <li
                    key={index}
                    style={{
                      borderRadius: 8,
                      border: `1px solid ${warning.severity === 'critical' ? 'var(--ux-status-negative-soft)' : 'var(--ux-status-warning-soft)'}`,
                      background: warning.severity === 'critical' ? 'var(--ux-status-negative-bg)' : 'var(--ux-status-warning-bg)',
                      color: 'var(--result-text-body-color)',
                      fontSize: 'var(--result-text-meta)',
                      fontWeight: 600,
                      lineHeight: 1.6,
                      padding: '8px 10px',
                    }}
                  >
                    {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
