import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import FundingTimeline from '../result/v2/FundingTimeline';
import YearlySummaryTable from '../result/v2/YearlySummaryTable';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyStrategyChart from '../charts/PropertyStrategyChart';
import type { PropertyOptionResult, YearlyAggregateV2, FundingStage } from '../../types/calculationV2';

/** 1단: 히어로 — 답 1개만 */
function HeroSection({
  sustainableMonthly,
  targetGap,
  recommendedLabel,
  pathLines,
}: {
  sustainableMonthly: number;
  targetGap: number;
  recommendedLabel: string;
  pathLines: Array<{ text: string; positive?: boolean }>;
}) {
  const positive = targetGap >= 0;
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--tds-gray-100)',
        padding: '28px 28px 24px',
        marginBottom: 12,
      }}
    >
      {/* 전략 레이블 */}
      <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginBottom: 8 }}>
        {recommendedLabel} 기준
      </div>

      {/* 핵심 숫자 — 화면 안에서 이것만 크게 */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 900,
          color: 'var(--tds-gray-900)',
          letterSpacing: '-1.5px',
          lineHeight: 1.1,
          marginBottom: 10,
        }}
      >
        월 {sustainableMonthly.toLocaleString()}만원
      </div>

      {/* 판단 1줄 */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: positive ? '#1B7F3A' : '#C0392B',
          marginBottom: 20,
        }}
      >
        {positive
          ? `목표보다 월 ${targetGap.toLocaleString()}만원 더 가능해요 ✓`
          : `목표보다 월 ${Math.abs(targetGap).toLocaleString()}만원이 부족해요`}
      </div>

      {/* 이유 3줄 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pathLines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: 13,
              color: line.positive ? '#1B7F3A' : 'var(--tds-gray-600)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--tds-gray-300)', flexShrink: 0 }}>·</span>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 2단: 선택지 비교 — 3개 row (카드 아님) */
function ComparisonRows({ options }: { options: PropertyOptionResult[] }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--tds-gray-100)',
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: '14px 20px 10px',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--tds-gray-400)',
          letterSpacing: 0.3,
          borderBottom: '1px solid var(--tds-gray-50)',
        }}
      >
        부동산 활용 방법 비교
      </div>
      {options.map((opt, i) => {
        const isRec = opt.isRecommended;
        const tagText = opt.survivesToLifeExpectancy
          ? '기대수명 달성'
          : `${opt.failureAge}세 고갈`;
        const tagPositive = opt.survivesToLifeExpectancy;

        return (
          <div
            key={opt.strategy}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 20px',
              borderBottom: i < options.length - 1 ? '1px solid var(--tds-gray-50)' : undefined,
              background: isRec ? 'var(--tds-blue-50, #EEF4FF)' : 'transparent',
              gap: 12,
            }}
          >
            {/* 전략명 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isRec ? 700 : 500,
                  color: isRec ? 'var(--tds-blue-600, #1A5DC2)' : 'var(--tds-gray-500)',
                }}
              >
                {opt.label}
              </span>
              {isRec && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--tds-blue-600, #1A5DC2)',
                    background: 'var(--tds-blue-100, #D6E4FF)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    verticalAlign: 'middle',
                  }}
                >
                  추천
                </span>
              )}
            </div>

            {/* 월 금액 */}
            <div
              style={{
                fontSize: 15,
                fontWeight: isRec ? 800 : 600,
                color: isRec ? 'var(--tds-blue-600, #1A5DC2)' : 'var(--tds-gray-400)',
                flexShrink: 0,
              }}
            >
              월 {opt.sustainableMonthly.toLocaleString()}만원
            </div>

            {/* 태그 */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: tagPositive ? '#1B7F3A' : 'var(--tds-gray-400)',
                background: tagPositive ? '#E8F5E9' : 'var(--tds-gray-100)',
                borderRadius: 6,
                padding: '3px 8px',
                flexShrink: 0,
                minWidth: 72,
                textAlign: 'center',
              }}
            >
              {tagText}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TABS = ['차트', '타임라인', '연도별 상세'] as const;
type TabName = (typeof TABS)[number];

export default function ResultWorkbench() {
  const resultV2 = usePlannerStore((s) => s.resultV2);
  const inputs = usePlannerStore((s) => s.inputs);

  /* ── 빈 상태 ── */
  if (!resultV2) {
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
            gap: 8,
          }}
        >
          <div style={{ fontSize: 28, color: 'var(--tds-gray-200)' }}>—</div>
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)', textAlign: 'center' }}>
            나이, 은퇴 나이, 기대수명, 목표 생활비를 입력하면
          </div>
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)' }}>분석이 시작돼요.</div>
        </div>
      </div>
    );
  }

  const { summary, propertyOptions, warnings, fundingTimeline, detailYearlyAggregates } = resultV2;
  const recommended = propertyOptions.find((o) => o.isRecommended);

  /* ── 자산 경로 3줄 ── */
  const pathLines: Array<{ text: string; positive?: boolean }> = [];

  if (summary.financialExhaustionAge) {
    pathLines.push({ text: `${summary.financialExhaustionAge}세에 투자자산이 소진돼요` });
  } else if (summary.financialSellStartAge) {
    pathLines.push({ text: `${summary.financialSellStartAge}세부터 투자자산을 팔기 시작해요` });
  } else {
    pathLines.push({ text: '투자자산은 기대수명까지 유지돼요', positive: true });
  }

  if (summary.propertyInterventionAge) {
    if (recommended?.strategy === 'secured_loan') {
      pathLines.push({ text: `${summary.propertyInterventionAge}세부터 집을 담보로 대출받아야 해요` });
    } else if (recommended?.strategy === 'sell') {
      pathLines.push({ text: `${summary.propertyInterventionAge}세에 집을 팔아 현금화해야 해요` });
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

  return (
    <div
      style={{
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '24px 20px 48px',
        scrollbarWidth: 'thin',
        borderLeft: '1px solid var(--tds-gray-100)',
      }}
    >
      {/* 치명 경고 — 히어로 위에만 */}
      {criticalWarnings.map((w, i) => (
        <div
          key={i}
          style={{
            background: '#FFF0F0',
            border: '1px solid #FFB3B3',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 12,
            fontSize: 13,
            color: '#C0392B',
            fontWeight: 600,
          }}
        >
          ⚠️ {w.message}
        </div>
      ))}

      {/* 1단: 히어로 */}
      <HeroSection
        sustainableMonthly={summary.sustainableMonthly}
        targetGap={summary.targetGap}
        recommendedLabel={recommended?.label ?? '추천 전략'}
        pathLines={pathLines}
      />

      {/* 2단: 선택지 비교 */}
      <ComparisonRows options={propertyOptions} />

      {/* info/warning 경고 — 비교 아래 */}
      {warnings
        .filter((w) => w.severity !== 'critical')
        .map((w, i) => (
          <div
            key={i}
            style={{
              fontSize: 12,
              color: w.severity === 'warning' ? '#8B6914' : 'var(--tds-gray-400)',
              padding: '8px 12px',
              marginBottom: 8,
              background: w.severity === 'warning' ? '#FFFBE6' : 'var(--tds-gray-50)',
              borderRadius: 8,
            }}
          >
            {w.severity === 'warning' ? '⚠ ' : 'ℹ '}{w.message}
          </div>
        ))}

      {/* 4단: 세부 분석 탭 */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid var(--tds-gray-100)',
          overflow: 'hidden',
          marginTop: 4,
        }}
      >
        <DetailTabsInner
          detailYearlyAggregates={detailYearlyAggregates}
          fundingTimeline={fundingTimeline}
          retirementAge={inputs.goal.retirementAge}
          lifeExpectancy={inputs.goal.lifeExpectancy}
          propertyOptions={propertyOptions}
        />
      </div>
    </div>
  );
}

function DetailTabsInner({
  detailYearlyAggregates,
  fundingTimeline,
  retirementAge,
  lifeExpectancy,
  propertyOptions,
}: {
  detailYearlyAggregates: YearlyAggregateV2[];
  fundingTimeline: FundingStage[];
  retirementAge: number;
  lifeExpectancy: number;
  propertyOptions: PropertyOptionResult[];
}) {
  const [activeTab, setActiveTab] = useState<TabName>('차트');

  return (
    <>
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--tds-gray-100)',
          background: 'var(--tds-gray-50)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 8px',
              fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--tds-blue-600, #1A5DC2)' : 'var(--tds-gray-400)',
              background: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === tab ? '2px solid var(--tds-blue-500)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ padding: '20px' }}>
        {activeTab === '차트' && (
          <>
            <AssetBalanceChart rows={detailYearlyAggregates} retirementAge={retirementAge} />
            <PropertyStrategyChart options={propertyOptions} />
          </>
        )}
        {activeTab === '타임라인' && (
          <FundingTimeline
            stages={fundingTimeline}
            retirementAge={retirementAge}
            lifeExpectancy={lifeExpectancy}
          />
        )}
        {activeTab === '연도별 상세' && (
          <YearlySummaryTable rows={detailYearlyAggregates} retirementAge={retirementAge} />
        )}
      </div>
    </>
  );
}
