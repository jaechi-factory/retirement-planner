import { useEffect, useMemo, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { calcFinancialTotalAsset } from '../../engine/assetWeighting';
import { getVehicleMonthlyCost } from '../../engine/vehicleSchedule';
import { PROPERTY_STRATEGY_LABELS } from '../../engine/propertyStrategiesV2';
import { extractKeyDecisionEvents } from '../../engine/timelineBuilder';
import type { PropertyOptionResult } from '../../types/calculationV2';
import type { HouseDecisionStrategy } from './houseDecisionVM';
import { resolveSelectedStrategy } from './selectedStrategy';
import ResultHeroSection from './ResultHeroSection';
import ReinvestmentExplainerSection from './ReinvestmentExplainerSection';
import EvidenceWorkspace from './EvidenceWorkspace';
import ActionPlanSection from './ActionPlanSection';
import VehicleComparisonCard from '../result/VehicleComparisonCard';
import HouseStrategyComparisonSection from './HouseStrategyComparisonSection';
import { CompactLifetimeTimeline } from '../result/v3/LifetimeTimeline';

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
            fontSize: 10,
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
            fontSize: 12,
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

  const { summary, propertyOptions, detailYearlyAggregates, assumptions } = resultV2;

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
  const chartLabel = hasRealEstate
    ? (PROPERTY_STRATEGY_LABELS[chartStrategy] ?? chartStrategy)
    : '집 없음(금융자산 기준)';

  const selectedPropertyStrategy = hasRealEstate ? chartStrategy : null;
  const hasSelectableHouseRows = hasRealEstate && propertyOptions.some((option) => option.yearlyAggregates.length > 0);

  return (
    <div style={panelStyle}>

      {/* 1. 핵심 판정 */}
      <ResultHeroSection
        summary={summary}
        inputs={inputs}
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

      {/* 3. 나이별 주요 이벤트 */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 32,
          padding: '28px 32px',
          boxShadow: '0px 2px 8px 4px rgba(121,158,195,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#191f28', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
            내 나이의 흐름에 따라, 중요한 부분을 요약해 봤어요
          </p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 400, color: '#4e5968', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
            금전적으로 어떤 이벤트가 발생하는지 체크해 보세요.
          </p>
        </div>
        <div
          style={{
            background: '#f2f4f6',
            borderRadius: 20,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#191f28', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
            나이별 주요 이벤트
          </p>
          <div style={{ background: '#d9d9d9', height: 1, width: '100%' }} />
          <div style={{ paddingTop: 8 }}>
            <CompactLifetimeTimeline
              events={extractKeyDecisionEvents(
                chartRows,
                summary,
                propertyOptions,
                inputs,
                timelineStrategyMode,
                selectedPropertyStrategy,
              )}
            />
          </div>
        </div>
      </div>

      {/* 자금 흐름 + 차트 (FundingPath 통합) */}
      <EvidenceWorkspace
        hasRealEstate={hasRealEstate}
        chartRows={chartRows}
        retirementAge={inputs.goal.retirementAge}
        strategyLabel={chartLabel}
        inputs={inputs}
        summary={summary}
        assumptions={assumptions}
      />

      <SectionDivider />

      {/* 4. 집 전략 비교 (집 있을 때만) */}
      {hasSelectableHouseRows && (
        <>
          <HouseStrategyComparisonSection
            hasRealEstate={hasRealEstate}
            propertyOptions={propertyOptions}
            selectedStrategy={selectedStrategy}
            lifeExpectancy={inputs.goal.lifeExpectancy}
            onSelectStrategy={setSelectedStrategy}
          />
          <SectionDivider />
        </>
      )}

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
