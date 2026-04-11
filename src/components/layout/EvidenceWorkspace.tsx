import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyAssetChart from '../charts/PropertyAssetChart';
import type {
  AssumptionItem,
  YearlyAggregateV2,
  CalculationResultV2,
} from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';

interface EvidenceWorkspaceProps {
  hasRealEstate: boolean;
  chartRows: YearlyAggregateV2[];
  retirementAge: number;
  strategyLabel: string;
  inputs: PlannerInputs;
  summary: CalculationResultV2['summary'];
  assumptions: AssumptionItem[];
}

export default function EvidenceWorkspace({
  hasRealEstate,
  chartRows,
  retirementAge,
  strategyLabel,
  inputs,
  summary,
  assumptions,
}: EvidenceWorkspaceProps) {
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

      {/* 메인 카드 */}
      <div
        style={{
          borderRadius: 20,
          background: 'var(--surface-card)',
          marginBottom: 'var(--result-space-2)',
        }}
      >
        {/* 헤더 */}
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
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--result-text-strong-color)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              자산의 흐름을 그래프로 보여드릴게요
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(36,39,46,0.64)',
                display: 'block',
                lineHeight: 1.55,
                marginBottom: 10,
              }}
            >
              먼저 현금으로 생활하고, 현금이 부족해지면 주식 같은 투자 자산을 팔아 생활해요. 그래도 부족하면 경우에 따라 집을 담보로 대출하거나 판매해야 할 수 있어요.
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
            sustainableMonthly={summary.sustainableMonthly}
            inputs={inputs}
          />
        </div>
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
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--result-text-body-color)',
                display: 'block',
                marginBottom: 'var(--result-space-2)',
              }}
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
