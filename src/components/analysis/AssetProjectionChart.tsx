import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { YearlySnapshot } from '../../types/calculation';
import { fmtKRW } from '../../utils/format';

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
  return `${v >= 0 ? '+' : ''}${fmtKRW(Math.abs(v))}`;
}
function fmt억(v: number) {
  return fmtKRW(v);
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
      minWidth: 200,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--tds-gray-800)', marginBottom: 6, fontSize: 13 }}>
        {label}세 자산 현황
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#3B82F6' }}>금융자산</span>
          <span style={{ fontWeight: 600, color: s.financialAssetEnd >= 0 ? '#3B82F6' : '#EF4444' }}>
            {fmt억(s.financialAssetEnd)}
          </span>
        </div>
        {s.housingAssetEnd > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#F97316' }}>부동산</span>
            <span style={{ fontWeight: 600, color: '#F97316' }}>{fmt억(s.housingAssetEnd)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--tds-gray-500)' }}>순자산</span>
          <span style={{ fontWeight: 700, color: s.netAssetEnd >= 0 ? 'var(--tds-gray-800)' : '#EF4444' }}>
            {fmt억(s.netAssetEnd)}
          </span>
        </div>
      </div>

      {!isStart && (
        <>
          <div style={{ height: 1, background: 'var(--tds-gray-100)', marginBottom: 6 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TooltipRow label="투자수익" value={s.annualInvestmentReturn} color="#3B82F6" />
            {s.annualIncomeThisYear > 0 && (
              <TooltipRow label="근로소득" value={s.annualIncomeThisYear} color="#10B981" />
            )}
            {s.annualPensionIncomeThisYear > 0 && (
              <TooltipRow label="연금수입" value={s.annualPensionIncomeThisYear} color="#8B5CF6" />
            )}
            {s.housingAnnuityIncomeThisYear && s.housingAnnuityIncomeThisYear > 0 && (
              <TooltipRow label="주택연금" value={s.housingAnnuityIncomeThisYear} color="#F97316" />
            )}
            {s.annualExpenseThisYear > 0 && (
              <TooltipRow label="생활비" value={-s.annualExpenseThisYear} color="#6B7280" />
            )}
            {s.postSaleHousingCostThisYear && s.postSaleHousingCostThisYear > 0 && (
              <TooltipRow label="임대비용" value={-s.postSaleHousingCostThisYear} color="#EF4444" />
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

function EventBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'var(--tds-gray-50)', borderRadius: 6,
      padding: '3px 8px', fontSize: 12,
    }}>
      <span style={{ fontWeight: 700, color }}>{label}</span>
      <span style={{ color: 'var(--tds-gray-600)' }}>{value}</span>
    </div>
  );
}

export default function AssetProjectionChart({
  snapshots,
  retirementAge,
  pensionStartAges = {},
}: Props) {
  const [showNet, setShowNet] = useState(false);

  if (snapshots.length === 0) return null;

  const data = snapshots.map((s) => ({
    age: s.age,
    financial: s.financialAssetEnd / 10000,
    net: s.netAssetEnd / 10000,
    snapshot: s,
  }));

  const financialValues = data.map(d => d.financial);
  const netValues = data.map(d => d.net);
  const allValues = showNet ? [...financialValues, ...netValues] : financialValues;

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues, 0.1);
  const yMin = minVal < 0 ? Math.floor(minVal * 1.2) : 0;
  const yMax = Math.ceil(maxVal * 1.12);

  const financialDepletionAge = data.find(d => d.financial < 0)?.age ?? null;
  const netDepletionAge = data.find(d => d.net < 0)?.age ?? null;

  const pensionEvents = [
    pensionStartAges.retirement != null && { age: pensionStartAges.retirement, label: '퇴직연금', color: '#22C55E' },
    pensionStartAges.nps != null && { age: pensionStartAges.nps, label: '국민연금', color: '#A855F7' },
    pensionStartAges.private != null && { age: pensionStartAges.private, label: '개인연금', color: '#F97316' },
  ].filter(Boolean) as { age: number; label: string; color: string }[];

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        {/* 헤더 + 토글 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)' }}>금융자산 추이</span>
              <span style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>목표 생활비 기준</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 3, lineHeight: 1.5 }}>
              소득·연금·생활비·대출 반영 후 남는 금융자산 잔고예요
            </div>
          </div>
          {/* 순자산 토글 */}
          <button
            onClick={() => setShowNet(v => !v)}
            style={{
              flexShrink: 0,
              marginLeft: 8,
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${showNet ? 'var(--tds-gray-400)' : 'var(--tds-gray-200)'}`,
              background: showNet ? 'var(--tds-gray-100)' : 'transparent',
              fontSize: 11,
              fontWeight: 600,
              color: showNet ? 'var(--tds-gray-700)' : 'var(--tds-gray-400)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            순자산 {showNet ? '숨기기' : '함께 보기'}
          </button>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 14, height: 2, background: '#3B82F6', borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--tds-gray-500)' }}>금융자산</span>
          </div>
          {showNet && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 14, height: 2, background: '#9CA3AF', borderRadius: 1, borderTop: '1px dashed #9CA3AF' }} />
              <span style={{ fontSize: 11, color: 'var(--tds-gray-500)' }}>순자산 (부동산 포함)</span>
            </div>
          )}
          {financialDepletionAge !== null && (
            <EventBadge label="현금·투자자산 부족" value={`${financialDepletionAge}세`} color="var(--tds-orange-500)" />
          )}
          {netDepletionAge !== null && (
            <EventBadge label="전체 소진" value={`${netDepletionAge}세`} color="var(--tds-red-500)" />
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tds-gray-100)" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 12, fill: 'var(--tds-gray-500)' }}
            tickLine={false}
            axisLine={false}
            label={{ value: '나이', position: 'insideBottomRight', offset: -4, fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--tds-gray-500)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}억`}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip />} />

          {(yMin < 0 || financialDepletionAge !== null) && (
            <ReferenceLine y={0} stroke="#FF8080" strokeWidth={1.5} />
          )}

          <ReferenceLine
            x={retirementAge}
            stroke="var(--tds-blue-400)"
            strokeDasharray="4 3"
            label={{ value: '은퇴', position: 'top', fontSize: 11, fill: 'var(--tds-blue-500)' }}
          />

          {pensionEvents.map((ev) => (
            <ReferenceLine
              key={`${ev.age}-${ev.label}`}
              x={ev.age}
              stroke={ev.color}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{ value: ev.label, position: 'top', fontSize: 10, fill: ev.color }}
            />
          ))}

          {netDepletionAge !== null && (
            <ReferenceLine
              x={netDepletionAge}
              stroke="#EF4444"
              strokeWidth={2}
              label={{ value: '소진', position: 'top', fontSize: 11, fill: '#EF4444' }}
            />
          )}

          {/* 금융자산 선 (파란색) */}
          <Line
            type="linear"
            dataKey="financial"
            name="금융자산"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* 순자산 선 (회색 점선, 토글 시에만) */}
          {showNet && (
            <Line
              type="linear"
              dataKey="net"
              name="순자산"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {(yMin < 0 || financialDepletionAge !== null) && (
        <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4, textAlign: 'right' }}>
          ⚠ 파란 선이 0 아래: 금융자산이 부족한 시기예요
        </div>
      )}
    </div>
  );
}
