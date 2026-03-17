import { usePlannerStore } from '../../store/usePlannerStore';
import StatCard from '../analysis/StatCard';
import AssetProjectionChart from '../analysis/AssetProjectionChart';
import InsightSentences from '../analysis/InsightSentences';
import { formatEok, formatPercent } from '../../utils/format';
import { getPensionBreakdown } from '../../engine/pensionEstimation';

export default function RightPanel() {
  const { inputs, result, verdict } = usePlannerStore();

  if (!result.isValid || !verdict) return null;

  const netWorthColor =
    result.netWorth < 0 ? 'var(--tds-red-500)' : 'var(--tds-gray-900)';
  const savingsColor =
    result.annualNetSavings < 0 ? 'var(--tds-red-500)' : 'var(--tds-green-500)';

  const pensionBreakdown = getPensionBreakdown(
    inputs.pension,
    inputs.status.currentAge,
    inputs.goal.retirementAge,
    inputs.status.annualIncome,
  );
  const coveragePct = Math.round(result.pensionCoverageRate * 100);

  return (
    <div
      style={{
        width: 380,
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
    >
      {/* 자산 요약 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StatCard
          label="순자산"
          value={formatEok(result.netWorth)}
          sub={`총자산 ${formatEok(result.totalAsset)}`}
          valueColor={netWorthColor}
        />
        <StatCard
          label="총부채"
          value={formatEok(result.totalDebt)}
          valueColor={result.totalDebt > 0 ? 'var(--tds-red-500)' : undefined}
        />
        <StatCard
          label="전체 기대수익률"
          value={formatPercent(result.weightedReturn)}
          sub="가중평균"
          valueColor="var(--tds-blue-500)"
        />
        <StatCard
          label="올해 기준 여유자금"
          value={formatEok(result.annualNetSavings)}
          sub="현재 입력 기준 · 해마다 달라짐"
          valueColor={savingsColor}
        />
      </div>

      {/* 자녀 지출 (있는 경우만) */}
      {inputs.children.hasChildren && (
        <div style={{ marginBottom: 12 }}>
          <StatCard
            label="자녀 관련 연 지출"
            value={formatEok(result.annualChildExpense)}
            sub={`${inputs.children.independenceAge}세까지 계속`}
          />
        </div>
      )}

      {/* 연금 결과 카드 */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '20px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)', marginBottom: 12 }}>
          은퇴 후 예상 연금 수입
        </div>

        {/* 합계 + 커버율 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-blue-500)' }}>
              월 {result.totalMonthlyPensionTodayValue.toLocaleString('ko-KR')}만원
            </div>
            <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>
              국민 + 퇴직 + 개인연금 합산 · 현재가치
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              padding: '6px 14px',
              borderRadius: 12,
              background: coveragePct >= 100 ? 'var(--tds-green-50)' : coveragePct >= 50 ? 'var(--tds-blue-50)' : 'var(--tds-orange-50)',
              color: coveragePct >= 100 ? 'var(--tds-green-500)' : coveragePct >= 50 ? 'var(--tds-blue-500)' : 'var(--tds-orange-500)',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800 }}>{coveragePct}%</div>
            <div style={{ fontSize: 10, fontWeight: 600 }}>목표 커버율</div>
          </div>
        </div>

        {/* 항목별 분해 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: '국민연금', value: pensionBreakdown.publicMonthly, enabled: inputs.pension.publicPension.enabled },
            { label: '퇴직연금', value: pensionBreakdown.retirementMonthly, enabled: inputs.pension.retirementPension.enabled },
            { label: '개인연금', value: pensionBreakdown.privateMonthly, enabled: inputs.pension.privatePension.enabled },
          ].map(({ label, value, enabled }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--tds-gray-500)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: enabled ? 'var(--tds-gray-900)' : 'var(--tds-gray-300)' }}>
                {enabled ? `월 ${value.toLocaleString('ko-KR')}만원` : '미반영'}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--tds-gray-300)', margin: '10px 0 0' }}>
          평균 가정 기반 추정치 · 입력한 값이 있으면 해당 값 우선 적용
        </p>
      </div>

      {/* 차트 */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '20px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          marginBottom: 12,
        }}
      >
        <AssetProjectionChart
          snapshots={result.yearlySnapshots}
          retirementAge={inputs.goal.retirementAge}
        />
      </div>

      {/* 해석 문장 */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '20px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <InsightSentences result={result} inputs={inputs} verdict={verdict} />
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
