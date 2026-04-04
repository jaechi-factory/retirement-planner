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
import { fmtKRW, fmtKRWAxis } from '../../utils/format';

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
  targetMonthly: number;
  strategyLabel: string;
}

export default function AssetBalanceChart({ rows, retirementAge, targetMonthly, strategyLabel }: Props) {
  if (rows.length === 0) return null;

  const data = rows.map((r) => ({
    age: r.ageYear,
    '현금·예금': r.cashLikeEnd,
    '주식·채권': r.financialInvestableEnd,
    shortfall: r.totalShortfall,
  }));

  // 소진 나이 계산
  const depletionRow = rows.find((r) => r.totalShortfall > 0);
  const depletionAge = depletionRow?.ageYear ?? null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 결론 1줄 — 차트 위 */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: depletionAge !== null ? '#C0392B' : '#1B7F3A',
          marginBottom: 12,
        }}
      >
        {depletionAge !== null
          ? `${depletionAge}세에 금융자산이 소진돼요`
          : '기대수명까지 금융자산을 유지해요'}
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196F3" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2196F3" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4527A0" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#4527A0" stopOpacity={0.02} />
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
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          <Area type="monotone" dataKey="현금·예금" stroke="#2196F3" strokeWidth={1.5} fill="url(#cashGrad)" />
          <Area type="monotone" dataKey="주식·채권" stroke="#4527A0" strokeWidth={1.5} fill="url(#finGrad)" />
        </AreaChart>
      </ResponsiveContainer>

      {/* 메타 1줄 — 차트 아래 */}
      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 8 }}>
        전략: {strategyLabel} / 월 {targetMonthly}만원 기준
        {retirementAge > 0 && ` / 은퇴: ${retirementAge}세`}
      </div>
    </div>
  );
}
