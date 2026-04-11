/**
 * 3가지 부동산 전략 월 생활비 비교 바 차트
 * + 각 전략별 연도별 총자산(cashLike+financial+property-loan) 추이 오버레이
 */
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PropertyOptionResult } from '../../types/calculationV2';

interface Props {
  options: PropertyOptionResult[];
}

const COLORS = {
  keep:          { bar: '#2E7D32', line: '#43A047' },
  secured_loan:  { bar: '#1565C0', line: '#1E88E5' },
  sell:          { bar: '#E65100', line: '#FB8C00' },
};

const LABELS: Record<string, string> = {
  keep: '집 그냥 두기',
  secured_loan: '집 담보 대출',
  sell: '집 팔기',
};

export default function PropertyStrategyChart({ options }: Props) {
  if (options.length === 0) return null;

  // 지속가능 월 생활비 바 차트 데이터
  const barData = options.map((o) => ({
    name: LABELS[o.strategy] ?? o.strategy,
    월생활비: o.sustainableMonthly,
    strategy: o.strategy,
    recommended: o.isRecommended,
  }));

  // 연도별 순자산 추이 — 세 전략 오버레이 (공통 연도 기준)
  const allAges = Array.from(
    new Set(options.flatMap((o) => o.yearlyAggregates.map((r) => r.ageYear)))
  ).sort((a, b) => a - b);

  const lineData = allAges.map((age) => {
    const row: Record<string, number | string> = { age };
    for (const opt of options) {
      const yr = opt.yearlyAggregates.find((r) => r.ageYear === age);
      if (yr) {
        row[LABELS[opt.strategy]] = Math.max(
          0,
          yr.cashLikeEnd + yr.financialInvestableEnd + yr.propertyValueEnd - yr.securedLoanBalanceEnd,
        );
      }
    }
    return row;
  });

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        borderRadius: 16,
        padding: '20px 20px 12px',
        marginBottom: 20,
      }}
    >
      {/* 지속가능 생활비 비교 */}
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-base)', marginBottom: 12 }}>
        방법별 최대 월 생활비
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={barData} layout="vertical" margin={{ top: 0, right: 60, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v}만`}
            tick={{ fontSize: 14, fill: 'var(--text-faint)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 14, fill: 'var(--text-base)' }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(v) => [`${Number(v).toLocaleString()}만원`]}
            contentStyle={{ fontSize: 14, borderRadius: 8 }}
          />
          <Bar
            dataKey="월생활비"
            radius={[0, 4, 4, 0]}
            fill="#1565C0"
            barSize={22}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 순자산 추이 오버레이 */}
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-base)', padding: '16px 12px 10px', marginTop: 8 }}>
        방법별 전체 자산 변화
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={lineData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="age"
            tickFormatter={(v) => `${v}세`}
            tick={{ fontSize: 14, fill: 'var(--text-faint)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}억` : `${v}`}
            tick={{ fontSize: 14, fill: 'var(--text-faint)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(v, name) => [`${Number(v).toLocaleString()}만원`, name as string]}
            labelFormatter={(l) => `${l}세`}
            contentStyle={{ fontSize: 14, borderRadius: 8 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 14, paddingTop: 6 }} />
          {options.map((opt) => (
            <Line
              key={opt.strategy}
              type="monotone"
              dataKey={LABELS[opt.strategy]}
              stroke={COLORS[opt.strategy as keyof typeof COLORS]?.line ?? '#999'}
              strokeWidth={opt.isRecommended ? 2.5 : 1.5}
              strokeDasharray={opt.isRecommended ? undefined : '4 3'}
              dot={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
