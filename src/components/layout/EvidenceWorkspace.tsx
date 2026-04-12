import { useState } from 'react';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import { buildPensionStartMap, buildPensionByAgeMaps } from '../charts/AssetBalanceChart';
import AgeInspectorPanel from '../charts/AgeInspectorPanel';
import { buildCashflowByAgeMaps, getAgeSnapshot } from '../charts/assetBalanceMetrics';
import type {
  YearlyAggregateV2,
} from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import type { KeyDecisionEvent } from '../../engine/timelineBuilder';
import { CompactLifetimeTimeline } from '../result/v3/LifetimeTimeline';

interface EvidenceWorkspaceProps {
  chartRows: YearlyAggregateV2[];
  retirementAge: number;
  inputs: PlannerInputs;
  timelineEvents: KeyDecisionEvent[];
}

export default function EvidenceWorkspace({
  chartRows,
  retirementAge,
  inputs,
  timelineEvents,
}: EvidenceWorkspaceProps) {
  const [selectedAge, setSelectedAge] = useState<number>(retirementAge);

  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  const hasSaleProceeds = hasRealEstate && chartRows.some((row) => row.propertySaleProceedsBucketEnd > 0);

  const cashflow = buildCashflowByAgeMaps(chartRows);
  const pensionStartMap = buildPensionStartMap(inputs, retirementAge);
  const {
    monthlyPublicPensionByAge,
    monthlyPublicPensionRealByAge,
    monthlyRetirementPensionByAge,
    monthlyRetirementPensionRealByAge,
    monthlyPrivatePensionByAge,
    monthlyPrivatePensionRealByAge,
  } = buildPensionByAgeMaps(chartRows, inputs, retirementAge);

  const inspectorData = getAgeSnapshot({
    age: selectedAge,
    retirementAge,
    rows: chartRows,
    cashflow,
    monthlyPublicPensionByAge,
    monthlyPublicPensionRealByAge,
    monthlyRetirementPensionByAge,
    monthlyRetirementPensionRealByAge,
    monthlyPrivatePensionByAge,
    monthlyPrivatePensionRealByAge,
    pensionStartMap,
  });

  const cardPadding = '0 32px';

  return (
    <section>
      {/* 피그마 Frame 16: 타임라인 + 차트 통합 카드 */}
      <div
        style={{
          borderRadius: 32,
          background: '#ffffff',
          boxShadow: '0px 2px 8px 4px rgba(121,158,195,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          alignSelf: 'stretch',
          paddingTop: 28,
        }}
      >
        {/* ── 카드 타이틀 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: cardPadding }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#191f28', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
            자산의 흐름을 그래프로 보여드릴게요
          </p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 400, color: '#4e5968', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
            먼저 현금으로 생활하고, 현금이 부족해지면 주식 같은 현금성 자산을 팔아 생활해요. 그래도 부족하면 경우에 따라 집을 담보로 대출하거나 판매해야 할 수 있어요.
          </p>
        </div>

        {/* ── 타임라인 섹션 ── */}
        <div style={{ padding: cardPadding }}>
          <div
            style={{
              background: 'rgb(242, 244, 246)',
              borderRadius: 20,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#191f28', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
              내 나이의 흐름에 따라, 중요한 부분을 요약해 봤어요
            </p>
            <div style={{ background: '#d9d9d9', height: 1, width: '100%' }} />
            <div style={{ paddingTop: 8 }}>
              <CompactLifetimeTimeline events={timelineEvents} />
            </div>
          </div>
        </div>

        {/* ── 차트 섹션 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: cardPadding }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#3182f6',
                fontFamily: 'Pretendard, sans-serif',
                lineHeight: 1.5,
              }}
            >
              기대 수명까지 예측 그래프
            </p>
            {inputs.goal.targetMonthly > 0 && (
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
                {`월 ${inputs.goal.targetMonthly}만원(${new Date().getFullYear()}년 기준)의 생활 수준을 유지하려면, ${inputs.goal.retirementAge}세(은퇴시점)에는 월 ${Math.round(inputs.goal.targetMonthly * Math.pow(1 + (inputs.goal.inflationRate ?? 2) / 100, inputs.goal.retirementAge - inputs.status.currentAge))}만원이 필요해요. 이후에는 물가와 투자 수익이 함께 반영돼, 생활비와 자산이 모두 커질 수 있어요.`}
              </p>
            )}
          </div>
          <div
            style={{
              background: '#f9fafb',
              borderRadius: 20,
              padding: 16,
            }}
          >
            <AssetBalanceChart
              rows={chartRows}
              inputs={inputs}
              onAgeHover={setSelectedAge}
            />
          </div>
        </div>

        {/* ── 인터랙티브 상세 패널 (전체 너비, 카드 패딩 없음) ── */}
        {inspectorData && (
          <div style={{ marginTop: -8, paddingBottom: 28 }}>
            <AgeInspectorPanel
              data={inspectorData}
              hasRealEstate={hasRealEstate}
              hasSaleProceeds={hasSaleProceeds}
            />
          </div>
        )}
      </div>
    </section>
  );
}
