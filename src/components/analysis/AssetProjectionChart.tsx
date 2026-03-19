import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { YearlySnapshot } from '../../types/calculation';


interface PensionStartAges {
  nps?: number;
  retirement?: number;
  private?: number;
}

interface Props {
  snapshots: YearlySnapshot[];
  retirementAge: number;
  pensionStartAges?: PensionStartAges;

}

function fmt만(v: number) {
  return `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ko-KR')}만원`;
}
function fmt억(v: number) {
  return `${(v / 10000).toFixed(1)}억원`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const s: YearlySnapshot = payload[0]?.payload?.snapshot;
  if (!s || s.age === 0) return null;

  const isStart = s.annualNetCashflow === 0 && s.annualInvestmentReturn === 0;

  return (
    <div style={{
      background: 'white',
      borderRadius: 10,
      boxShadow: '0 2px 16px rgba(0,0,0,0.13)',
      padding: '12px 14px',
      fontSize: 12,
      minWidth: 190,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--tds-gray-800)', marginBottom: 8, fontSize: 13 }}>
        {label}세 순자산
        <span style={{ fontWeight: 800, color: 'var(--tds-blue-500)', marginLeft: 6 }}>
          {fmt억(s.netAssetEnd)}
        </span>
      </div>

      {!isStart && (
        <>
          <div style={{ height: 1, background: 'var(--tds-gray-100)', marginBottom: 6 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <TooltipRow label="투자수익" value={s.annualInvestmentReturn} color="#3B82F6" />
            {s.annualIncomeThisYear > 0 && (
              <TooltipRow label="근로소득" value={s.annualIncomeThisYear} color="#10B981" />
            )}
            {s.annualPensionIncomeThisYear > 0 && (
              <TooltipRow label="연금수입" value={s.annualPensionIncomeThisYear} color="#8B5CF6" />
            )}
            {s.annualExpenseThisYear > 0 && (
              <TooltipRow label="생활비" value={-s.annualExpenseThisYear} color="#6B7280" />
            )}
            {s.annualDebtRepaymentThisYear > 0 && (
              <TooltipRow label="부채상환" value={-s.annualDebtRepaymentThisYear} color="#EF4444" />
            )}
            {s.annualChildExpenseThisYear > 0 && (
              <TooltipRow label="자녀지출" value={-s.annualChildExpenseThisYear} color="#F97316" />
            )}
            <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '2px 0' }} />
            <TooltipRow
              label="순현금흐름"
              value={s.annualNetCashflow}
              color={s.annualNetCashflow >= 0 ? '#10B981' : '#EF4444'}
              bold
            />
          </div>
        </>
      )}
    </div>
  );
}

function TooltipRow({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--tds-gray-500)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color }}>{fmt만(value)}</span>
    </div>
  );
}

export default function AssetProjectionChart({
  snapshots,
  retirementAge,
  pensionStartAges = {},
}: Props) {

  if (snapshots.length === 0) return null;

  const data = snapshots.map((s) => ({
    age: s.age,
    gross: s.grossAssetEnd / 10000,
    net: s.netAssetEnd / 10000,
    debt: s.remainingDebtEnd / 10000,
    snapshot: s,
  }));

  const peakIdx = data.reduce((maxI, d, i) => d.net > data[maxI].net ? i : maxI, 0);
  const peakAge = data[peakIdx].age;
  const peakValue = data[peakIdx].net;

  const declineStartAge = (() => {
    for (let i = peakIdx + 1; i < data.length; i++) {
      if (data[i].net < data[i - 1].net) return data[i].age;
    }
    return null;
  })();

  const depletionAge = data.find((d) => d.net <= 0)?.age ?? null;

  const fieldKey = 'net';
  const values = data.map((d) => d[fieldKey]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values, 0.1);
  const yMin = minVal < 0 ? Math.floor(minVal * 1.15) : 0;
  const yMax = Math.ceil(maxVal * 1.12);

  const lineColor = 'var(--tds-blue-500)';

  const pensionEvents = [
    pensionStartAges.retirement != null && { age: pensionStartAges.retirement, label: '퇴직연금', color: '#22C55E' },
    pensionStartAges.nps != null && { age: pensionStartAges.nps, label: '국민연금', color: '#A855F7' },
    pensionStartAges.private != null && { age: pensionStartAges.private, label: '개인연금', color: '#F97316' },
  ].filter(Boolean) as { age: number; label: string; color: string }[];


  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)' }}>나이별 자산 추이</span>
          <span style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>목표 생활비 기준</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 8, lineHeight: 1.5 }}>
          소득·연금·생활비·대출을 반영한 뒤 남는 자산 잔고예요
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <EventBadge label="자산 최고점" value={`${peakAge}세 · ${peakValue.toFixed(1)}억원`} color="var(--tds-blue-500)" />
          {declineStartAge !== null && (
            <EventBadge label="감소 시작" value={`${declineStartAge}세~`} color="var(--tds-orange-500)" />
          )}
          {depletionAge !== null && (
            <EventBadge label="자산 소진" value={`${depletionAge}세`} color="var(--tds-red-500)" />
          )}
        </div>

      </div>

      <ResponsiveContainer width="100%" height={200}>
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
            tickFormatter={(v) => `${v.toFixed(0)}억`}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip />} />

          {yMin < 0 && <ReferenceLine y={0} stroke="#FF8080" strokeWidth={1.5} />}

          <ReferenceLine
            x={retirementAge}
            stroke="var(--tds-blue-400)"
            strokeDasharray="4 3"
            label={{ value: '은퇴', position: 'top', fontSize: 10, fill: 'var(--tds-blue-500)' }}
          />

          {pensionEvents.map((ev) => (
            <ReferenceLine
              key={`${ev.age}-${ev.label}`}
              x={ev.age}
              stroke={ev.color}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{ value: ev.label, position: 'top', fontSize: 9, fill: ev.color }}
            />
          ))}

          {depletionAge !== null && (
            <ReferenceLine
              x={depletionAge}
              stroke="#EF4444"
              strokeWidth={2}
              label={{ value: '소진', position: 'top', fontSize: 10, fill: '#EF4444' }}
            />
          )}

          <Line
            type="linear"
            dataKey={fieldKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {yMin < 0 && (
        <div style={{ fontSize: 10, color: '#EF4444', marginTop: 4, textAlign: 'right' }}>
          ⚠ 0 아래 구간: 자산이 부족한 시기예요
        </div>
      )}
    </div>
  );
}

function EventBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'var(--tds-gray-50)', borderRadius: 6,
      padding: '3px 8px', fontSize: 11,
    }}>
      <span style={{ fontWeight: 700, color }}>{label}</span>
      <span style={{ color: 'var(--tds-gray-600)' }}>{value}</span>
    </div>
  );
}
