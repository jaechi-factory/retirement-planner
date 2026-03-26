/**
 * 차트 B — 집 자산 변화 (집 가치 / 대출 잔금 / 순주택가치)
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { YearlyAggregateV2 } from '../../types/calculationV2';
import { fmtKRW, fmtKRWAxis } from '../../utils/format';

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
}

export default function PropertyAssetChart({ rows, retirementAge }: Props) {
  if (rows.length === 0) return null;

  const hasLoan = rows.some((r) => r.securedLoanBalanceEnd > 0);

  const data = rows.map((r) => {
    const netProperty = Math.max(0, r.propertyValueEnd - r.securedLoanBalanceEnd);
    const point: Record<string, number> = {
      age: r.ageYear,
      '집 가치': r.propertyValueEnd,
      '순주택가치': netProperty,
    };
    if (hasLoan) point['대출 잔금'] = r.securedLoanBalanceEnd;
    return point;
  });

  return (
    <div
      style={{
        background: 'var(--tds-gray-50)',
        borderRadius: 12,
        padding: '16px 18px 10px',
        marginBottom: 20,
        border: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tds-gray-400)' }}>
          집 자산 추이
        </div>
        <span style={{ fontSize: 10, color: 'var(--tds-gray-300)' }}>· 참고용</span>
      </div>
      <ResponsiveContainer width="100%" height={175}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tds-gray-100)" />
          <XAxis
            dataKey="age"
            tickFormatter={(v) => `${v}세`}
            tick={{ fontSize: 10, fill: 'var(--tds-gray-400)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtKRWAxis}
            tick={{ fontSize: 10, fill: 'var(--tds-gray-400)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value, name) => [fmtKRW(Number(value)), name as string]}
            labelFormatter={(label) => `${label}세`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--tds-gray-100)' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="집 가치"
            stroke="#E65100"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="순주택가치"
            stroke="#F57C00"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
          />
          {hasLoan && (
            <Line
              type="monotone"
              dataKey="대출 잔금"
              stroke="#B71C1C"
              strokeWidth={1.5}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {retirementAge > 0 && (
        <div style={{ fontSize: 10, color: 'var(--tds-gray-300)', textAlign: 'right', marginTop: 4 }}>
          은퇴 {retirementAge}세
        </div>
      )}
    </div>
  );
}
