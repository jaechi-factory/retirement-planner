import { usePlannerStore } from '../../store/usePlannerStore';
import { fmtKRW } from '../../utils/format';
import FundingTimeline from '../result/v2/FundingTimeline';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyAssetChart from '../charts/PropertyAssetChart';
import PropertyDecisionSection from '../result/PropertyDecisionSection';
import ConclusionCard from '../result/v3/ConclusionCard';
import ScenarioTabs from '../result/v3/ScenarioTabs';
import LifetimeTimeline from '../result/v3/LifetimeTimeline';
import type { YearlyAggregateV2, FundingStage } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';

// ── 시나리오 비교 행동 레이블 ────────────────────────────────────────────────────
const SCENARIO_ACTION_LABELS: Record<string, string> = {
  keep: '집을 그대로 두면',
  secured_loan: '집에서 생활비를 받으면',
  sell: '집을 팔면',
};

// ── 1층: Hero ─────────────────────────────────────────────────────────────────
function HeroSection({
  sustainableMonthly,
  targetGap,
  recommendedLabel,
  keyReason,
}: {
  sustainableMonthly: number;
  targetGap: number;
  recommendedLabel: string;
  keyReason?: string;
}) {
  const positive = targetGap >= 0;
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--tds-gray-100)',
        padding: '22px 24px 20px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 6 }}>
        추천: {recommendedLabel}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 900,
          color: 'var(--tds-gray-900)',
          letterSpacing: '-1.5px',
          lineHeight: 1.1,
          marginBottom: 10,
        }}
      >
        월 {fmtKRW(sustainableMonthly)}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: positive ? '#1B7F3A' : '#C0392B',
        }}
      >
        {positive
          ? `은퇴 후 목표보다 월 ${fmtKRW(targetGap)} 더 가능해요 ✓`
          : `은퇴 후 목표보다 월 ${fmtKRW(Math.abs(targetGap))} 부족해요`}
      </div>
      {keyReason && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--tds-gray-600)',
            marginTop: 8,
            lineHeight: 1.6,
            paddingTop: 8,
            borderTop: '1px solid var(--tds-gray-100)',
          }}
        >
          {keyReason}
        </div>
      )}
    </div>
  );
}

// ── 2층: Why/Path ─────────────────────────────────────────────────────────────
function WhyPathSection({
  pathLines,
  fundingTimeline,
  retirementAge,
  lifeExpectancy,
}: {
  pathLines: Array<{ text: string; positive?: boolean }>;
  fundingTimeline: FundingStage[];
  retirementAge: number;
  lifeExpectancy: number;
}) {
  if (pathLines.length === 0 && fundingTimeline.length < 2) return null;

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px dashed var(--tds-gray-100)',
        padding: '16px 20px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tds-gray-400)', marginBottom: 14, letterSpacing: 0.1 }}>
        이런 흐름으로 자금이 움직여요
      </div>

      {pathLines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: fundingTimeline.length >= 2 ? 20 : 0 }}>
          {pathLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: line.positive ? '#1B7F3A' : 'var(--tds-gray-600)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span style={{ color: line.positive ? '#1B7F3A' : 'var(--tds-gray-300)', flexShrink: 0, marginTop: 2 }}>
                {line.positive ? '✓' : '·'}
              </span>
              {line.text}
            </div>
          ))}
        </div>
      )}

      {fundingTimeline.length >= 2 && (
        <FundingTimeline
          stages={fundingTimeline}
          retirementAge={retirementAge}
          lifeExpectancy={lifeExpectancy}
        />
      )}
    </div>
  );
}

// ── 3층: 자산 추이 인라인 섹션 ────────────────────────────────────────────────
function AssetChartSection({
  detailYearlyAggregates,
  inputs,
  strategyLabel,
}: {
  detailYearlyAggregates: YearlyAggregateV2[];
  inputs: PlannerInputs;
  strategyLabel: string;
}) {
  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--tds-gray-100)',
        padding: '20px 22px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--tds-gray-700)',
          marginBottom: 16,
          letterSpacing: 0.1,
        }}
      >
        자산이 어떻게 변하나요
      </div>
      <AssetBalanceChart
        rows={detailYearlyAggregates}
        retirementAge={inputs.goal.retirementAge}
        targetMonthly={inputs.goal.targetMonthly}
        strategyLabel={strategyLabel}
        inputs={inputs}
      />
      {hasRealEstate && (
        <>
          <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '4px 0 20px' }} />
          <PropertyAssetChart
            rows={detailYearlyAggregates}
            retirementAge={inputs.goal.retirementAge}
          />
        </>
      )}
      <div style={{ fontSize: 11, color: 'var(--tds-gray-300)', lineHeight: 1.5, marginTop: 4 }}>
        * 이 결과는 입력한 수익률이 매년 일정하다는 가정을 기준으로 해요. 실제 시장 상황에 따라 달라질 수 있어요.
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function ResultWorkbench() {
  const resultV2 = usePlannerStore((s) => s.resultV2);
  const result = usePlannerStore((s) => s.result);
  const inputs = usePlannerStore((s) => s.inputs);
  const netWorth = result.netWorth ?? 0;
  const monthlySavings = Math.round((result.annualNetSavings ?? 0) / 12);

  // 2-1: 은퇴 후 진입 안내 (가장 먼저 체크)
  if (inputs.status.currentAge > 0 && inputs.goal.retirementAge > 0 && inputs.status.currentAge >= inputs.goal.retirementAge) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          padding: '24px 20px',
          borderLeft: '1px solid var(--tds-gray-100)',
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: '1px solid var(--tds-gray-100)',
            padding: '60px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 28, color: 'var(--tds-gray-200)' }}>—</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tds-gray-600)', textAlign: 'center' }}>
            이 도구는 은퇴를 준비 중인 분을 위한 계산기예요
          </div>
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)', textAlign: 'center', lineHeight: 1.7 }}>
            현재 나이가 은퇴 나이 이상으로 설정되어 있어요.<br />왼쪽에서 현재 나이 또는 은퇴 나이를 조정해주세요.
          </div>
        </div>
      </div>
    );
  }

  // 2-2: 금융자산 0 안내 (2-1 이후 체크)
  const financialAssetTotal =
    inputs.assets.cash.amount +
    inputs.assets.deposit.amount +
    inputs.assets.stock_kr.amount +
    inputs.assets.stock_us.amount +
    inputs.assets.bond.amount +
    inputs.assets.crypto.amount;

  if (result.isValid && financialAssetTotal === 0) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          padding: '24px 20px',
          borderLeft: '1px solid var(--tds-gray-100)',
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: '1px solid var(--tds-gray-100)',
            padding: '60px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 28, color: 'var(--tds-gray-200)' }}>—</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tds-gray-600)', textAlign: 'center' }}>
            금융자산을 입력하면 분석이 시작돼요
          </div>
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)', textAlign: 'center', lineHeight: 1.7 }}>
            현금, 예적금, 주식 중 하나 이상을 입력해주세요.<br />부동산만으로는 은퇴 자금 흐름을 계산하기 어려워요.
          </div>
        </div>
      </div>
    );
  }

  if (!resultV2 || !result.isValid) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          padding: '24px 20px',
          borderLeft: '1px solid var(--tds-gray-100)',
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: '1px solid var(--tds-gray-100)',
            padding: '60px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 28, color: 'var(--tds-gray-200)' }}>—</div>
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)', textAlign: 'center', lineHeight: 1.7 }}>
            ← 왼쪽에서 나이, 은퇴 나이, 기대수명,<br />목표 생활비를 입력하면 분석이 시작돼요.
          </div>
        </div>
      </div>
    );
  }

  const { summary, propertyOptions, warnings, fundingTimeline, detailYearlyAggregates } = resultV2;
  const recommended = propertyOptions.find((o) => o.isRecommended);
  const hasRealEstate = inputs.assets.realEstate.amount > 0;

  // Why/Path 텍스트
  const pathLines: Array<{ text: string; positive?: boolean }> = [];

  // 소진 불릿은 FundingTimeline 바가 시각적으로 대체 — TransitionSection이 첫 언급 위치
  if (summary.financialExhaustionAge === null) {
    if (summary.financialSellStartAge) {
      pathLines.push({ text: `${summary.financialSellStartAge}세부터 주식·채권을 팔기 시작해요` });
    } else {
      pathLines.push({ text: '주식·채권은 기대수명까지 유지돼요', positive: true });
    }
  }

  if (summary.propertyInterventionAge) {
    if (recommended?.strategy === 'secured_loan') {
      pathLines.push({ text: `${summary.propertyInterventionAge}세부터 집을 담보로 현금흐름을 만들어요` });
    } else if (recommended?.strategy === 'sell') {
      pathLines.push({ text: `${summary.propertyInterventionAge}세에 집을 팔아 생활비를 늘려요` });
    } else {
      pathLines.push({ text: `${summary.propertyInterventionAge}세부터 집을 활용해야 해요` });
    }
  } else if (hasRealEstate) {
    pathLines.push({ text: '집을 건드리지 않아도 기대수명까지 가능해요', positive: true });
  }

  if (summary.failureAge) {
    pathLines.push({ text: `${summary.failureAge}세에 자금이 부족해요` });
  } else {
    pathLines.push({ text: '기대수명까지 자금이 유지돼요', positive: true });
  }

  // Warnings: 행동 촉구 메시지만 남김 (상황 설명은 TransitionSection 담당)
  // "집을 건드리지 않으면 ~" 경고는 TransitionSection에서 맥락으로 이미 설명됨 → 제외
  const actionWarnings = warnings.filter((w) =>
    w.severity === 'warning' &&
    !w.message.includes('집을 건드리지 않으면'),
  );
  const criticalWarnings = warnings.filter((w) => w.severity === 'critical');

  // 노출 우선순위: critical 전부 + actionWarnings 최대 2개 (info는 생략 — TransitionSection이 커버)
  const displayWarnings = [...criticalWarnings, ...actionWarnings.slice(0, 2)];

  return (
    <div
      style={{
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '28px 24px 56px',
        scrollbarWidth: 'thin',
        borderLeft: '1px solid var(--tds-gray-100)',
      }}
    >

      {/* 1층: Hero */}
      <HeroSection
        sustainableMonthly={summary.sustainableMonthly}
        targetGap={summary.targetGap}
        recommendedLabel={SCENARIO_ACTION_LABELS[recommended?.strategy ?? ''] ?? (recommended?.label ?? '추천 전략')}
        keyReason={
          recommended?.strategy === 'keep'
            ? '금융자산이 기대수명까지 유지돼요'
            : recommended?.strategy === 'secured_loan'
            ? '집을 유지하며 현금흐름을 보완할 수 있어요'
            : recommended?.strategy === 'sell'
            ? '집 매각으로 생활비를 늘릴 수 있어요'
            : undefined
        }
      />

      {/* 2층: 결론 카드 (HeroSection 바로 다음) */}
      <ConclusionCard
        summary={summary}
        propertyOptions={propertyOptions}
        inputs={inputs}
        netWorth={netWorth}
        monthlySavings={monthlySavings}
      />

      {/* 3층: Why/Path */}
      <WhyPathSection
        pathLines={pathLines}
        fundingTimeline={fundingTimeline}
        retirementAge={inputs.goal.retirementAge}
        lifeExpectancy={inputs.goal.lifeExpectancy}
      />

      {/* 4층: 시나리오 탭 (집 있을 때만) */}
      {hasRealEstate && (
        <ScenarioTabs
          propertyOptions={propertyOptions}
          lifeExpectancy={inputs.goal.lifeExpectancy}
        />
      )}

      {/* PropertyDecisionSection — 금융자산 소진이 있고 집도 있을 때만, 현재 위치 유지 */}
      {summary.financialExhaustionAge !== null && hasRealEstate && (
        <PropertyDecisionSection
          financialExhaustionAge={summary.financialExhaustionAge}
          propertyOptions={propertyOptions}
          realEstateAmount={inputs.assets.realEstate.amount}
          lifeExpectancy={inputs.goal.lifeExpectancy}
        />
      )}

      {/* 5층: Warnings 통합 블록 — critical 전부 + actionWarnings 최대 2개 */}
      {displayWarnings.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {displayWarnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--tds-gray-800)',
                padding: '10px 14px',
                background: '#FAFAFA',
                borderLeft: `3px solid ${w.severity === 'critical' ? '#C0392B' : '#E09400'}`,
                borderRadius: 8,
              }}
            >
              {w.severity === 'critical' ? '🚨 ' : '⚠ '}{w.message}
            </div>
          ))}
        </div>
      )}

      {/* 6층: 연도별 타임라인 */}
      <LifetimeTimeline
        detailYearlyAggregates={detailYearlyAggregates}
        summary={summary}
        propertyOptions={propertyOptions}
        inputs={inputs}
      />

      {/* 7층: 자산 추이 차트 인라인 */}
      {(() => {
        const sellOption = propertyOptions.find((o) => o.strategy === 'sell');
        const chartRows = hasRealEstate && sellOption ? sellOption.yearlyAggregates : detailYearlyAggregates;
        const chartLabel = hasRealEstate ? '집을 팔면' : (SCENARIO_ACTION_LABELS[recommended?.strategy ?? ''] ?? (recommended?.label ?? '추천 전략'));
        return (
          <AssetChartSection
            detailYearlyAggregates={chartRows}
            inputs={inputs}
            strategyLabel={chartLabel}
          />
        );
      })()}

    </div>
  );
}
