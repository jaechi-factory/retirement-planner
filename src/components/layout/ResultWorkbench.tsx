import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import FundingTimeline from '../result/v2/FundingTimeline';
import YearlySummaryTable from '../result/v2/YearlySummaryTable';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import SummaryTab from '../result/v2/SummaryTab';
import PensionTab from '../result/v2/PensionTab';
import type { PropertyOptionResult, YearlyAggregateV2, FundingStage } from '../../types/calculationV2';
import type { CalculationResult } from '../../types/calculation';
import type { PlannerInputs } from '../../types/inputs';

// ── 1층: Hero ─────────────────────────────────────────────────────────────────
function HeroSection({
  sustainableMonthly,
  targetGap,
  recommendedLabel,
}: {
  sustainableMonthly: number;
  targetGap: number;
  recommendedLabel: string;
}) {
  const positive = targetGap >= 0;
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--tds-gray-100)',
        padding: '32px 28px 28px',
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginBottom: 10, letterSpacing: 0.2 }}>
        {recommendedLabel} 기준
      </div>
      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          color: 'var(--tds-gray-900)',
          letterSpacing: '-2px',
          lineHeight: 1.1,
          marginBottom: 14,
        }}
      >
        월 {sustainableMonthly.toLocaleString()}만원
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: positive ? '#1B7F3A' : '#C0392B',
          lineHeight: 1.5,
        }}
      >
        {positive
          ? `목표보다 월 ${targetGap.toLocaleString()}만원 더 가능해요 ✓`
          : `목표보다 월 ${Math.abs(targetGap).toLocaleString()}만원이 부족해요`}
      </div>
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
        marginBottom: 20,
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

// ── 3층: 전략 비교 ─────────────────────────────────────────────────────────────
function ComparisonRows({ options }: { options: PropertyOptionResult[] }) {
  // 좋은 순서로 정렬: 기대수명 달성 → failureAge 내림차순 → monthly 내림차순
  const sorted = [...options].sort((a, b) => {
    if (a.survivesToLifeExpectancy !== b.survivesToLifeExpectancy)
      return a.survivesToLifeExpectancy ? -1 : 1;
    const aFail = a.failureAge ?? Infinity;
    const bFail = b.failureAge ?? Infinity;
    if (aFail !== bFail) return bFail - aFail;
    return b.sustainableMonthly - a.sustainableMonthly;
  });

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--tds-gray-100)',
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          padding: '16px 20px 12px',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--tds-gray-400)',
          letterSpacing: 0.3,
          borderBottom: '1px solid var(--tds-gray-100)',
        }}
      >
        집 활용 방식별 비교
      </div>
      {sorted.map((opt, i) => {
        const isRec = opt.isRecommended;

        let statusLabel: string;
        let statusPositive: boolean;
        if (opt.survivesToLifeExpectancy) {
          statusLabel = '기대수명 달성';
          statusPositive = true;
        } else if (opt.failureAge !== null) {
          statusLabel = `${opt.failureAge}세까지`;
          statusPositive = false;
        } else {
          statusLabel = '지속 불가';
          statusPositive = false;
        }

        const amountText = opt.sustainableMonthly > 0
          ? `월 ${opt.sustainableMonthly.toLocaleString()}만원`
          : '지속 불가';

        return (
          <div
            key={opt.strategy}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: i < sorted.length - 1 ? '1px solid var(--tds-gray-50)' : undefined,
              background: isRec ? 'var(--tds-blue-50, #EEF4FF)' : 'transparent',
              gap: 12,
            }}
          >
            {/* 전략명 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: isRec ? 700 : 500,
                  color: isRec ? 'var(--tds-blue-600, #1A5DC2)' : 'var(--tds-gray-500)',
                  lineHeight: 1.5,
                }}
              >
                {opt.label}
                {isRec && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--tds-blue-600, #1A5DC2)',
                      background: 'var(--tds-blue-100, #D6E4FF)',
                      borderRadius: 4,
                      padding: '1px 6px',
                      verticalAlign: 'middle',
                    }}
                  >
                    추천
                  </span>
                )}
              </div>
            </div>

            {/* 월 금액 */}
            <div
              style={{
                fontSize: 14,
                fontWeight: isRec ? 800 : 500,
                color: isRec ? 'var(--tds-blue-600, #1A5DC2)' : 'var(--tds-gray-400)',
                flexShrink: 0,
              }}
            >
              {amountText}
            </div>

            {/* 상태 태그 */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: statusPositive ? '#1B7F3A' : 'var(--tds-gray-400)',
                background: statusPositive ? '#E8F5E9' : 'var(--tds-gray-100)',
                borderRadius: 6,
                padding: '4px 10px',
                flexShrink: 0,
                minWidth: 68,
                textAlign: 'center',
              }}
            >
              {statusLabel}
            </div>
          </div>
        );
      })}
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
  propertyOptions: PropertyOptionResult[];
  strategyLabel: string;
  result: CalculationResult;
  inputs: PlannerInputs;
}) {
  const [activeTab, setActiveTab] = useState<TabName>('요약');

  return (
    <>
      {/* 탭 헤더 */}
      <div
        style={{
          padding: '10px 20px 0',
          background: 'var(--tds-gray-50)',
          borderBottom: '1px solid var(--tds-gray-100)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tds-gray-400)', letterSpacing: 0.5, marginBottom: 10 }}>
          세부 분석
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? 'var(--tds-blue-600, #1A5DC2)' : 'var(--tds-gray-400)',
                background: activeTab === tab ? 'var(--tds-white)' : 'transparent',
                border: activeTab === tab ? '1px solid var(--tds-gray-100)' : '1px solid transparent',
                borderBottom: activeTab === tab ? '1px solid var(--tds-white)' : '1px solid transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                marginBottom: -1,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {activeTab === '요약' && <SummaryTab result={result} inputs={inputs} />}
        {activeTab === '연금' && <PensionTab result={result} inputs={inputs} />}
        {activeTab === '자산 추이' && (
          <AssetBalanceChart
            rows={detailYearlyAggregates}
            retirementAge={retirementAge}
            strategyLabel={strategyLabel}
          />
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

  const criticalWarnings = warnings.filter((w) => w.severity === 'critical');
  const otherWarnings = warnings.filter((w) => w.severity !== 'critical');

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
      {/* 치명 경고 */}
      {criticalWarnings.map((w, i) => (
        <div
          key={i}
          style={{
            background: '#FFF0F0',
            border: '1px solid #FFB3B3',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#C0392B',
            fontWeight: 600,
            lineHeight: 1.6,
          }}
        >
          ⚠️ {w.message}
        </div>
      ))}

      {/* 1층: Hero */}
      <HeroSection
        sustainableMonthly={summary.sustainableMonthly}
        targetGap={summary.targetGap}
        recommendedLabel={recommended?.label ?? '추천 전략'}
      />

      {/* 2층: Why/Path */}
      <WhyPathSection
        pathLines={pathLines}
        fundingTimeline={fundingTimeline}
        retirementAge={inputs.goal.retirementAge}
        lifeExpectancy={inputs.goal.lifeExpectancy}
      />


      {/* info/warning 경고 */}
      {otherWarnings.map((w, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: w.severity === 'warning' ? '#8B6914' : 'var(--tds-gray-400)',
            padding: '10px 14px',
            marginBottom: 10,
            background: w.severity === 'warning' ? '#FFFBE6' : 'var(--tds-gray-50)',
            borderRadius: 8,
          }}
        >
          {w.severity === 'warning' ? '⚠ ' : 'ℹ '}{w.message}
        </div>
      ))}

      {/* 4층: 세부 분석 탭 */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid var(--tds-gray-100)',
          overflow: 'hidden',
          marginTop: 8,
        }}
      >
        <DetailTabsInner
          detailYearlyAggregates={detailYearlyAggregates}
          retirementAge={inputs.goal.retirementAge}
          propertyOptions={propertyOptions}
          strategyLabel={recommended?.label ?? ''}
          result={result}
          inputs={inputs}
        />
      </div>
    </div>
  );
}
