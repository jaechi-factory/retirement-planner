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
  isKeepRecommended,
  keepMonthly,
  keyReason,
}: {
  sustainableMonthly: number;
  targetGap: number;
  recommendedLabel: string;
  isKeepRecommended: boolean;
  keepMonthly?: number;
  keyReason?: string;
}) {
  const positive = targetGap >= 0;
  const showKeepCompare = !isKeepRecommended && keepMonthly !== undefined;
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--tds-gray-100)',
        padding: '22px 24px 20px',
        marginBottom: 16,
      }}
    >
      {/* 전략 기준 뱃지 — 이 숫자가 어떤 전략을 가정한 결과인지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#1565C0',
            background: '#EEF4FF',
            borderRadius: 4,
            padding: '2px 7px',
            lineHeight: 1.5,
          }}
        >
          {recommendedLabel}
        </span>
        <span style={{ fontSize: 11, color: 'var(--tds-gray-500)' }}>전략 기준 최대 금액</span>
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
      {(showKeepCompare || keyReason) && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--tds-gray-100)',
          }}
        >
          {/* 집 안 건드릴 경우 비교값 — 추천 전략이 keep이 아닐 때만 표시 */}
          {showKeepCompare && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--tds-gray-400)',
                marginBottom: keyReason ? 6 : 0,
              }}
            >
              집을 활용하지 않으면 월 {fmtKRW(keepMonthly!)}만원만 가능해요
            </div>
          )}
          {keyReason && (
            <div style={{ fontSize: 12, color: 'var(--tds-gray-500)', lineHeight: 1.6 }}>
              {keyReason}
            </div>
          )}
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
  targetMonthly,
}: {
  pathLines: Array<{ text: string; positive?: boolean }>;
  fundingTimeline: FundingStage[];
  retirementAge: number;
  lifeExpectancy: number;
  targetMonthly: number;
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
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)', letterSpacing: 0.1 }}>
          이런 흐름으로 자금이 움직여요
        </div>
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>
          목표 {targetMonthly}만원 기준 흐름이에요
        </div>
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
  targetMonthly,
}: {
  propertyOptions: PropertyOptionResult[];
  lifeExpectancy: number;
  targetMonthly: number;
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
        padding: '14px 18px',
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

// ── 마일스톤 바 (연도별 상세 탭 상단) ────────────────────────────────────────────

type MilestoneType = 'neutral' | 'positive' | 'warning';
interface Milestone { age: number; label: string; type: MilestoneType; }

function buildMilestones(
  rows: YearlyAggregateV2[],
  retirementAge: number,
  lifeExpectancy: number,
  inputs: PlannerInputs,
): Milestone[] {
  const ms: Milestone[] = [];

  // 은퇴 전 적자 전환
  const deficitAge = findPreRetirementDeficitAge(inputs);
  if (deficitAge !== null) {
    ms.push({ age: deficitAge, label: '적자 전환', type: 'warning' });
  }

  // 은퇴
  ms.push({ age: retirementAge, label: '은퇴', type: 'neutral' });

  // 퇴직연금
  if (inputs.pension.retirementPension.enabled) {
    ms.push({ age: inputs.pension.retirementPension.startAge, label: '퇴직연금 시작', type: 'positive' });
  }
  // 개인연금
  if (inputs.pension.privatePension.enabled) {
    ms.push({ age: inputs.pension.privatePension.startAge, label: '개인연금 시작', type: 'positive' });
  }
  // 국민연금
  if (inputs.pension.publicPension.enabled) {
    ms.push({ age: inputs.pension.publicPension.startAge, label: '국민연금 시작', type: 'positive' });
  }

  // 주식·채권 매도 시작
  for (const row of rows) {
    if (row.eventSummary.includes('주식·채권 팔기 시작')) {
      ms.push({ age: row.ageYear, label: '주식·채권 매도 시작', type: 'warning' });
      break;
    }
  }

  // 집 활용 시작 / 집 매각
  for (const row of rows) {
    if (row.eventSummary.includes('집 팔기')) {
      ms.push({ age: row.ageYear, label: '집 매각', type: 'neutral' });
      break;
    }
    if (row.eventSummary.includes('집 활용 시작')) {
      ms.push({ age: row.ageYear, label: '집 활용 시작', type: 'neutral' });
      break;
    }
  }

  // 자금 부족
  for (const row of rows) {
    if (row.totalShortfall > 0) {
      ms.push({ age: row.ageYear, label: '자금 부족', type: 'warning' });
      break;
    }
  }

  // 기대수명
  ms.push({ age: lifeExpectancy, label: '기대수명', type: 'neutral' });

  return ms.sort((a, b) => a.age - b.age);
}

function MilestoneBar({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;

  const bg: Record<MilestoneType, string> = {
    neutral: 'var(--tds-gray-100)',
    positive: '#E8F5E9',
    warning: '#FFF3E0',
  };
  const color: Record<MilestoneType, string> = {
    neutral: 'var(--tds-gray-600)',
    positive: '#1B7F3A',
    warning: '#E65100',
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tds-gray-400)', marginBottom: 8, letterSpacing: 0.3 }}>
        핵심 사건
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {milestones.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: bg[m.type],
              borderRadius: 20,
              padding: '4px 10px',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: color[m.type] }}>{m.age}세</span>
            <span style={{ fontSize: 11, color: color[m.type] }}>{m.label}</span>
          </div>
        ))}
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
  recommendedStrategyLabel,
  recommendedStrategy,
}: {
  detailYearlyAggregates: YearlyAggregateV2[];
  retirementAge: number;
  result: CalculationResult;
  inputs: PlannerInputs;
  recommendedStrategyLabel: string;
  recommendedStrategy: string;
}) {
  const [activeTab, setActiveTab] = useState<TabName>('요약');
  const hasRealEstate = inputs.assets.realEstate.amount > 0;

  // 집 활용 상세 계산 (연도별 상세 탭용)
  const lastRow = detailYearlyAggregates[detailYearlyAggregates.length - 1];
  const propertyTotalDraw = lastRow?.securedLoanBalanceEnd ?? 0;
  const finalPropertyNetValue = lastRow
    ? Math.max(0, lastRow.propertyValueEnd - lastRow.securedLoanBalanceEnd)
    : 0;
  let propertyInterventionAge: number | null = null;
  for (const row of detailYearlyAggregates) {
    if (row.eventSummary.includes('집 활용 시작') || row.eventSummary.includes('집 팔기')) {
      propertyInterventionAge = row.ageYear;
      break;
    }
  }

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
              targetMonthly={inputs.goal.targetMonthly}
              strategyLabel={recommendedStrategyLabel}
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
          <>
            {/* 1) 마일스톤 요약 */}
            <MilestoneBar
              milestones={buildMilestones(
                detailYearlyAggregates,
                retirementAge,
                inputs.goal.lifeExpectancy,
                inputs,
              )}
            />
            {/* 2) 금융 흐름 기본 표 */}
            <YearlySummaryTable
              rows={detailYearlyAggregates}
              retirementAge={retirementAge}
              strategyLabel={recommendedStrategyLabel}
              targetMonthly={inputs.goal.targetMonthly}
            />
            {/* 3) 집 활용 상세 — 유주택 + 실제 집 활용 케이스만 */}
            {hasRealEstate && propertyInterventionAge !== null && (
              <>
                <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '4px 0 20px' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tds-gray-500)', marginBottom: 10 }}>
                  집 활용 자세히 보기
                </div>
                <PropertyUsageCard
                  interventionAge={propertyInterventionAge}
                  strategy={recommendedStrategy}
                  totalDraw={propertyTotalDraw}
                  finalNetValue={finalPropertyNetValue}
                />
              </>
            )}
          </>
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

  // 은퇴 전 적자 전환점 (소득 증가율 < 생활비 증가율이고 은퇴 전 교차가 있을 때만)
  const deficitStartAge = findPreRetirementDeficitAge(inputs);
  if (deficitStartAge !== null) {
    pathLines.push({ text: `${deficitStartAge}세부터 생활비가 소득보다 빠르게 늘어 자산이 줄기 시작해요` });
  }

  if (summary.financialSellStartAge) {
    // 버퍼 정책 이유를 함께 표시: 현금이 6개월치 생활비 미만으로 줄면 투자자산 매도 발동
    pathLines.push({
      text: `${summary.financialSellStartAge}세부터 생활비 6개월치 현금 버퍼를 채우기 위해 주식·채권을 팔기 시작해요`,
    });
    if (summary.financialExhaustionAge) {
      pathLines.push({ text: `${summary.financialExhaustionAge}세에 주식·채권이 소진돼요` });
    }
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
        targetMonthly={inputs.goal.targetMonthly}
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
          recommendedStrategyLabel={recommendedStrategyLabel}
          recommendedStrategy={recommended?.strategy ?? 'keep'}
        />
      </div>

    </div>
  );
}
