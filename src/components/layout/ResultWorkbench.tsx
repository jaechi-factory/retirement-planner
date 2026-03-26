import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { fmtKRW } from '../../utils/format';
import FundingTimeline from '../result/v2/FundingTimeline';
import YearlySummaryTable from '../result/v2/YearlySummaryTable';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyAssetChart from '../charts/PropertyAssetChart';
import SummaryTab from '../result/v2/SummaryTab';
import PensionTab from '../result/v2/PensionTab';
import type { YearlyAggregateV2, FundingStage, PropertyOptionResult } from '../../types/calculationV2';
import type { CalculationResult } from '../../types/calculation';
import type { PlannerInputs } from '../../types/inputs';

// ── 전략 표시 레이블 ────────────────────────────────────────────────────────────
const STRATEGY_DISPLAY_LABELS: Record<string, string> = {
  keep: '집 안 건드리기',
  secured_loan: '집에서 생활비 받기',
  sell: '집 팔고 생활비 늘리기',
};

// ── 해석 문장 생성 ──────────────────────────────────────────────────────────────
function buildInsightLine(
  propertyOptions: PropertyOptionResult[],
  targetGap: number,
  pensionCoverageRate: number,
): string | null {
  const allFail = propertyOptions.every((o) => !o.survivesToLifeExpectancy);
  const keepOpt = propertyOptions.find((o) => o.strategy === 'keep');

  if (allFail) {
    return '지금 조건에선 어떤 전략을 써도 기대수명까지 자금을 유지하기 어려워요. 목표 생활비나 저축 구조를 점검해보세요.';
  }
  if (keepOpt && !keepOpt.survivesToLifeExpectancy) {
    return '집을 안 건드리면 기대수명까지 버티기 어려워요. 집을 활용하는 전략이 필요해요.';
  }
  if (targetGap < 0) {
    return '추천 전략으로도 목표 생활비를 채우기는 어렵지만, 지출을 조금 낮추면 기대수명까지 유지할 수 있어요.';
  }
  if (pensionCoverageRate < 0.5) {
    return '연금만으로는 생활비의 절반도 충당되지 않아요. 자산 운용 계획이 중요해요.';
  }
  return null;
}

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

// ── 해석 문장 블록 ──────────────────────────────────────────────────────────────
function InsightLine({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: 'var(--tds-gray-600)',
        padding: '12px 16px',
        background: 'var(--tds-gray-50)',
        borderRadius: 10,
        borderLeft: '3px solid var(--tds-gray-200)',
        marginBottom: 16,
        lineHeight: 1.65,
      }}
    >
      {text}
    </div>
  );
}

// ── 3층: 집 전략 비교 ──────────────────────────────────────────────────────────
function HomeOptionsSection({
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
        집을 어떻게 다룰지에 따라 달라져요
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {propertyOptions.map((opt) => {
          const status = statusLabel(opt);
          const hasAmount = opt.sustainableMonthly > 0;

          return (
            <div
              key={opt.strategy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: opt.isRecommended ? '#F0F7FF' : 'var(--tds-gray-50)',
                border: `1px solid ${opt.isRecommended ? '#C8DEFF' : 'var(--tds-gray-100)'}`,
              }}
            >
              {/* 전략 이름 */}
              <div style={{ width: 116, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: opt.isRecommended ? 700 : 500,
                    color: opt.isRecommended ? '#1565C0' : 'var(--tds-gray-500)',
                    lineHeight: 1.4,
                  }}
                >
                  {STRATEGY_DISPLAY_LABELS[opt.strategy] ?? opt.label}
                </div>
                {opt.isRecommended && (
                  <div style={{ fontSize: 10, color: '#1565C0', marginTop: 2, fontWeight: 600 }}>추천</div>
                )}
              </div>

              {/* 월 생활비 + 설명 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {hasAmount ? (
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tds-gray-900)' }}>
                    월 {fmtKRW(opt.sustainableMonthly)}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#C0392B' }}>
                    {opt.failureAge !== null
                      ? `${opt.failureAge}세부터 자금 부족`
                      : '이 전략으로는 생활비를 만들기 어려워요'}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--tds-gray-400)',
                    marginTop: 2,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.headline}
                </div>
              </div>

              {/* 판정 뱃지 */}
              <div
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
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
  strategyLabel,
  result,
  inputs,
}: {
  detailYearlyAggregates: YearlyAggregateV2[];
  retirementAge: number;
  strategyLabel: string;
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
              strategyLabel={strategyLabel}
            />
            {hasRealEstate && (
              <PropertyAssetChart
                rows={detailYearlyAggregates}
                retirementAge={retirementAge}
                strategyLabel={strategyLabel}
              />
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
  } else if (inputs.assets.realEstate.amount > 0) {
    pathLines.push({ text: '집을 건드리지 않아도 기대수명까지 가능해요', positive: true });
  }

  if (summary.failureAge) {
    pathLines.push({ text: `${summary.failureAge}세에 자금이 부족해요` });
  } else {
    pathLines.push({ text: '기대수명까지 자금이 유지돼요', positive: true });
  }

  // 해석 문장
  const insightLine = buildInsightLine(
    propertyOptions,
    summary.targetGap,
    result.pensionCoverageRate,
  );

  // 경고 메시지: 행동 가능한 것(warning)을 메인으로, critical은 보조 문구로
  const actionableWarning = warnings.find((w) => w.severity === 'warning') ?? null;
  const criticalWarning = warnings.find((w) => w.severity === 'critical') ?? null;
  const mainWarning = actionableWarning ?? criticalWarning;
  // critical을 보조로 보여주는 경우: actionable이 이미 메인일 때만
  const supplementaryNote = actionableWarning && criticalWarning ? criticalWarning : null;

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
        recommendedLabel={STRATEGY_DISPLAY_LABELS[recommended?.strategy ?? ''] ?? (recommended?.label ?? '추천 전략')}
        keyReason={recommended?.headline}
      />

      {/* 2층: Why/Path */}
      <WhyPathSection
        pathLines={pathLines}
        fundingTimeline={fundingTimeline}
        retirementAge={inputs.goal.retirementAge}
        lifeExpectancy={inputs.goal.lifeExpectancy}
      />

      {/* 해석 문장 (WhyPath → HomeOptions 사이) */}
      {insightLine && <InsightLine text={insightLine} />}

      {/* 3층: 집 전략 비교 */}
      <HomeOptionsSection
        propertyOptions={propertyOptions}
        lifeExpectancy={inputs.goal.lifeExpectancy}
      />

      {/* 경고: 행동 가능한 메인 경고 1개 */}
      {mainWarning && (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: mainWarning.severity === 'warning' ? '#8B6914' : mainWarning.severity === 'critical' ? '#8B1A1A' : 'var(--tds-gray-400)',
            padding: '10px 14px',
            background: mainWarning.severity === 'warning' ? '#FFFBE6' : mainWarning.severity === 'critical' ? '#FFF0F0' : 'var(--tds-gray-50)',
            borderRadius: 8,
            marginBottom: supplementaryNote ? 6 : 24,
          }}
        >
          {mainWarning.severity === 'critical' ? '🚨 ' : mainWarning.severity === 'warning' ? '⚠ ' : 'ℹ '}{mainWarning.message}
        </div>
      )}

      {/* 보조 문구: 구조적 최종 리스크 (약하게) */}
      {supplementaryNote && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--tds-gray-400)',
            padding: '0 4px',
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          ※ {supplementaryNote.message}
        </div>
      )}

      {/* 4층: 세부 분석 탭 */}
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
          strategyLabel={STRATEGY_DISPLAY_LABELS[recommended?.strategy ?? ''] ?? (recommended?.label ?? '')}
          result={result}
          inputs={inputs}
        />
      </div>
    </div>
  );
}
