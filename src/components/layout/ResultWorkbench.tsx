import { usePlannerStore } from '../../store/usePlannerStore';
import FundingTimeline from '../result/v2/FundingTimeline';
import YearlySummaryTable from '../result/v2/YearlySummaryTable';
import AssetBalanceChart from '../charts/AssetBalanceChart';
import PropertyStrategyChart from '../charts/PropertyStrategyChart';

function formatManwon(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}억`;
  return `${value.toLocaleString()}만원`;
}

export default function ResultWorkbench() {
  const resultV2 = usePlannerStore((s) => s.resultV2);

  if (!resultV2) {
    return (
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          padding: '40px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--tds-gray-400)',
          fontSize: 15,
        }}
      >
        나이, 은퇴 나이, 기대수명, 목표 생활비를 입력하면 분석이 시작돼요.
      </div>
    );
  }

  const { summary, propertyOptions, warnings, fundingTimeline, detailYearlyAggregates } = resultV2;
  const inputs = usePlannerStore((s) => s.inputs);
  const recommended = propertyOptions.find((o) => o.isRecommended);
  const targetGapPositive = summary.targetGap >= 0;

  return (
    <div
      style={{
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '32px 32px 48px',
        scrollbarWidth: 'thin',
        background: 'var(--tds-gray-50)',
      }}
    >
      {/* 경고 배너 */}
      {warnings.filter((w) => w.severity === 'critical').map((w, i) => (
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
          }}
        >
          ⚠️ {w.message}
        </div>
      ))}

      {/* 히어로 요약 카드 */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          marginBottom: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid var(--tds-gray-100)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--tds-gray-500)', marginBottom: 6 }}>
          {recommended?.label ?? '권장 전략'} 기준
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--tds-gray-900)', letterSpacing: '-1px' }}>
            월 {summary.sustainableMonthly.toLocaleString()}만원
          </span>
          <span style={{ fontSize: 15, color: 'var(--tds-gray-500)', paddingBottom: 6 }}>
            까지 가능해요
          </span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: targetGapPositive ? '#2E7D32' : '#C0392B',
            marginBottom: 20,
          }}
        >
          {targetGapPositive
            ? `목표보다 월 ${summary.targetGap.toLocaleString()}만원 더 가능 ✓`
            : `목표보다 월 ${Math.abs(summary.targetGap).toLocaleString()}만원 부족`}
        </div>

        {/* 이벤트 나이 요약 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {[
            {
              label: '투자자산 매도 시작',
              value: summary.financialSellStartAge ? `${summary.financialSellStartAge}세` : '해당없음',
            },
            {
              label: '투자자산 소진',
              value: summary.financialExhaustionAge ? `${summary.financialExhaustionAge}세` : '해당없음',
            },
            {
              label: summary.failureAge ? '자금 부족 시작' : '기대수명까지 유지',
              value: summary.failureAge ? `${summary.failureAge}세` : '✓',
              highlight: !summary.failureAge,
              warn: !!summary.failureAge,
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: 'var(--tds-gray-50)',
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 4 }}>
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: item.warn ? '#C0392B' : item.highlight ? '#2E7D32' : 'var(--tds-gray-800)',
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 전략 비교 카드 3개 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tds-gray-700)', marginBottom: 12 }}>
          부동산 활용 전략 비교
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {propertyOptions.map((opt) => (
            <div
              key={opt.strategy}
              style={{
                background: 'var(--tds-white)',
                border: opt.isRecommended
                  ? '2px solid var(--tds-blue-500)'
                  : '1px solid var(--tds-gray-100)',
                borderRadius: 12,
                padding: '16px 18px',
                boxShadow: opt.isRecommended ? '0 2px 12px rgba(0,100,255,0.08)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: opt.isRecommended ? 'var(--tds-blue-600)' : 'var(--tds-gray-700)',
                  }}
                >
                  {opt.label}
                </span>
                {opt.isRecommended && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--tds-blue-600)',
                      background: 'var(--tds-blue-50)',
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    추천
                  </span>
                )}
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 15,
                    fontWeight: 700,
                    color: opt.survivesToLifeExpectancy ? '#2E7D32' : '#C0392B',
                  }}
                >
                  월 {opt.sustainableMonthly.toLocaleString()}만원
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tds-gray-500)' }}>{opt.headline}</div>
              {opt.finalNetWorth > 0 && (
                <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 4 }}>
                  기대수명 시점 순자산 {formatManwon(opt.finalNetWorth)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 경고 (info/warning) */}
      {warnings.filter((w) => w.severity !== 'critical').map((w, i) => (
        <div
          key={i}
          style={{
            background: w.severity === 'warning' ? '#FFFBE6' : 'var(--tds-gray-50)',
            border: `1px solid ${w.severity === 'warning' ? '#FFE58F' : 'var(--tds-gray-100)'}`,
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 8,
            fontSize: 12,
            color: w.severity === 'warning' ? '#8B6914' : 'var(--tds-gray-500)',
          }}
        >
          {w.severity === 'warning' ? '⚠ ' : 'ℹ '}{w.message}
        </div>
      ))}

      {/* 차트: 버킷별 자산 잔고 추이 */}
      <AssetBalanceChart
        rows={detailYearlyAggregates}
        retirementAge={inputs.goal.retirementAge}
      />

      {/* 차트: 전략 비교 */}
      <PropertyStrategyChart options={propertyOptions} />

      {/* 자금 조달 타임라인 */}
      <FundingTimeline
        stages={fundingTimeline}
        retirementAge={inputs.goal.retirementAge}
        lifeExpectancy={inputs.goal.lifeExpectancy}
      />

      {/* 연도별 상세 테이블 (월별 드릴다운 포함) */}
      <YearlySummaryTable
        rows={detailYearlyAggregates}
        retirementAge={inputs.goal.retirementAge}
      />
    </div>
  );
}
