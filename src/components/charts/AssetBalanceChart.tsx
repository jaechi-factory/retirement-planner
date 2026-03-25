/**
 * 권장 전략 기준 — 버킷별 연말 잔고 추이 차트
 * cashLike / financialInvestable / propertyValue (담보대출 차감 후)
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { YearlyAggregateV2 } from '../../types/calculationV2';

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
  strategyLabel?: string;
}

function fmt(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(0)}억`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}천`;
  return `${v}`;
}

export default function AssetBalanceChart({ rows, retirementAge, strategyLabel }: Props) {
  if (rows.length === 0) return null;

  const data = rows.map((r) => ({
    age: r.ageYear,
    '현금·예금': r.cashLikeEnd,
    '주식·채권': r.financialInvestableEnd,
    부동산: Math.max(0, r.propertyValueEnd - r.securedLoanBalanceEnd),
    shortfall: r.totalShortfall,
  }));

  return (
    <div
      style={{
        background: 'var(--tds-white)',
        borderRadius: 16,
        padding: '20px 20px 12px',
        marginBottom: 20,
        border: '1px solid var(--tds-gray-100)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)' }}>
          자산별 남은 돈 변화
        </div>
        {strategyLabel && (
          <span style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
            {strategyLabel} 기준
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1565C0" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1565C0" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4527A0" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#4527A0" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E65100" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#E65100" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            tickFormatter={fmt}
            tick={{ fontSize: 10, fill: 'var(--tds-gray-400)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value, name) => [`${Number(value).toLocaleString()}만원`, name as string]}
            labelFormatter={(label) => `${label}세`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--tds-gray-100)' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {/* 은퇴 시점 수직선 */}
          <Area
            type="monotone"
            dataKey="현금·예금"
            stroke="#1565C0"
            strokeWidth={1.5}
            fill="url(#cashGrad)"
          />
          <Area
            type="monotone"
            dataKey="주식·채권"
            stroke="#4527A0"
            strokeWidth={1.5}
            fill="url(#finGrad)"
          />
          <Area
            type="monotone"
            dataKey="부동산"
            stroke="#E65100"
            strokeWidth={1.5}
            fill="url(#propGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      {retirementAge > 0 && (
        <div style={{ fontSize: 10, color: 'var(--tds-gray-400)', textAlign: 'right', padding: '0 16px', marginTop: 4 }}>
          은퇴 시점: {retirementAge}세 / 부동산 = 집 시세 - 대출 잔금
        </div>
      )}
    </div>
  );
}
