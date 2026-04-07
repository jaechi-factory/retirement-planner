import { useEffect, useMemo, useState } from 'react';
import { Typography } from '../ui/wds-replacements';
import { usePlannerStore } from '../../store/usePlannerStore';
import { calcFinancialTotalAsset } from '../../engine/assetWeighting';
import { PROPERTY_STRATEGY_LABELS } from '../../engine/propertyStrategiesV2';
import type { PropertyOptionResult } from '../../types/calculationV2';
import { buildResultNarrativeModel } from './resultNarrative';
import type { HouseDecisionStrategy } from './houseDecisionVM';
import { resolveSelectedStrategy } from './selectedStrategy';
import ResultHeroSection from './ResultHeroSection';
import WhyThisResultSection from './WhyThisResultSection';
import FundingPathSection from './FundingPathSection';
import HouseStrategyComparisonSection from './HouseStrategyComparisonSection';
import EvidenceWorkspace from './EvidenceWorkspace';
import ActionPlanSection from './ActionPlanSection';

function EmptyStateCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-xl)',
        background: 'var(--white)',
        border: '1px solid var(--neutral-150)',
        padding: '80px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-full)',
          background: 'var(--neutral-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 28, color: 'var(--neutral-400)' }}>?</span>
      </div>
      <Typography
        variant="headline1"
        weight="bold"
        style={{
          fontSize: 20,
          color: 'var(--neutral-900)',
          marginBottom: 8,
          lineHeight: 1.35,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        style={{
          fontSize: 15,
          color: 'var(--neutral-500)',
          lineHeight: 1.6,
        }}
      >
        {body}
      </Typography>
    </div>
  );
}

export default function ResultWorkbench() {
  const resultV2 = usePlannerStore((state) => state.resultV2);
  const result = usePlannerStore((state) => state.result);
  const inputs = usePlannerStore((state) => state.inputs);
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

    if (next && next !== selectedStrategy) {
      setSelectedStrategy(next);
    }
  }, [resultV2, hasRealEstate, recommendedStrategy, selectedStrategy]);

  const handleSelectStrategy = (strategy: HouseDecisionStrategy) => {
    setSelectedStrategy(strategy);
  };

  // — Empty states —
  if (inputs.status.currentAge > 0 && inputs.goal.retirementAge > 0 && inputs.status.currentAge >= inputs.goal.retirementAge) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          padding: '48px 40px',
          background: 'var(--neutral-50)',
        }}
      >
        <EmptyStateCard
          title="이 계산기는 은퇴 전 준비 단계에 맞춰져 있어요"
          body="현재 나이가 은퇴 나이 이상으로 설정돼 있어요. 왼쪽에서 현재 나이 또는 은퇴 나이를 조정해 주세요."
        />
      </div>
    );
  }

  if (result.isValid && financialAssetTotal === 0) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          padding: '48px 40px',
          background: 'var(--neutral-50)',
        }}
      >
        <EmptyStateCard
          title="금융자산을 입력하면 결과를 볼 수 있어요"
          body="현금, 예적금, 주식 중 하나 이상 입력해 주세요. 부동산만으로는 계산이 어려워요."
        />
      </div>
    );
  }

  if (!resultV2 || !result.isValid) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          padding: '48px 40px',
          background: 'var(--neutral-50)',
        }}
      >
        <EmptyStateCard
          title="입력하면 결과 리포트가 바로 나와요"
          body="왼쪽에서 나이, 은퇴 나이, 기대수명, 목표 생활비를 입력해 주세요."
        />
      </div>
    );
  }

  const { summary, propertyOptions, detailYearlyAggregates, assumptions, warnings, fundingTimeline } = resultV2;

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

  const narrative = buildResultNarrativeModel({
    summary,
    propertyOptions,
    inputs,
    hasRealEstate,
  });

  const selectedPropertyStrategy = hasRealEstate ? chartStrategy : null;
  const hasSelectableHouseRows = hasRealEstate && propertyOptions.some((option) => option.yearlyAggregates.length > 0);

  return (
    <main
      style={{
        flex: 1,
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '32px 40px 80px',
        scrollbarWidth: 'thin',
        background: 'var(--neutral-50)',
      }}
    >
      {/* Result content container */}
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* 1. Hero — Current Status */}
        <ResultHeroSection
          summary={summary}
          narrative={narrative}
          hasRealEstate={hasRealEstate}
        />

        {/* 2. Why This Result */}
        <WhyThisResultSection
          summary={summary}
          inputs={inputs}
          hasRealEstate={hasRealEstate}
        />

        {/* 3. Funding Timeline */}
        <FundingPathSection
          fundingTimeline={fundingTimeline}
          lifeExpectancy={inputs.goal.lifeExpectancy}
          retirementAge={inputs.goal.retirementAge}
        />

        {/* 4. House Strategy Comparison (if has real estate) */}
        {hasSelectableHouseRows && (
          <HouseStrategyComparisonSection
            hasRealEstate={hasRealEstate}
            propertyOptions={propertyOptions}
            selectedStrategy={selectedStrategy}
            lifeExpectancy={inputs.goal.lifeExpectancy}
            onSelectStrategy={handleSelectStrategy}
          />
        )}

        {/* 5. Evidence Workspace */}
        <EvidenceWorkspace
          hasRealEstate={hasRealEstate}
          chartRows={chartRows}
          retirementAge={inputs.goal.retirementAge}
          strategyLabel={chartLabel}
          inputs={inputs}
          summary={summary}
          propertyOptions={propertyOptions}
          assumptions={assumptions}
          warnings={warnings}
          timelineStrategyMode={timelineStrategyMode}
          selectedPropertyStrategy={selectedPropertyStrategy}
        />

        {/* 6. Action Plan */}
        <ActionPlanSection
          summary={summary}
          inputs={inputs}
          hasRealEstate={hasRealEstate}
          propertyOptions={propertyOptions}
        />
      </div>
    </main>
  );
}
