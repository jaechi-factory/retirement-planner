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
  hasRealEstate: boolean,
): string | null {
  const allFail = propertyOptions.every((o) => !o.survivesToLifeExpectancy);
  const keepOpt = propertyOptions.find((o) => o.strategy === 'keep');

  if (allFail) {
    return '지금 조건에선 어떤 전략을 써도 기대수명까지 자금을 유지하기 어려워요. 목표 생활비나 저축 구조를 점검해보세요.';
  }
  if (hasRealEstate && keepOpt && !keepOpt.survivesToLifeExpectancy) {
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

// ── 은퇴 전 적자 전환 나이 계산 ────────────────────────────────────────────────
// 소득 성장률 < 생활비 성장률일 때 교차하는 나이 (은퇴 전 구간만 반환)
function findPreRetirementDeficitAge(inputs: PlannerInputs): number | null {
  const { annualIncome, annualExpense, incomeGrowthRate, expenseGrowthRate, currentAge } = inputs.status;
  const { retirementAge } = inputs.goal;

  if (annualIncome <= annualExpense) return null; // 이미 적자
  if (expenseGrowthRate <= incomeGrowthRate) return null; // 교차 없음

  const i = incomeGrowthRate / 100;
  const e = expenseGrowthRate / 100;
  const t = Math.log(annualIncome / annualExpense) / Math.log((1 + e) / (1 + i));
  const age = Math.floor(currentAge + t); // 교차가 일어나는 나이 (해당 나이 중에 역전)

  if (age <= currentAge || age >= retirementAge) return null;
  return age;
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

// ── 집 활용 메인 요약 바 (2-item compact) ────────────────────────────────────
function PropertySummaryBar({
  interventionAge,
  strategy,
  finalNetValue,
  finalFinancialAssets,
}: {
  interventionAge: number;
  strategy: string;
  finalNetValue: number;
  finalFinancialAssets: number;
}) {
  const isSell = strategy === 'sell';
  const startLabel = isSell ? '집 매각 시점' : '집 생활비 보충 시작';

  const finalTotal = finalNetValue + finalFinancialAssets;
  const netValue = finalTotal > 0 ? fmtKRW(finalTotal) : '없음';
  const netSub =
    finalTotal > 0
      ? finalNetValue > 0
        ? `집 ${fmtKRW(finalNetValue)} + 금융 ${fmtKRW(finalFinancialAssets)}`
        : `금융자산 ${fmtKRW(finalFinancialAssets)}`
      : null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        background: '#F5F8FF',
        border: '1px solid #C8DEFF',
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, padding: '10px 14px' }}>
        <div style={{ fontSize: 10, color: 'var(--tds-gray-400)', marginBottom: 3 }}>{startLabel}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-800)' }}>{interventionAge}세</div>
      </div>
      <div style={{ width: 1, background: '#DDE8FF', alignSelf: 'stretch' }} />
      <div style={{ flex: 2, padding: '10px 14px' }}>
        <div style={{ fontSize: 10, color: 'var(--tds-gray-400)', marginBottom: 3 }}>기대수명까지 남는 자산</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-800)' }}>{netValue}</div>
        {netSub && (
          <div style={{ fontSize: 10, color: 'var(--tds-gray-400)', marginTop: 2 }}>{netSub}</div>
        )}
      </div>
    </div>
  );
}

// ── 집 활용 시나리오 카드 ─────────────────────────────────────────────────────
function PropertyUsageCard({
  interventionAge,
  strategy,
  totalDraw,
  finalNetValue,
}: {
  interventionAge: number;
  strategy: string;
  totalDraw: number;
  finalNetValue: number;
}) {
  const isLoan = strategy === 'secured_loan';

  // sell 전략은 메인 바에서 이미 모든 정보가 표현됨 — 상세 카드 불필요
  if (!isLoan) return null;

  return (
    <div
      style={{
        borderRadius: 12,
        background: '#F5F8FF',
        border: '1px solid #C8DEFF',
        padding: '16px 18px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1565C0', marginBottom: 12 }}>
        집 활용 수치 확인
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 집에서 받은 누적 생활비 — secured_loan만 */}
        {totalDraw > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--tds-gray-500)' }}>집으로 보탠 생활비 총액</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-800)' }}>
              {fmtKRW(totalDraw)}
            </span>
          </div>
        )}
        {/* 기대수명 시점 남는 집 가치 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: 'var(--tds-gray-500)' }}>기대수명 시점 남는 집 가치</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: finalNetValue > 0 ? 'var(--tds-gray-800)' : 'var(--tds-gray-400)',
            }}
          >
            {finalNetValue > 0 ? fmtKRW(finalNetValue) : '0'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 3층: 집 전략 비교 ──────────────────────────────────────────────────────────
function HomeOptionsSection({
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
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tds-gray-400)' }}>
          집을 어떻게 다룰지에 따라 달라져요
        </div>
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 3 }}>
          금액: 전략별 최대 월생활비 · 판정: 목표 {targetMonthly}만원 기준
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                padding: '9px 12px',
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
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tds-gray-900)' }}>
                      월 {fmtKRW(opt.sustainableMonthly)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tds-gray-300)', marginTop: 1 }}>
                      최대 가능 금액
                    </div>
                  </>
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
  const keepOpt = propertyOptions.find((o) => o.strategy === 'keep');
  const recommendedStrategyLabel = STRATEGY_DISPLAY_LABELS[recommended?.strategy ?? ''] ?? (recommended?.label ?? '추천 전략');

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
  } else if (inputs.assets.realEstate.amount > 0) {
    pathLines.push({ text: '집을 건드리지 않아도 기대수명까지 가능해요', positive: true });
  }

  if (summary.failureAge) {
    pathLines.push({ text: `${summary.failureAge}세에 자금이 부족해요` });
  } else {
    pathLines.push({ text: '기대수명까지 자금이 유지돼요', positive: true });
  }

  // 집 활용 메인 요약용 계산값
  const lastAggRow = detailYearlyAggregates[detailYearlyAggregates.length - 1];
  const finalPropertyNetValue = lastAggRow
    ? Math.max(0, lastAggRow.propertyValueEnd - lastAggRow.securedLoanBalanceEnd)
    : 0;
  const finalFinancialAssets = lastAggRow
    ? (lastAggRow.cashLikeEnd ?? 0) + (lastAggRow.financialInvestableEnd ?? 0)
    : 0;

  // 해석 문장
  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  const insightLine = buildInsightLine(
    propertyOptions,
    summary.targetGap,
    result.pensionCoverageRate,
    hasRealEstate,
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
        recommendedLabel={recommendedStrategyLabel}
        isKeepRecommended={recommended?.strategy === 'keep'}
        keepMonthly={recommended?.strategy !== 'keep' ? keepOpt?.sustainableMonthly : undefined}
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

      {/* 해석 문장 (WhyPath → HomeOptions 사이) */}
      {insightLine && <InsightLine text={insightLine} />}

      {/* 집 활용 시나리오 요약 바 — 전략 비교 전에 결과 먼저 */}
      {hasRealEstate && summary.propertyInterventionAge !== null && recommended?.strategy && (
        <PropertySummaryBar
          interventionAge={summary.propertyInterventionAge}
          strategy={recommended.strategy}
          finalNetValue={finalPropertyNetValue}
          finalFinancialAssets={finalFinancialAssets}
        />
      )}

      {/* 3층: 집 전략 비교 — 부동산 자산이 있을 때만 */}
      {hasRealEstate && (
        <HomeOptionsSection
          propertyOptions={propertyOptions}
          lifeExpectancy={inputs.goal.lifeExpectancy}
          targetMonthly={inputs.goal.targetMonthly}
        />
      )}

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
          result={result}
          inputs={inputs}
          recommendedStrategyLabel={recommendedStrategyLabel}
          recommendedStrategy={recommended?.strategy ?? 'keep'}
        />
      </div>
    </div>
  );
}
