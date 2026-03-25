import type { CalculationResult } from '../../../types/calculation';
import type { PlannerInputs } from '../../../types/inputs';
import { formatEok } from '../../../utils/format';

interface Props {
  result: CalculationResult;
  inputs: PlannerInputs;
}

function StatItem({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--tds-gray-50)',
        borderRadius: 10,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: valueColor ?? 'var(--tds-gray-800)',
          letterSpacing: '-0.3px',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

export default function SummaryTab({ result, inputs }: Props) {
  const {
    netWorth,
    totalAsset,
    totalDebt,
    weightedReturn,
    annualNetSavings,
    annualChildExpense,
  } = result;

  const netWorthColor = netWorth < 0 ? '#C0392B' : 'var(--tds-gray-800)';
  const savingsColor = annualNetSavings < 0 ? '#C0392B' : 'var(--tds-gray-800)';

  const monthlySavings = Math.round(annualNetSavings / 12);

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--tds-gray-500)',
          marginBottom: 12,
          letterSpacing: 0.2,
        }}
      >
        현재 자산 현황
      </div>

      {/* 2x2 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <StatItem
          label="순자산"
          value={formatEok(netWorth)}
          sub={`총자산 ${formatEok(totalAsset)}`}
          valueColor={netWorthColor}
        />
        <StatItem
          label="총부채"
          value={formatEok(totalDebt)}
          valueColor={totalDebt > 0 ? '#C0392B' : undefined}
        />
        <StatItem
          label="보유자산 평균 수익률"
          value={`연 ${weightedReturn.toFixed(1)}%`}
        />
        <StatItem
          label="올해 기준 여유자금"
          value={`월 ${monthlySavings >= 0 ? '+' : ''}${monthlySavings.toLocaleString()}만원`}
          sub="세후소득 - 지출 - 부채상환"
          valueColor={savingsColor}
        />
      </div>

      {/* 자녀 지출 (있는 경우만) */}
      {inputs.children.hasChildren && annualChildExpense > 0 && (
        <StatItem
          label="자녀 관련 연 지출"
          value={formatEok(annualChildExpense)}
          sub={`${inputs.children.independenceAge}세까지 계속`}
        />
      )}

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: 'var(--tds-gray-300)',
          lineHeight: 1.5,
        }}
      >
        * 보유자산 평균 수익률은 자산별 비중을 반영한 가중평균 기준이에요.
      </div>
    </div>
  );
}
