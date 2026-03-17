import { usePlannerStore } from '../../store/usePlannerStore';
import StatCard from '../analysis/StatCard';
import AssetProjectionChart from '../analysis/AssetProjectionChart';
import InsightSentences from '../analysis/InsightSentences';
import { formatEok, formatPercent } from '../../utils/format';

export default function RightPanel() {
  const { inputs, result, verdict } = usePlannerStore();

  if (!result.isValid || !verdict) return null;

  const netWorthColor =
    result.netWorth < 0 ? 'var(--tds-red-500)' : 'var(--tds-gray-900)';
  const savingsColor =
    result.annualNetSavings < 0 ? 'var(--tds-red-500)' : 'var(--tds-green-500)';

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
          label="연간 순저축액"
          value={formatEok(result.annualNetSavings)}
          sub="세후 소득 기준"
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
