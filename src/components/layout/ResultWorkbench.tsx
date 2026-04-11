import { useEffect, useMemo, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { calcFinancialTotalAsset } from '../../engine/assetWeighting';
import { getVehicleMonthlyCost } from '../../engine/vehicleSchedule';
import { extractKeyDecisionEvents } from '../../engine/timelineBuilder';
import type { PropertyOptionResult } from '../../types/calculationV2';
import type { HouseDecisionStrategy } from './houseDecisionVM';
import { resolveSelectedStrategy } from './selectedStrategy';
import ResultHeroSection from './ResultHeroSection';
import ReinvestmentExplainerSection from './ReinvestmentExplainerSection';
import EvidenceWorkspace from './EvidenceWorkspace';
import ActionPlanSection from './ActionPlanSection';
import VehicleComparisonCard from '../result/VehicleComparisonCard';

// ── 섹션 구분선 ────────────────────────────────────────────
function SectionDivider({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '0 0 32px',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'rgba(36,39,46,0.08)' }} />
      {label && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-faint)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'rgba(36,39,46,0.08)' }} />
    </div>
  );
}

// ── 빈 상태 ────────────────────────────────────────────────
function EmptyStateCard({ title, body, hint }: { title: string; body: string; hint?: string }) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.55)',
        background: 'var(--fig-card-bg)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        padding: '64px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 32, lineHeight: 1 }}>—</span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--text-strong)',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 14,
          color: 'var(--text-muted)',
          lineHeight: 1.7,
          maxWidth: 360,
        }}
      >
        {body}
      </span>
      {hint && (
        <span
          style={{
            marginTop: 8,
            fontSize: 14,
            color: 'var(--text-faint)',
            lineHeight: 1.5,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

export default function ResultWorkbench() {
  const resultV2 = usePlannerStore((state) => state.resultV2);
  const result = usePlannerStore((state) => state.result);
  const inputs = usePlannerStore((state) => state.inputs);
  const vehicleComparison = usePlannerStore((state) => state.vehicleComparison);
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
    if (next && next !== selectedStrategy) setSelectedStrategy(next);
  }, [resultV2, hasRealEstate, recommendedStrategy, selectedStrategy]);

  const panelStyle = {
    flex: 1,
    minWidth: 0,
    padding: 24,
    background: 'var(--fig-card-bg)',
    backdropFilter: 'blur(40px) saturate(200%)',
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    borderRadius: 32,
    border: '1px solid rgba(255,255,255,0.55)',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 24,
  };

  // ── 에러/빈 상태 ──
  if (inputs.status.currentAge > 0 && inputs.goal.retirementAge > 0 && inputs.status.currentAge >= inputs.goal.retirementAge) {
    return (
      <div style={panelStyle}>
        <EmptyStateCard
          title="은퇴 전 준비 단계 전용이에요"
          body="현재 나이가 은퇴 나이 이상으로 설정돼 있어요. 왼쪽에서 현재 나이 또는 은퇴 나이를 조정해 주세요."
        />
      </div>
    );
  }

  if (result.isValid && financialAssetTotal === 0) {
    return (
      <div style={panelStyle}>
        <EmptyStateCard
          title="금융자산을 입력하면 결과가 나와요"
          body="현금·예적금·주식 중 하나 이상을 입력해 주세요."
          hint="부동산만으로는 생활비 시뮬레이션이 어려워요."
        />
      </div>
    );
  }

  if (!resultV2 || !result.isValid) {
    return (
      <div style={panelStyle}>
        <EmptyStateCard
          title="입력하면 결과 리포트가 바로 나와요"
          body="왼쪽에서 나이, 은퇴 나이, 기대수명, 목표 생활비를 입력해 주세요."
          hint="4가지만 넣어도 기본 판정이 나와요."
        />
      </div>
    );
  }

  const { summary, propertyOptions, detailYearlyAggregates } = resultV2;

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
  const selectedPropertyStrategy = hasRealEstate ? chartStrategy : null;

  return (
    <div style={panelStyle}>

      {/* 1. 핵심 판정 */}
      <ResultHeroSection
        summary={summary}
        inputs={inputs}
        displaySustainableMonthly={verificationOption?.sustainableMonthly}
        displayFailureAge={verificationOption?.failureAge ?? null}
      />

      {/* 2. 재투자 가정 설명 */}
      <ReinvestmentExplainerSection
        inputs={inputs}
        annualNetSavings={result.annualNetSavings}
        monthlyDebt={result.firstYearMonthlyDebt}
        monthlyVehicle={
          inputs.vehicle?.costIncludedInExpense === 'separate'
            ? Math.round(
                Array.from({ length: 12 }, (_, m) => getVehicleMonthlyCost(inputs.vehicle, m))
                  .reduce((sum, c) => sum + c, 0) / 12
              )
            : 0
        }
      />

      {/* 3. 타임라인 + 차트 통합 카드 */}
      <EvidenceWorkspace
        chartRows={chartRows}
        retirementAge={inputs.goal.retirementAge}
        inputs={inputs}
        timelineEvents={extractKeyDecisionEvents(
          chartRows,
          summary,
          propertyOptions,
          inputs,
          timelineStrategyMode,
          selectedPropertyStrategy,
        )}
      />

      <SectionDivider />


      {/* 5. 자동차 영향 (차량 입력 시에만) */}
      {vehicleComparison && vehicleComparison.hasVehicle && (
        <>
          <VehicleComparisonCard comparison={vehicleComparison} />
          <SectionDivider />
        </>
      )}

      {/* 6. 지금 해야 할 일 */}
      <ActionPlanSection
        summary={summary}
        inputs={inputs}
        hasRealEstate={hasRealEstate}
        propertyOptions={propertyOptions}
      />

    </div>
  );
}
