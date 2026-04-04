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
import type { PlannerInputs } from '../../types/inputs';
import { getPensionBreakdown } from '../../engine/pensionEstimation';
import { fmtKRW, fmtKRWAxis } from '../../utils/format';

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

// 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
  label,
  pensionStartMap,
  retirementAge,
  pensionByAge,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  pensionStartMap: Map<number, PensionEvent[]>;
  retirementAge: number;
  pensionByAge: Map<number, number>;
}) {
  if (!active || !payload || label === undefined) return null;

  const pensions = pensionStartMap.get(label) ?? [];
  const isRetirementYear = label === retirementAge;
  const totalPensionThisYear = pensionByAge.get(label) ?? 0;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--tds-gray-100)',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 12,
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--tds-gray-800)' }}>
        {label}세
        {isRetirementYear && (
          <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--tds-gray-400)', fontWeight: 500 }}>
            은퇴
          </span>
        )}
      </div>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--tds-gray-600)', marginBottom: 2 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {p.name === '매각대금 운용' ? '매각대금 운용 (연 4%)' : p.name}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--tds-gray-800)' }}>{fmtKRW(Number(p.value))}</span>
        </div>
      ))}
      {totalPensionThisYear > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 4,
            paddingTop: 4,
            borderTop: '1px solid var(--tds-gray-100)',
            color: '#1B7F3A',
            fontWeight: 600,
          }}
        >
          <span>연금 수입</span>
          <span>월 {fmtKRW(Math.round(totalPensionThisYear / 12))}</span>
        </div>
      )}
      {pensions.length > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--tds-gray-100)',
          }}
        >
          {pensions.map((p, i) => (
            <div key={i} style={{ color: '#1B7F3A', fontWeight: 600, marginBottom: 2 }}>
              + {p.name} 월 {fmtKRW(p.monthly)} 수령 시작
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssetBalanceChart({ rows, retirementAge, targetMonthly, strategyLabel, inputs }: Props) {
  if (rows.length === 0) return null;

  const pensionStartMap = buildPensionStartMap(inputs, retirementAge);

  // 나이별 연금 수입 맵 (연금 포함 라벨 표시용)
  const pensionByAge = new Map<number, number>(
    rows.map((r) => [r.ageYear, r.totalPension])
  );

  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  const hasSaleProceeds = hasRealEstate && rows.some((r) => r.propertySaleProceedsBucketEnd > 0);

  const data = rows.map((r) => ({
    age: r.ageYear,
    ...(hasRealEstate ? { '집 자산': r.propertyValueEnd } : {}),
    '현금·예금': r.cashLikeEnd,
    '주식·채권': r.financialInvestableEnd,
    ...(hasSaleProceeds ? { '매각대금 운용': r.propertySaleProceedsBucketEnd } : {}),
    shortfall: r.totalShortfall,
  }));

  // 소진 여부 및 결론 분기 계산
  const depletionRow = rows.find((r) => r.totalShortfall > 0);
  const depletionAge = depletionRow?.ageYear ?? null;
  const lastRow = rows[rows.length - 1];
  // 매각대금 운용 잔고가 기대수명 말 시점에 남아있으면 → 매각대금으로 버티는 케이스
  const isSaleProceedsDependent =
    depletionAge === null &&
    hasSaleProceeds &&
    lastRow !== undefined &&
    lastRow.propertySaleProceedsBucketEnd > 0;
  // 매각대금 없이 연금 수입만으로 버티는 케이스
  const isPensionDependent =
    depletionAge === null &&
    !isSaleProceedsDependent &&
    lastRow !== undefined &&
    lastRow.financialInvestableEnd < 100 &&
    lastRow.totalPension > 0;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 결론 1줄 — 차트 위 */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: depletionAge !== null ? '#C0392B' : isPensionDependent ? '#D4700A' : '#1B7F3A',
          marginBottom: 12,
        }}
      >
        {depletionAge !== null
          ? `${depletionAge}세에 금융자산이 소진돼요`
          : isSaleProceedsDependent
          ? '매각대금 운용으로 기대수명까지 생활비를 충당해요'
          : isPensionDependent
          ? '연금으로 기대수명까지 생활비를 충당해요'
          : '기대수명까지 금융자산을 유지해요'}
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {hasRealEstate && (
              <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E65100" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E65100" stopOpacity={0.02} />
              </linearGradient>
            )}
            {hasSaleProceeds && (
              <linearGradient id="saleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.02} />
              </linearGradient>
            )}
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
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as unknown as Array<{ name: string; value: number; color: string }> | undefined}
                label={props.label as number | undefined}
                pensionStartMap={pensionStartMap}
                retirementAge={retirementAge}
                pensionByAge={pensionByAge}
              />
            )}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          {hasRealEstate && (
            <Area type="monotone" dataKey="집 자산" stroke="#E65100" strokeWidth={1.5} fill="url(#propGrad)" />
          )}
          {hasSaleProceeds && (
            <Area
              type="monotone"
              dataKey="매각대금 운용"
              stroke="#2E7D32"
              strokeWidth={1.5}
              fill="url(#saleGrad)"
              strokeDasharray="5 3"
            />
          )}
          <Area type="monotone" dataKey="현금·예금" stroke="#2196F3" strokeWidth={1.5} fill="url(#cashGrad)" />
          <Area type="monotone" dataKey="주식·채권" stroke="#4527A0" strokeWidth={1.5} fill="url(#finGrad)" />
        </AreaChart>
      </ResponsiveContainer>

      {/* 메타 1줄 — 차트 아래 */}
      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 8, lineHeight: 1.7 }}>
        전략: {strategyLabel} / 월 {targetMonthly}만원 기준 / 은퇴: {retirementAge}세
        {hasSaleProceeds && (
          <>
            <br />
            집 매각 후 가정: 월세 200만원(현재가치·물가연동) · 매각대금 연 4% 복리 운용
            <br />
            생활비 인출이 연 4% 수익을 초과하는 시점부터 매각대금 잔고가 줄어들 수 있어요
          </>
        )}
      </div>
    </div>
  );
}
