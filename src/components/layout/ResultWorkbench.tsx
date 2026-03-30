import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { fmtKRW } from '../../utils/format';
import FundingTimeline from '../result/v2/FundingTimeline';
import YearlySummaryTable from '../result/v2/YearlySummaryTable';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyAssetChart from '../charts/PropertyAssetChart';
import SummaryTab from '../result/v2/SummaryTab';
import PensionTab from '../result/v2/PensionTab';
import TransitionSection from '../result/TransitionSection';
import type { YearlyAggregateV2, FundingStage, PropertyOptionResult } from '../../types/calculationV2';
import type { CalculationResult } from '../../types/calculation';
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
        {recommendedLabel} 기준
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
          ? `목표보다 월 ${fmtKRW(targetGap)} 더 가능 ✓`
          : `목표보다 월 ${fmtKRW(Math.abs(targetGap))} 부족`}
      </div>
      {keyReason && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--tds-gray-500)',
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
        border: '1px solid var(--tds-gray-100)',
        padding: '22px 24px 20px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)', marginBottom: 14, letterSpacing: 0.1 }}>
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

// ── 3층: 시나리오 비교 (집 활용 경로 비교) ────────────────────────────────────
// financialExhaustionAge !== null일 때만 렌더
function ScenarioSection({
  propertyOptions,
  lifeExpectancy,
}: {
  propertyOptions: PropertyOptionResult[];
  lifeExpectancy: number;
}) {
  function statusLabel(opt: PropertyOptionResult): { text: string; positive: boolean } {
    if (opt.survivesToLifeExpectancy) return { text: `${lifeExpectancy}세까지 가능`, positive: true };
    if (opt.failureAge !== null) return { text: `${opt.failureAge}세부터 부족`, positive: false };
    return { text: '지속 불가', positive: false };
  }

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--tds-gray-100)',
        padding: '20px 24px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)', marginBottom: 14 }}>
        집을 어떻게 활용하느냐에 따라 결과가 달라져요
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {propertyOptions.map((opt, idx) => {
          const status = statusLabel(opt);
          const isLast = idx === propertyOptions.length - 1;

          return (
            <div
              key={opt.strategy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--tds-gray-100)',
              }}
            >
              {/* 행동 레이블 + 추천 배지 */}
              <div style={{ width: 130, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: opt.isRecommended ? 700 : 400,
                    color: opt.isRecommended ? 'var(--tds-gray-900)' : 'var(--tds-gray-500)',
                    lineHeight: 1.4,
                  }}
                >
                  {SCENARIO_ACTION_LABELS[opt.strategy] ?? opt.label}
                </div>
                {opt.isRecommended && (
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#1565C0',
                      background: '#EBF3FF',
                      padding: '1px 6px',
                      borderRadius: 4,
                      marginTop: 3,
                    }}
                  >
                    추천
                  </div>
                )}
              </div>

              {/* 월 생활비 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {opt.sustainableMonthly > 0 ? (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: opt.isRecommended ? 700 : 500,
                      color: opt.isRecommended ? 'var(--tds-gray-900)' : 'var(--tds-gray-600)',
                    }}
                  >
                    월 {fmtKRW(opt.sustainableMonthly)}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#C0392B', fontWeight: 500 }}>
                    {opt.failureAge !== null ? `${opt.failureAge}세부터 자금 부족` : '유지 불가'}
                  </div>
                )}
              </div>

              {/* 판정 배지 */}
              <div
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: status.positive ? '#E8F5E9' : '#FFF3E0',
                  color: status.positive ? '#1B7F3A' : '#E65100',
                  whiteSpace: 'nowrap',
                }}
              >
                {status.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 4층: 세부 탭 ──────────────────────────────────────────────────────────────
const TABS = ['요약', '연금', '자산 추이', '연도별 상세'] as const;
type TabName = (typeof TABS)[number];

function DetailTabsInner({
  detailYearlyAggregates,
  retirementAge,
  result,
  inputs,
}: {
  detailYearlyAggregates: YearlyAggregateV2[];
  retirementAge: number;
  result: CalculationResult;
  inputs: PlannerInputs;
}) {
  const [activeTab, setActiveTab] = useState<TabName>('요약');
  const hasRealEstate = inputs.assets.realEstate.amount > 0;

  return (
    <>
      <div
        style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--tds-gray-100)',
          background: 'var(--tds-white)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tds-gray-400)', letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>
          세부 분석
        </div>
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--tds-gray-100)',
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? 'var(--tds-gray-900)' : 'var(--tds-gray-400)',
                background: activeTab === tab ? 'var(--tds-white)' : 'transparent',
                border: 'none',
                borderRadius: 7,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '28px 22px' }}>
        {activeTab === '요약' && <SummaryTab result={result} inputs={inputs} />}
        {activeTab === '연금' && <PensionTab result={result} inputs={inputs} />}
        {activeTab === '자산 추이' && (
          <>
            <AssetBalanceChart
              rows={detailYearlyAggregates}
              retirementAge={retirementAge}
            />
            {hasRealEstate && (
              <>
                <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '0 0 20px' }} />
                <PropertyAssetChart
                  rows={detailYearlyAggregates}
                  retirementAge={retirementAge}
                />
              </>
            )}
          </>
        )}
        {activeTab === '연도별 상세' && (
          <YearlySummaryTable rows={detailYearlyAggregates} retirementAge={retirementAge} />
        )}
      </div>
    </>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function ResultWorkbench() {
  const resultV2 = usePlannerStore((s) => s.resultV2);
  const result = usePlannerStore((s) => s.result);
  const inputs = usePlannerStore((s) => s.inputs);

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
            나이, 은퇴 나이, 기대수명, 목표 생활비를 입력하면<br />분석이 시작돼요.
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

  if (summary.financialExhaustionAge) {
    pathLines.push({ text: `${summary.financialExhaustionAge}세에 주식·채권이 소진돼요` });
  } else if (summary.financialSellStartAge) {
    pathLines.push({ text: `${summary.financialSellStartAge}세부터 주식·채권을 팔기 시작해요` });
  } else {
    pathLines.push({ text: '주식·채권은 기대수명까지 유지돼요', positive: true });
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

  // 노출 우선순위: critical 1개 → actionable warning 1개 → info는 생략 (TransitionSection이 커버)
  const primaryWarning = criticalWarnings[0] ?? actionWarnings[0] ?? null;

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
        keyReason={recommended?.headline}
      />

      {/* 2층: Why/Path */}
      <WhyPathSection
        pathLines={pathLines}
        fundingTimeline={fundingTimeline}
        retirementAge={inputs.goal.retirementAge}
        lifeExpectancy={inputs.goal.lifeExpectancy}
      />

      {/* 3층: TransitionSection — 항상 렌더, 케이스별 톤 분기 */}
      <TransitionSection
        financialExhaustionAge={summary.financialExhaustionAge}
        propertyInterventionAge={summary.propertyInterventionAge}
        failureAge={summary.failureAge}
        lifeExpectancy={inputs.goal.lifeExpectancy}
        hasRealEstate={hasRealEstate}
        pensionCoverageRate={result.pensionCoverageRate}
        targetMonthly={inputs.goal.targetMonthly}
      />

      {/* 4층: ScenarioSection — 금융자산 소진이 있고 집도 있을 때만 */}
      {summary.financialExhaustionAge !== null && hasRealEstate && (
        <ScenarioSection
          propertyOptions={propertyOptions}
          lifeExpectancy={inputs.goal.lifeExpectancy}
        />
      )}

      {/* Warnings: 행동 촉구 1개만 (상황 설명 중복 없음) */}
      {primaryWarning && (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: primaryWarning.severity === 'critical' ? '#8B1A1A' : '#8B6914',
            padding: '10px 14px',
            background: primaryWarning.severity === 'critical' ? '#FFF0F0' : '#FFFBE6',
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          {primaryWarning.severity === 'critical' ? '🚨 ' : '⚠ '}{primaryWarning.message}
        </div>
      )}

      {/* 세부 분석 탭 */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid var(--tds-gray-100)',
          overflow: 'hidden',
        }}
      >
        <DetailTabsInner
          detailYearlyAggregates={detailYearlyAggregates}
          retirementAge={inputs.goal.retirementAge}
          result={result}
          inputs={inputs}
        />
      </div>

    </div>
  );
}
