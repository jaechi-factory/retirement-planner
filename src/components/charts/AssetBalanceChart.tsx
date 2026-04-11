/**
 * 선택 전략 기준 — 버킷별 연말 잔고 추이 차트
 * cashLike / financialInvestable / propertyValue (담보대출 차감 후)
 */
import { useState } from 'react';
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
import type { PlannerInputs } from '../../types/inputs';
import { getPensionBreakdown, getPensionMonthlyBreakdownForMonthIndex } from '../../engine/pensionEstimation';
import { fmtKRW, fmtKRWAxis } from '../../utils/format';
import {
  buildCashflowByAgeMaps,
  getAgeSnapshot,
  type CashflowByAgeMaps,
} from './assetBalanceMetrics';
import AgeInspectorPanel from './AgeInspectorPanel';

// ── 시각 계층 상수 ────────────────────────────────────────────────────────────

const SERIES = {
  property:  { key: '집 자산',               color: '#e5a04b', strokeWidth: 1.8, dash: undefined,  fillId: 'propGrad'  },
  cash:      { key: '현금·예금',              color: '#00c471', strokeWidth: 1.8, dash: undefined,  fillId: 'cashGrad'  },
  financial: { key: '주식·채권',              color: '#1b64da', strokeWidth: 2.4, dash: undefined,  fillId: 'finGrad'   },
  sale:      { key: '집을 판 뒤 굴리는 돈',   color: '#8b5cf6', strokeWidth: 1.8, dash: '5 3',      fillId: 'saleGrad'  },
} as const;

// 범례 표시 순서 (렌더 순서와 독립적)
const LEGEND_ORDER = [
  SERIES.cash,
  SERIES.financial,
  SERIES.property,
  SERIES.sale,
] as const;

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
  targetMonthly: number;
  inputs: PlannerInputs;
}

interface PensionEvent {
  name: string;
  monthly: number;
}

// 연금 개시 나이 → 이벤트 맵
function buildPensionStartMap(inputs: PlannerInputs, retirementAge: number): Map<number, PensionEvent[]> {
  const map = new Map<number, PensionEvent[]>();
  const add = (age: number, name: string, monthly: number) => {
    if (!map.has(age)) map.set(age, []);
    map.get(age)!.push({ name, monthly });
  };
  const { currentAge, annualIncome } = inputs.status;
  const inflationRate = inputs.goal.inflationRate;
  const breakdown = getPensionBreakdown(
    inputs.pension,
    currentAge,
    retirementAge,
    annualIncome,
    inflationRate,
    inputs.goal.retirementStartMonth ?? 0,
  );
  if (inputs.pension.publicPension.enabled && breakdown.publicMonthly > 0) {
    add(inputs.pension.publicPension.startAge, '국민연금', breakdown.publicMonthly);
  }
  if (inputs.pension.retirementPension.enabled && breakdown.retirementMonthly > 0) {
    add(inputs.pension.retirementPension.startAge, '퇴직연금', breakdown.retirementMonthly);
  }
  if (inputs.pension.privatePension.enabled && breakdown.privateMonthly > 0) {
    add(inputs.pension.privatePension.startAge, '개인연금', breakdown.privateMonthly);
  }
  return map;
}

function buildPensionByAgeMaps(rows: YearlyAggregateV2[], inputs: PlannerInputs, retirementAge: number) {
  const monthlyPublicPensionByAge = new Map<number, number>();
  const monthlyPublicPensionRealByAge = new Map<number, number>();
  const monthlyRetirementPensionByAge = new Map<number, number>();
  const monthlyRetirementPensionRealByAge = new Map<number, number>();
  const monthlyPrivatePensionByAge = new Map<number, number>();
  const monthlyPrivatePensionRealByAge = new Map<number, number>();
  const currentAgeMonth = inputs.status.currentAgeMonth ?? 0;
  rows.forEach((row) => {
    const totals = row.months.reduce((acc, month) => {
      const monthIndex =
        (month.ageYear - inputs.status.currentAge) * 12 + (month.ageMonthIndex - currentAgeMonth);
      const breakdown = getPensionMonthlyBreakdownForMonthIndex(
        inputs.pension,
        inputs.status.currentAge,
        monthIndex,
        inputs.goal.inflationRate,
        inputs.status.annualIncome,
        retirementAge,
        inputs.goal.retirementStartMonth ?? 0,
      );
      acc.publicNominal += breakdown.publicMonthlyNominal;
      acc.publicReal += breakdown.publicMonthlyRealTodayValue;
      acc.retirementNominal += breakdown.retirementMonthlyNominal;
      acc.retirementReal += breakdown.retirementMonthlyRealTodayValue;
      acc.privateNominal += breakdown.privateMonthlyNominal;
      acc.privateReal += breakdown.privateMonthlyRealTodayValue;
      return acc;
    }, {
      publicNominal: 0,
      publicReal: 0,
      retirementNominal: 0,
      retirementReal: 0,
      privateNominal: 0,
      privateReal: 0,
    });
    const count = Math.max(1, row.months.length);
    monthlyPublicPensionByAge.set(row.ageYear, totals.publicNominal / count);
    monthlyPublicPensionRealByAge.set(row.ageYear, totals.publicReal / count);
    monthlyRetirementPensionByAge.set(row.ageYear, totals.retirementNominal / count);
    monthlyRetirementPensionRealByAge.set(row.ageYear, totals.retirementReal / count);
    monthlyPrivatePensionByAge.set(row.ageYear, totals.privateNominal / count);
    monthlyPrivatePensionRealByAge.set(row.ageYear, totals.privateReal / count);
  });
  return {
    monthlyPublicPensionByAge,
    monthlyPublicPensionRealByAge,
    monthlyRetirementPensionByAge,
    monthlyRetirementPensionRealByAge,
    monthlyPrivatePensionByAge,
    monthlyPrivatePensionRealByAge,
  };
}

// ── Hover Tooltip ─────────────────────────────────────────────────────────────

function MinimalTooltip({
  active,
  payload,
  label,
  cashflow,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  cashflow: CashflowByAgeMaps;
}) {
  if (!active || !payload || label === undefined) return null;

  const monthlyIncome = cashflow.monthlyIncomeByAge.get(label) ?? 0;
  const monthlyOutflow = cashflow.monthlyOutflowByAge.get(label) ?? 0;
  const monthlyNet = cashflow.monthlyNetByAge.get(label) ?? 0;
  const totalAssets = payload.reduce((sum, r) => sum + Number(r.value), 0);
  const netColor = monthlyNet >= 0 ? 'var(--ux-status-positive)' : 'var(--ux-status-negative)';

  return (
    <div
      style={{
        background: 'var(--ux-surface)',
        border: '1px solid var(--ux-border-strong)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 14,
        width: 160,
        boxShadow: '0 4px 12px rgba(25, 31, 40, 0.10)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ux-text-strong)' }}>{label}세</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--ux-text-base)', marginBottom: 2 }}>
        <span>수입</span>
        <span>월 {fmtKRW(Math.round(monthlyIncome))}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--ux-text-base)', marginBottom: 2 }}>
        <span>지출</span>
        <span>월 {fmtKRW(Math.round(monthlyOutflow))}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: netColor, fontWeight: 700, marginBottom: 2 }}>
        <span>잔액</span>
        <span>{monthlyNet >= 0 ? '+' : '-'}{fmtKRW(Math.round(Math.abs(monthlyNet)))}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--ux-text-base)', paddingTop: 4, borderTop: '1px solid var(--ux-border)', marginTop: 2 }}>
        <span>총 자산</span>
        <span style={{ fontWeight: 600 }}>{fmtKRW(Math.round(totalAssets))}</span>
      </div>
    </div>
  );
}

// ── 커스텀 범례 (표시 순서 독립 제어) ─────────────────────────────────────────

function CustomLegend({ hasRealEstate, hasFinancial, hasSaleProceeds }: { hasRealEstate: boolean; hasFinancial: boolean; hasSaleProceeds: boolean }) {
  const items = LEGEND_ORDER.filter((s) => {
    if (s.key === SERIES.property.key) return hasRealEstate;
    if (s.key === SERIES.financial.key) return hasFinancial;
    if (s.key === SERIES.sale.key) return hasSaleProceeds;
    return true;
  });

  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', paddingTop: 8 }}>
      {items.map((s) => (
        <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'var(--ux-text-base)' }}>
          <span
            style={{
              display: 'inline-block',
              width: s.key === SERIES.property.key ? 16 : 12,
              height: s.key === SERIES.property.key ? 2 : 2.5,
              background: s.color,
              borderRadius: 2,
              opacity: s.key === SERIES.property.key ? 0.5 : 1,
            }}
          />
          {s.key}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AssetBalanceChart({
  rows,
  retirementAge,
  targetMonthly,
  inputs,
}: Props) {
  const [selectedAge, setSelectedAge] = useState<number>(retirementAge);

  if (rows.length === 0) return null;

  const pensionStartMap = buildPensionStartMap(inputs, retirementAge);
  const {
    monthlyPublicPensionByAge,
    monthlyPublicPensionRealByAge,
    monthlyRetirementPensionByAge,
    monthlyRetirementPensionRealByAge,
    monthlyPrivatePensionByAge,
    monthlyPrivatePensionRealByAge,
  } = buildPensionByAgeMaps(rows, inputs, retirementAge);

  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  const hasFinancial = rows.some((row) => row.financialInvestableEnd > 0);
  const hasSaleProceeds = hasRealEstate && rows.some((row) => row.propertySaleProceedsBucketEnd > 0);

  const cashflow = buildCashflowByAgeMaps(rows);

  // Y축 최대값: 전체 자산 최대값 + 5억(50000만원)
  const yMax = (() => {
    let peak = 0;
    for (const row of rows) {
      const total = row.cashLikeEnd + row.financialInvestableEnd
        + row.propertyValueEnd + row.propertySaleProceedsBucketEnd;
      if (total > peak) peak = total;
    }
    return peak + 50000;
  })();

  const data = rows.map((row) => ({
    age: row.ageYear,
    ...(hasRealEstate ? { [SERIES.property.key]: row.propertyValueEnd } : {}),
    [SERIES.cash.key]: row.cashLikeEnd,
    [SERIES.financial.key]: row.financialInvestableEnd,
    ...(hasSaleProceeds ? { [SERIES.sale.key]: row.propertySaleProceedsBucketEnd } : {}),
    shortfall: row.totalShortfall,
  }));

  const depletionRow = rows.find((row) => row.totalShortfall > 0);
  const depletionAge = depletionRow?.ageYear ?? null;
  const lastRow = rows[rows.length - 1];

  const isSaleProceedsDependent =
    depletionAge === null && hasSaleProceeds && lastRow !== undefined && lastRow.propertySaleProceedsBucketEnd > 0;
  const isSecuredLoanDependent =
    depletionAge === null && !isSaleProceedsDependent && lastRow !== undefined && lastRow.securedLoanBalanceEnd > 0;
  const isPensionDependent =
    depletionAge === null && !isSaleProceedsDependent && !isSecuredLoanDependent &&
    lastRow !== undefined && lastRow.financialInvestableEnd < 100 && lastRow.totalPension > 0;

  const handleMouseMove = (state: { activeLabel?: string | number }) => {
    if (state.activeLabel !== undefined) {
      setSelectedAge(state.activeLabel as number);
    }
  };

  const inspectorData = getAgeSnapshot({
    age: selectedAge,
    retirementAge,
    rows,
    cashflow,
    monthlyPublicPensionByAge,
    monthlyPublicPensionRealByAge,
    monthlyRetirementPensionByAge,
    monthlyRetirementPensionRealByAge,
    monthlyPrivatePensionByAge,
    monthlyPrivatePensionRealByAge,
    pensionStartMap,
  });

  return (
    <div style={{ marginBottom: 12 }}>
      {/* 상태 메시지 */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color:
            depletionAge !== null
              ? 'var(--ux-status-negative)'
              : isPensionDependent
              ? 'var(--ux-status-warning)'
              : 'var(--ux-status-positive)',
          marginBottom: 10,
        }}
      >
        {depletionAge !== null
          ? `목표 생활비(월 ${targetMonthly}만원) 기준, ${depletionAge}세에 자금이 바닥나요`
          : isSaleProceedsDependent
          ? '집을 팔아 쓴 뒤에도 기대수명까지 버틸 수 있어요'
          : isSecuredLoanDependent
          ? '집 담보대출을 활용해 기대수명까지 버틸 수 있어요'
          : isPensionDependent
          ? '연금 중심으로 기대수명까지 버틸 수 있어요'
          : '기대수명까지 금융자산을 유지해요'}
      </div>

      <ResponsiveContainer width="100%" height={228}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 10 }}
          onMouseMove={handleMouseMove}
        >
          <defs>
            {/* 집 자산: 매우 연하게 */}
            {hasRealEstate && (
              <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={SERIES.property.color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={SERIES.property.color} stopOpacity={0.03} />
              </linearGradient>
            )}
            {/* 집을 판 뒤 굴리는 돈: 주황 */}
            {hasSaleProceeds && (
              <linearGradient id="saleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={SERIES.sale.color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={SERIES.sale.color} stopOpacity={0.02} />
              </linearGradient>
            )}
            {/* 현금·예금: 초록 */}
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={SERIES.cash.color} stopOpacity={0.16} />
              <stop offset="95%" stopColor={SERIES.cash.color} stopOpacity={0.02} />
            </linearGradient>
            {/* 주식·채권: 파랑 */}
            {hasFinancial && (
              <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={SERIES.financial.color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={SERIES.financial.color} stopOpacity={0.02} />
              </linearGradient>
            )}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="age"
            tickFormatter={(value) => `${value}세`}
            tick={{ fontSize: 14, fill: 'var(--ux-text-subtle)' }}
            tickLine={false}
            axisLine={false}
            ticks={(() => {
              if (rows.length === 0) return [];
              const first = rows[0].ageYear;
              const last = rows[rows.length - 1].ageYear;
              const result: number[] = [];
              const firstTick = Math.ceil(first / 10) * 10;
              for (let t = firstTick; t <= last; t += 10) {
                result.push(t);
              }
              if (result.length === 0 || result[result.length - 1] !== last) result.push(last);
              return result;
            })()}
          />
          <YAxis
            tickFormatter={fmtKRWAxis}
            tick={{ fontSize: 14, fill: 'var(--ux-text-subtle)' }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[0, yMax]}
          />

          <Tooltip
            wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
            allowEscapeViewBox={{ x: false, y: true }}
            offset={14}
            content={(props) => (
              <MinimalTooltip
                active={props.active}
                payload={props.payload as unknown as Array<{ name: string; value: number; color: string }> | undefined}
                label={props.label as number | undefined}
                cashflow={cashflow}
              />
            )}
          />
          <Legend
            content={() => (
              <CustomLegend hasRealEstate={hasRealEstate} hasFinancial={hasFinancial} hasSaleProceeds={hasSaleProceeds} />
            )}
          />

          {/* 집 자산: 점선 라인만 (유동자산과 겹치지 않게) */}
          {hasRealEstate && (
            <Area
              type="monotone"
              dataKey={SERIES.property.key}
              stroke={SERIES.property.color}
              strokeWidth={SERIES.property.strokeWidth}
              strokeDasharray="6 4"
              fill="none"
            />
          )}
          {/* 유동자산 스택: 현금·예금 → 주식·채권 → 매각대금 */}
          <Area
            type="monotone"
            dataKey={SERIES.cash.key}
            stackId="assets"
            stroke={SERIES.cash.color}
            strokeWidth={SERIES.cash.strokeWidth}
            fill={`url(#${SERIES.cash.fillId})`}
          />
          {hasFinancial && (
            <Area
              type="monotone"
              dataKey={SERIES.financial.key}
              stackId="assets"
              stroke={SERIES.financial.color}
              strokeWidth={SERIES.financial.strokeWidth}
              fill={`url(#${SERIES.financial.fillId})`}
            />
          )}
          {/* 매각대금: 별도 영역 (스택 미포함 — 매각 전에는 0이므로 겹침 방지) */}
          {hasSaleProceeds && (
            <Area
              type="monotone"
              dataKey={SERIES.sale.key}
              stroke={SERIES.sale.color}
              strokeWidth={SERIES.sale.strokeWidth}
              strokeDasharray={SERIES.sale.dash}
              fill="none"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>


      {inspectorData && (
        <AgeInspectorPanel
          data={inspectorData}
          hasRealEstate={hasRealEstate}
          hasSaleProceeds={hasSaleProceeds}
        />
      )}
    </div>
  );
}
