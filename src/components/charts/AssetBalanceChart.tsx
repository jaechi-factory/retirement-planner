/**
 * 선택 전략 기준 — 버킷별 연말 잔고 추이 차트
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
import type { PlannerInputs } from '../../types/inputs';
import { getPensionBreakdown, getPensionMonthlyBreakdownForAge } from '../../engine/pensionEstimation';
import { fmtKRW, fmtKRWAxis } from '../../utils/format';
import { buildCashflowByAgeMaps } from './assetBalanceMetrics';

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
  targetMonthly: number;
  strategyLabel: string;
  inputs: PlannerInputs;
}

interface PensionEvent {
  name: string;
  monthly: number;
}

interface PensionSourceByAgeMaps {
  monthlyPublicPensionByAge: Map<number, number>;
  monthlyRetirementPensionByAge: Map<number, number>;
  monthlyPrivatePensionByAge: Map<number, number>;
}

// 연금 개시 나이 → 이벤트 맵 (getPensionBreakdown 사용으로 auto 모드 포함 정확한 금액)
function buildPensionStartMap(inputs: PlannerInputs, retirementAge: number): Map<number, PensionEvent[]> {
  const map = new Map<number, PensionEvent[]>();

  const add = (age: number, name: string, monthly: number) => {
    if (!map.has(age)) map.set(age, []);
    map.get(age)!.push({ name, monthly });
  };

  const { currentAge, annualIncome } = inputs.status;
  const inflationRate = inputs.goal.inflationRate;
  const breakdown = getPensionBreakdown(inputs.pension, currentAge, retirementAge, annualIncome, inflationRate);

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

function buildPensionSourceByAgeMaps(
  rows: YearlyAggregateV2[],
  inputs: PlannerInputs,
  retirementAge: number,
): PensionSourceByAgeMaps {
  const monthlyPublicPensionByAge = new Map<number, number>();
  const monthlyRetirementPensionByAge = new Map<number, number>();
  const monthlyPrivatePensionByAge = new Map<number, number>();

  rows.forEach((row) => {
    const breakdown = getPensionMonthlyBreakdownForAge(
      inputs.pension,
      inputs.status.currentAge,
      row.ageYear,
      inputs.goal.inflationRate,
      inputs.status.annualIncome,
      retirementAge,
    );
    monthlyPublicPensionByAge.set(row.ageYear, breakdown.publicMonthly);
    monthlyRetirementPensionByAge.set(row.ageYear, breakdown.retirementMonthly);
    monthlyPrivatePensionByAge.set(row.ageYear, breakdown.privateMonthly);
  });

  return {
    monthlyPublicPensionByAge,
    monthlyRetirementPensionByAge,
    monthlyPrivatePensionByAge,
  };
}

// 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
  label,
  pensionStartMap,
  retirementAge,
  monthlySalaryByAge,
  monthlyPensionByAge,
  monthlyPublicPensionByAge,
  monthlyRetirementPensionByAge,
  monthlyPrivatePensionByAge,
  monthlyLivingExpenseByAge,
  monthlyRentByAge,
  monthlyDebtServiceByAge,
  monthlyChildExpenseByAge,
  monthlyIncomeByAge,
  monthlyOutflowByAge,
  monthlyNetByAge,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  pensionStartMap: Map<number, PensionEvent[]>;
  retirementAge: number;
  monthlySalaryByAge: Map<number, number>;
  monthlyPensionByAge: Map<number, number>;
  monthlyPublicPensionByAge: Map<number, number>;
  monthlyRetirementPensionByAge: Map<number, number>;
  monthlyPrivatePensionByAge: Map<number, number>;
  monthlyLivingExpenseByAge: Map<number, number>;
  monthlyRentByAge: Map<number, number>;
  monthlyDebtServiceByAge: Map<number, number>;
  monthlyChildExpenseByAge: Map<number, number>;
  monthlyIncomeByAge: Map<number, number>;
  monthlyOutflowByAge: Map<number, number>;
  monthlyNetByAge: Map<number, number>;
}) {
  if (!active || !payload || label === undefined) return null;

  const pensions = pensionStartMap.get(label) ?? [];
  const isRetirementYear = label === retirementAge;
  const monthlySalary = monthlySalaryByAge.get(label) ?? 0;
  const monthlyPension = monthlyPensionByAge.get(label) ?? 0;
  const monthlyPublicPension = monthlyPublicPensionByAge.get(label) ?? 0;
  const monthlyRetirementPension = monthlyRetirementPensionByAge.get(label) ?? 0;
  const monthlyPrivatePension = monthlyPrivatePensionByAge.get(label) ?? 0;
  const monthlyLivingExpense = monthlyLivingExpenseByAge.get(label) ?? 0;
  const monthlyRent = monthlyRentByAge.get(label) ?? 0;
  const monthlyDebtService = monthlyDebtServiceByAge.get(label) ?? 0;
  const monthlyChildExpense = monthlyChildExpenseByAge.get(label) ?? 0;
  const monthlyIncome = monthlyIncomeByAge.get(label) ?? 0;
  const monthlyOutflow = monthlyOutflowByAge.get(label) ?? 0;
  const monthlyNet = monthlyNetByAge.get(label) ?? (monthlyIncome - monthlyOutflow);
  const assetRows = payload;
  const totalAssets = assetRows.reduce((sum, row) => sum + Number(row.value), 0);

  return (
    <div
      style={{
        background: 'var(--ux-surface)',
        border: '1px solid var(--ux-border-strong)',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 14,
        width: 'min(220px, calc(100vw - 32px))',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'min(62vh, 420px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        boxShadow: '0 10px 24px rgba(25, 31, 40, 0.12)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--ux-text-strong)' }}>
        {label}세
        {isRetirementYear && (
          <span style={{ marginLeft: 6, fontSize: 14, color: 'var(--ux-text-subtle)', fontWeight: 500 }}>
            은퇴
          </span>
        )}
      </div>

      <div
        style={{
          marginBottom: 6,
          paddingBottom: 8,
          borderBottom: '1px solid var(--ux-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--ux-text-base)', marginBottom: 2 }}>
          <span>수입 합계</span>
          <span style={{ fontWeight: 700 }}>월 {fmtKRW(Math.round(monthlyIncome))}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--ux-text-base)', marginBottom: 2 }}>
          <span>지출 합계</span>
          <span style={{ fontWeight: 700 }}>월 {fmtKRW(Math.round(monthlyOutflow))}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            color: monthlyNet >= 0 ? 'var(--ux-status-positive)' : 'var(--ux-status-negative)',
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          <span>월 잔액</span>
          <span>{monthlyNet >= 0 ? '+' : '-'}{fmtKRW(Math.round(Math.abs(monthlyNet)))}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--ux-text-base)' }}>
          <span>총 자산</span>
          <span style={{ fontWeight: 700 }}>{fmtKRW(Math.round(totalAssets))}</span>
        </div>
      </div>

      <div style={{ marginTop: 10, borderTop: '1px solid var(--ux-border)', paddingTop: 10 }}>
        <div style={{ fontSize: 14, color: 'var(--ux-text-subtle)', marginBottom: 5 }}>수입 내역</div>
        <TooltipRow label="근로소득" value={monthlySalary} />
        <TooltipRow label="연금소득(합계)" value={monthlyPension} />
        {monthlyPublicPension > 0 && <TooltipRow label="국민연금" value={monthlyPublicPension} subtle />}
        {monthlyRetirementPension > 0 && <TooltipRow label="퇴직연금" value={monthlyRetirementPension} subtle />}
        {monthlyPrivatePension > 0 && <TooltipRow label="개인연금" value={monthlyPrivatePension} subtle />}

        <div style={{ fontSize: 14, color: 'var(--ux-text-subtle)', margin: '10px 0 5px' }}>지출 내역</div>
        <TooltipRow label="생활비" value={monthlyLivingExpense} />
        <TooltipRow label="주거비(월세)" value={monthlyRent} />
        <TooltipRow label="부채상환" value={monthlyDebtService} />
        <TooltipRow label="자녀비" value={monthlyChildExpense} />

        <div style={{ fontSize: 14, color: 'var(--ux-text-subtle)', margin: '10px 0 5px' }}>자산 내역</div>
        {assetRows.map((row) => (
          <div
            key={row.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              color: 'var(--ux-text-base)',
              marginBottom: 2,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.color, display: 'inline-block' }} />
              {row.name === '매각대금 운용' ? '매각대금 운용 (연 4%)' : row.name}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--ux-text-strong)' }}>{fmtKRW(Number(row.value))}</span>
          </div>
        ))}
      </div>

      {pensions.length > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--ux-border)',
          }}
        >
          {pensions.map((pension, i) => (
            <div key={i} style={{ color: 'var(--ux-status-positive)', fontWeight: 600, marginBottom: 2 }}>
              + {pension.name} 월 {fmtKRW(pension.monthly)} 수령 시작
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TooltipRow({ label, value, subtle = false }: { label: string; value: number; subtle?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        color: subtle ? 'var(--ux-text-muted)' : 'var(--ux-text-base)',
        marginBottom: 3,
        lineHeight: 1.45,
        paddingLeft: subtle ? 10 : 0,
      }}
    >
      <span>{label}</span>
      <span>월 {fmtKRW(Math.round(value))}</span>
    </div>
  );
}

export default function AssetBalanceChart({
  rows,
  retirementAge,
  targetMonthly,
  strategyLabel,
  inputs,
}: Props) {
  if (rows.length === 0) return null;

  const pensionStartMap = buildPensionStartMap(inputs, retirementAge);
  const {
    monthlyPublicPensionByAge,
    monthlyRetirementPensionByAge,
    monthlyPrivatePensionByAge,
  } = buildPensionSourceByAgeMaps(rows, inputs, retirementAge);

  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  const hasSaleProceeds = hasRealEstate && rows.some((row) => row.propertySaleProceedsBucketEnd > 0);

  const {
    monthlySalaryByAge,
    monthlyPensionByAge,
    monthlyLivingExpenseByAge,
    monthlyRentByAge,
    monthlyDebtServiceByAge,
    monthlyChildExpenseByAge,
    monthlyIncomeByAge,
    monthlyOutflowByAge,
    monthlyNetByAge,
  } = buildCashflowByAgeMaps(rows);

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
    depletionAge === null &&
    hasSaleProceeds &&
    lastRow !== undefined &&
    lastRow.propertySaleProceedsBucketEnd > 0;

  const isSecuredLoanDependent =
    depletionAge === null &&
    !isSaleProceedsDependent &&
    lastRow !== undefined &&
    lastRow.securedLoanBalanceEnd > 0;

  const isPensionDependent =
    depletionAge === null &&
    !isSaleProceedsDependent &&
    !isSecuredLoanDependent &&
    lastRow !== undefined &&
    lastRow.financialInvestableEnd < 100 &&
    lastRow.totalPension > 0;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
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
          ? `${depletionAge}세에 금융자산이 거의 다 떨어져요`
          : isSaleProceedsDependent
          ? '집 매각 후 운용자금까지 쓰면 기대수명까지 버틸 수 있어요'
          : isSecuredLoanDependent
          ? '집 담보대출까지 쓰면 기대수명까지 버틸 수 있어요'
          : isPensionDependent
          ? '연금 중심으로 기대수명까지 버틸 수 있어요'
          : '기대수명까지 금융자산을 유지해요'}
      </div>

      <ResponsiveContainer width="100%" height={228}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 10 }}>
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
            wrapperStyle={{ zIndex: 90, pointerEvents: 'none' }}
            // 기본은 커서 기준 좌상단(2사분면), 필요 시 차트 밖으로도 노출 허용
            reverseDirection={{ x: true, y: true }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={14}
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as unknown as Array<{ name: string; value: number; color: string }> | undefined}
                label={props.label as number | undefined}
                pensionStartMap={pensionStartMap}
                retirementAge={retirementAge}
                monthlySalaryByAge={monthlySalaryByAge}
                monthlyPensionByAge={monthlyPensionByAge}
                monthlyPublicPensionByAge={monthlyPublicPensionByAge}
                monthlyRetirementPensionByAge={monthlyRetirementPensionByAge}
                monthlyPrivatePensionByAge={monthlyPrivatePensionByAge}
                monthlyLivingExpenseByAge={monthlyLivingExpenseByAge}
                monthlyRentByAge={monthlyRentByAge}
                monthlyDebtServiceByAge={monthlyDebtServiceByAge}
                monthlyChildExpenseByAge={monthlyChildExpenseByAge}
                monthlyIncomeByAge={monthlyIncomeByAge}
                monthlyOutflowByAge={monthlyOutflowByAge}
                monthlyNetByAge={monthlyNetByAge}
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

      <div style={{ fontSize: 14, color: 'var(--ux-text-subtle)', marginTop: 6, lineHeight: 1.6 }}>
        {hasRealEstate ? `선택 전략: ${strategyLabel}` : `기준: ${strategyLabel}`} / 목표 월 {targetMonthly}만원 / 은퇴 {retirementAge}세
        <br />
        점에 마우스를 올리면 그 나이의 수입·지출·자산을 볼 수 있어요.
      </div>
    </div>
  );
}
