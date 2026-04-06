/**
 * 차트 B — 집 자산 변화 (집 가치 / 집 활용 누적액 / 순주택가치)
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

/** 집 활용 누적액 데이터 키 — 기존 주담대 잔액이 아니라 역모기지 draw 누적액 */
const LOAN_KEY = '집 담보대출로 꺼내 쓴 돈';

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
}

export default function PropertyAssetChart({ rows, retirementAge }: Props) {
  if (rows.length === 0) return null;

  const hasLoan = rows.some((r) => r.securedLoanBalanceEnd > 0);
  const interventionAge = rows.find((r) => r.eventSummary.includes('집 활용 시작'))?.ageYear ?? null;
  const lastRow = rows[rows.length - 1];
  const totalDraw = Math.max(0, Math.round(lastRow?.securedLoanBalanceEnd ?? 0));
  const finalNetHomeValue = Math.max(0, Math.round((lastRow?.propertyValueEnd ?? 0) - (lastRow?.securedLoanBalanceEnd ?? 0)));

  // 툴팁 순서: 집 가치(기준) → 집 활용 누적액(차감) → 순주택가치(결과)
  const data = rows.map((r) => {
    const netProperty = Math.max(0, r.propertyValueEnd - r.securedLoanBalanceEnd);
    const point: Record<string, number> = { age: r.ageYear, '집 가치': r.propertyValueEnd };
    if (hasLoan) point[LOAN_KEY] = r.securedLoanBalanceEnd;
    point['순주택가치'] = netProperty;
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
      {/* 제목 + 보조 설명 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tds-gray-400)' }}>
            집을 어떻게 써야 하는지
          </div>
          <span style={{ fontSize: 14, color: 'var(--tds-gray-300)' }}>· 참고용</span>
        </div>
        <div style={{ display: 'grid', gap: 2, marginTop: 4 }}>
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)' }}>
            언제부터 집이 필요해지는지: {interventionAge !== null ? `${interventionAge}세부터` : '해당 없음'}
          </div>
          {hasLoan && (
            <div style={{ fontSize: 14, color: 'var(--tds-gray-400)' }}>
              집 담보대출로 꺼내 쓴 돈: {fmtKRW(totalDraw)}
            </div>
          )}
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)' }}>
            마지막에 남는 집값(대출 반영 후): {fmtKRW(finalNetHomeValue)}
          </div>
        </div>
        {/* 집 활용 누적액이 있을 때만 설명 표시 */}
        {hasLoan && (
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)', marginTop: 4, lineHeight: 1.6 }}>
            집 담보대출로 꺼내 쓴 돈은 생활비에 쓴 누적 금액이에요. 기존 주담대와는 별개예요.
            집 가치에서 빼면 실제 내 몫(순주택가치)을 볼 수 있어요.
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={175}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tds-gray-100)" />
          <XAxis
            dataKey="age"
            tickFormatter={(v) => `${v}세`}
            tick={{ fontSize: 14, fill: 'var(--tds-gray-400)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtKRWAxis}
            tick={{ fontSize: 14, fill: 'var(--tds-gray-400)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {/* 툴팁: 순주택가치에 "(실제 내 몫)" 보조 표시 */}
          <Tooltip
            formatter={(value, name) => {
              const label = name === '순주택가치' ? '순주택가치 (실제 내 몫)' : String(name);
              return [fmtKRW(Number(value)), label];
            }}
            labelFormatter={(label) => `${label}세`}
            contentStyle={{ fontSize: 14, borderRadius: 8, border: '1px solid var(--tds-gray-100)' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 14, paddingTop: 8 }} />

          {/* ① 집 가치 — 기준선: 집의 시장 가치 */}
          <Line
            type="monotone"
            dataKey="집 가치"
            stroke="#78909C"
            strokeWidth={1.5}
            dot={false}
          />
          {/* ② 집 활용 누적액 — 차감 보조선: 생활비로 조달한 누적액 (점선, 적색) */}
          {hasLoan && (
            <Line
              type="monotone"
              dataKey={LOAN_KEY}
              stroke="#E53935"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          )}
          {/* ③ 순주택가치 — 결과 강조선: 집 가치 − 집 활용 누적액 */}
          <Line
            type="monotone"
            dataKey="순주택가치"
            stroke="#1565C0"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {retirementAge > 0 && (
        <div style={{ fontSize: 14, color: 'var(--tds-gray-300)', textAlign: 'right', marginTop: 4 }}>
          은퇴 {retirementAge}세
        </div>
      )}
    </div>
  );
}
