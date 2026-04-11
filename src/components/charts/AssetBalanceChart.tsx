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

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
  targetMonthly: number;
  strategyLabel: string;
  sustainableMonthly: number;
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

// ── Hover Tooltip (요약 5줄) ──────────────────────────────────────────────────

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
        fontSize: 13,
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function AssetBalanceChart({
  rows,
  retirementAge,
  targetMonthly,
  strategyLabel,
  sustainableMonthly,
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
  } =
    buildPensionByAgeMaps(rows, inputs, retirementAge);

  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  const hasSaleProceeds = hasRealEstate && rows.some((row) => row.propertySaleProceedsBucketEnd > 0);

  const cashflow = buildCashflowByAgeMaps(rows);

  const data = rows.map((row) => ({
    age: row.ageYear,
    ...(hasRealEstate ? { '집 자산': row.propertyValueEnd } : {}),
    '현금·예금': row.cashLikeEnd,
    '주식·채권': row.financialInvestableEnd,
    ...(hasSaleProceeds ? { '매각대금 운용': row.propertySaleProceedsBucketEnd } : {}),
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
      <div
        style={{
          fontSize: 13,
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
          ? `${depletionAge}세부터 생활비가 부족해요`
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
            {hasRealEstate && (
              <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--ux-text-subtle)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--ux-text-subtle)" stopOpacity={0.02} />
              </linearGradient>
            )}
            {hasSaleProceeds && (
              <linearGradient id="saleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--ux-status-positive)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--ux-status-positive)" stopOpacity={0.02} />
              </linearGradient>
            )}
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--ux-accent)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--ux-accent)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--ux-text-base)" stopOpacity={0.16} />
              <stop offset="95%" stopColor="var(--ux-text-base)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--ux-border)" />
          <XAxis
            dataKey="age"
            tickFormatter={(value) => `${value}세`}
            tick={{ fontSize: 14, fill: 'var(--ux-text-subtle)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtKRWAxis}
            tick={{ fontSize: 14, fill: 'var(--ux-text-subtle)' }}
            tickLine={false}
            axisLine={false}
            width={44}
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
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 14, paddingTop: 8 }} />

          {hasRealEstate && (
            <Area type="monotone" dataKey="집 자산" stroke="var(--ux-text-subtle)" strokeWidth={1.4} fill="url(#propGrad)" />
          )}
          {hasSaleProceeds && (
            <Area
              type="monotone"
              dataKey="매각대금 운용"
              stroke="var(--ux-status-positive)"
              strokeWidth={1.6}
              fill="url(#saleGrad)"
              strokeDasharray="5 3"
            />
          )}
          <Area type="monotone" dataKey="현금·예금" stroke="var(--ux-accent)" strokeWidth={1.6} fill="url(#cashGrad)" />
          <Area type="monotone" dataKey="주식·채권" stroke="var(--ux-text-base)" strokeWidth={1.6} fill="url(#finGrad)" />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ fontSize: 12, color: 'var(--ux-text-subtle)', marginTop: 6, lineHeight: 1.8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {hasRealEstate && <span>선택 전략: {strategyLabel}</span>}
        <span>목표 생활비: {targetMonthly}만원</span>
        <span>실제 가능 생활비: {Math.round(sustainableMonthly)}만원</span>
      </div>

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
