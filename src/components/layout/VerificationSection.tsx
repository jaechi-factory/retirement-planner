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

interface VerificationSectionProps {
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

export default function VerificationSection({
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
}: VerificationSectionProps) {
  const filteredWarnings = warnings.filter((warning) => warning.severity !== 'info');
  const sectionSuffix = ', 돈 흐름은 이렇게 바뀌어요';
  const sectionTitle = hasRealEstate
    ? `${strategyLabel}${sectionSuffix}`
    : '입력한 조건 기준으로 돈 흐름을 확인해요';
  const sectionDescription = hasRealEstate
    ? '위에서 고른 전략 기준으로 계산했어요.'
    : '입력한 조건 기준으로 계산했어요.';
  const keyEvents = extractKeyDecisionEvents(
    chartRows,
    summary,
    propertyOptions,
    inputs,
    timelineStrategyMode,
    selectedPropertyStrategy,
  );

  return (
    <section
      style={{
        border: 'none',
        background: 'transparent',
        padding: 'var(--result-space-3) 0 0',
        marginBottom: 0,
      }}
    >
      <div
        className="verification-header-title"
        style={{
          fontSize: 'var(--result-text-title)',
          fontWeight: 600,
          color: 'var(--result-text-body-color)',
          marginBottom: 'var(--result-space-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--result-space-2)',
          borderLeft: '3px solid var(--result-accent-strong)',
          paddingLeft: 'var(--result-space-2)',
        }}
      >
        {hasRealEstate ? (
          <div className="verification-title-content" style={{ display: 'flex', alignItems: 'center', gap: 'var(--result-space-2)', minWidth: 0 }}>
            <span
              className="verification-title-pill"
              style={{
                color: 'var(--result-accent-strong)',
                fontWeight: 700,
                background: '#E1EDFF',
                border: '1px solid rgba(49, 130, 246, 0.24)',
                borderRadius: 999,
                padding: '1px 8px',
                lineHeight: 1.4,
                fontSize: 'var(--result-text-meta)',
              }}
            >
              {strategyLabel}
            </span>
            <span className="verification-title-suffix" style={{ color: 'var(--result-text-body-color)', lineHeight: 1.45 }}>
              {sectionSuffix}
            </span>
          </div>
        ) : (
          sectionTitle
        )}
      </div>
      <div
        style={{
          fontSize: 'var(--result-text-meta)',
          color: 'var(--result-text-meta-color)',
          marginBottom: 'var(--result-space-3)',
          paddingLeft: 'calc(var(--result-space-2) + 3px)',
          lineHeight: 1.55,
        }}
      >
        {sectionDescription}
      </div>

      <div
        style={{
          borderRadius: 10,
          border: '1px solid var(--result-border-soft)',
          background: 'var(--result-surface-base)',
          padding: '12px 12px 10px',
        }}
      >
        <AssetBalanceChart
          rows={chartRows}
          retirementAge={retirementAge}
          targetMonthly={inputs.goal.targetMonthly}
          inputs={inputs}
        />
      </div>

      <section
        style={{
          marginTop: 'var(--result-space-2)',
          borderRadius: 10,
          border: '1px solid var(--result-border-soft)',
          background: 'var(--result-surface-base)',
          padding: '10px 12px',
        }}
      >
        <div
          style={{
            fontSize: 'var(--result-text-meta)',
            fontWeight: 600,
            color: 'var(--result-text-body-color)',
            userSelect: 'none',
          }}
        >
          나이별 주요 이벤트
        </div>
        <div
          style={{
            marginTop: 'var(--result-space-2)',
            paddingTop: 'var(--result-space-2)',
            borderTop: '1px solid var(--result-border-subtle)',
          }}
        >
          <CompactLifetimeTimeline events={keyEvents} />
        </div>
      </section>

      <details style={{ marginTop: 'var(--result-space-2)' }}>
        <summary
          style={{
            fontSize: 'var(--result-text-meta)',
            fontWeight: 700,
            color: 'var(--result-text-body-color)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          가정과 주의 보기
        </summary>

        <div
          style={{
            marginTop: 'var(--result-space-2)',
            paddingTop: 'var(--result-space-2)',
            borderTop: '1px solid var(--result-border-subtle)',
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
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
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
                    <span aria-hidden style={{ fontWeight: 700, flexShrink: 0 }}>
                      •
                    </span>
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
