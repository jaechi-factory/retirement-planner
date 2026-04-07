import { Typography } from '@wanteddev/wds';
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
    <section style={{ marginBottom: 40 }}>
      {/* Section label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--neutral-400)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        근거 확인
      </div>

      {/* Money flow chart card */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-150)',
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        {/* Chart header */}
        <div
          style={{
            padding: '20px 24px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <Typography
              variant="body1"
              weight="bold"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--neutral-900)',
                marginBottom: 4,
              }}
            >
              돈 흐름
            </Typography>
            <Typography
              variant="caption1"
              style={{
                fontSize: 13,
                color: 'var(--neutral-500)',
                lineHeight: 1.55,
              }}
            >
              {chartInterpretation}
            </Typography>
          </div>
          {hasRealEstate && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--brand-accent)',
                background: 'var(--result-accent-soft)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {strategyLabel}
            </span>
          )}
        </div>

        {/* Chart */}
        <div style={{ padding: '0 16px 16px' }}>
          <AssetBalanceChart
            rows={chartRows}
            retirementAge={retirementAge}
            targetMonthly={inputs.goal.targetMonthly}
            strategyLabel={strategyLabel}
            inputs={inputs}
          />
        </div>
      </div>

      {/* Key events timeline card */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-150)',
          padding: '20px 24px',
          marginBottom: 12,
        }}
      >
        <Typography
          variant="body1"
          weight="bold"
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--neutral-900)',
            marginBottom: 16,
          }}
        >
          나이별 주요 이벤트
        </Typography>
        <CompactLifetimeTimeline events={keyEvents} />
      </div>

      {/* Assumptions and warnings — collapsible */}
      <details style={{ marginTop: 0 }}>
        <summary
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            padding: '12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--neutral-500)',
            }}
          >
            가정과 주의 보기
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--neutral-400)',
            }}
          >
            {assumptions.length + filteredWarnings.length}개 항목
          </span>
        </summary>

        <div
          style={{
            marginTop: 8,
            background: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--neutral-150)',
            padding: '20px 24px',
          }}
        >
          {/* Property chart if applicable */}
          {hasRealEstate && (
            <div style={{ marginBottom: 24 }}>
              <PropertyAssetChart rows={chartRows} retirementAge={retirementAge} />
            </div>
          )}

          {/* Assumptions */}
          {assumptions.length > 0 && (
            <div style={{ marginBottom: filteredWarnings.length > 0 ? 20 : 0 }}>
              <Typography
                variant="caption1"
                weight="bold"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--neutral-500)',
                  marginBottom: 12,
                  display: 'block',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                주요 가정
              </Typography>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {assumptions.map((assumption, index) => (
                  <li
                    key={`${assumption.label}-${index}`}
                    style={{
                      lineHeight: 1.6,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--neutral-300)',
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="caption1"
                      style={{
                        fontSize: 13,
                        color: 'var(--neutral-600)',
                      }}
                    >
                      {assumption.label}: {assumption.value}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {filteredWarnings.length > 0 && (
            <div>
              <Typography
                variant="caption1"
                weight="bold"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--neutral-500)',
                  marginBottom: 12,
                  display: 'block',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                주의 사항
              </Typography>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {filteredWarnings.map((warning, index) => (
                  <li
                    key={index}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${warning.severity === 'critical' ? 'var(--ux-status-negative-soft)' : 'var(--ux-status-warning-soft)'}`,
                      background: warning.severity === 'critical' ? 'var(--ux-status-negative-bg)' : 'var(--ux-status-warning-bg)',
                      lineHeight: 1.6,
                      padding: '12px 16px',
                    }}
                  >
                    <Typography
                      variant="caption1"
                      weight="medium"
                      style={{
                        fontSize: 13,
                        color: warning.severity === 'critical' ? 'var(--ux-status-negative)' : 'var(--ux-status-warning)',
                      }}
                    >
                      {warning.message}
                    </Typography>
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
