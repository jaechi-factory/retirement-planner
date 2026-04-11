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
      {/* 메인 카드 */}
      <div
        style={{
          borderRadius: 32,
          background: '#ffffff',
          padding: '28px 32px',
          boxShadow: '0px 2px 8px 4px rgba(121,158,195,0.08)',
          marginBottom: 'var(--result-space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* 헤더: 타이틀 + 설명 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--result-space-3)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#191f28',
                fontFamily: 'Pretendard, sans-serif',
                lineHeight: 1.5,
              }}
            >
              자산의 흐름을 그래프로 보여드릴게요
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 400,
                color: '#4e5968',
                fontFamily: 'Pretendard, sans-serif',
                lineHeight: 1.5,
              }}
            >
              먼저 현금으로 생활하고, 현금이 부족해지면 주식 같은 투자 자산을 팔아 생활해요. 그래도 부족하면 경우에 따라 집을 담보로 대출하거나 판매해야 할 수 있어요.
            </p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: '#3182f6',
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            기대 수명까지 예측 그래프
          </p>
          <div
            style={{
              background: '#f9fafb',
              borderRadius: 20,
              padding: 16,
            }}
          >
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
