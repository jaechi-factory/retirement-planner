import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { YearlySnapshot } from '../../types/calculation';

interface Props {
  snapshots: YearlySnapshot[];
  retirementAge: number;
}

export default function AssetProjectionChart({ snapshots, retirementAge }: Props) {
  if (snapshots.length === 0) return null;

  const data = snapshots.map((s) => ({
    age: s.age,
    asset: Math.max(0, Math.round(s.totalAsset / 10000) * 10000) / 10000, // 억원
    retired: s.isRetired,
  }));

  const maxAsset = Math.max(...data.map((d) => d.asset), 1);

  return (
    <div>
      <p
        style={{
          margin: '0 0 12px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--tds-gray-700)',
        }}
      >
        자산 변화 추이
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tds-gray-100)" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: 'var(--tds-gray-500)' }}
            tickLine={false}
            axisLine={false}
            label={{ value: '나이', position: 'insideBottomRight', offset: -4, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--tds-gray-500)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}억`}
            domain={[0, Math.ceil(maxAsset * 1.1)]}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}억원`, '자산']}
            labelFormatter={(label) => `${label}세`}
            contentStyle={{
              borderRadius: 8,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              fontSize: 13,
            }}
          />
          <ReferenceLine
            x={retirementAge}
            stroke="var(--tds-blue-400)"
            strokeDasharray="4 3"
            label={{ value: '은퇴', position: 'top', fontSize: 11, fill: 'var(--tds-blue-500)' }}
          />
          <Line
            type="monotone"
            dataKey="asset"
            stroke="var(--tds-blue-500)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
