import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';

export default function CurrentStatusSection() {
  const { inputs, result, setStatus } = usePlannerStore();
  const { status } = inputs;

  const monthlyIncome = Math.round(status.annualIncome / 12);
  const monthlyExpense = Math.round(status.annualExpense / 12);
  const monthlyDebt = result.firstYearMonthlyDebt;
  const monthlyChild = inputs.children.hasChildren
    ? Math.round(inputs.children.count * inputs.children.monthlyPerChild)
    : 0;
  const monthlySurplus = monthlyIncome - monthlyExpense - monthlyDebt - monthlyChild;
  const showCashflow = status.annualIncome > 0 && status.annualExpense > 0;

  return (
    <SectionCard title="현재 상태" subtitle="지금 수입과 지출로 매달 얼마나 남는지 봐요">
      <NumberInput
        label="현재 나이"
        value={status.currentAge}
        onChange={(v) => setStatus({ currentAge: v })}
        unit="세"
        min={1}
        max={inputs.goal.retirementAge - 1}
      />
      <NumberInput
        label="세후 연소득"
        value={status.annualIncome}
        onChange={(v) => setStatus({ annualIncome: v })}
        unit="만원"
        hint="세금·4대보험을 뺀 실제 연수입이에요 (보너스 포함)"
      />
      <RateInput
        label="연봉 증가율"
        value={status.incomeGrowthRate}
        onChange={(v) => setStatus({ incomeGrowthRate: v })}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8 }}>
          <NumberInput
            label="한 달 생활비"
            value={status.annualExpense > 0 ? Math.round(status.annualExpense / 12) : 0}
            onChange={(v) => setStatus({ annualExpense: v * 12 })}
            unit="만원"
            hint="주담대 상환액, 월세는 빼고 입력해요"
          />
          <RateInput
            label="생활비 증가율 (연)"
            value={status.expenseGrowthRate}
            onChange={(v) => setStatus({ expenseGrowthRate: v })}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--tds-gray-400)', margin: 0 }}>
          생활비 증가율은 물가(약 3%)에 맞춰 입력하면 돼요.
        </p>
      </div>

      {/* 월 현금흐름 요약 */}
      {showCashflow && (
        <div style={{
          marginTop: 4,
          borderRadius: 10,
          border: '1.5px solid var(--tds-gray-100)',
          overflow: 'hidden',
        }}>
          {/* 헤더 */}
          <div style={{
            background: 'var(--tds-gray-50, #F7F8FA)',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--tds-gray-500)',
            letterSpacing: 0.2,
          }}>
            이번 달 돈 흐름
          </div>

          {/* 항목들 */}
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row label="월 수입" value={monthlyIncome} sign="+" color="var(--tds-gray-700)" />
            <Row label="월 생활비" value={monthlyExpense} sign="−" color="var(--tds-gray-500)" />
            {monthlyDebt > 0 && (
              <Row label="월 대출 상환" value={monthlyDebt} sign="−" color="var(--tds-gray-500)" />
            )}
            {monthlyChild > 0 && (
              <Row label="월 자녀 지출" value={monthlyChild} sign="−" color="var(--tds-gray-500)" />
            )}

            {/* 구분선 */}
            <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '2px 0' }} />

            {/* 결과 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tds-gray-700)' }}>
                매달 남는 돈
              </span>
              <span style={{
                fontSize: 16, fontWeight: 800,
                color: monthlySurplus >= 0 ? 'var(--tds-gray-900)' : 'var(--tds-red-500)',
              }}>
                {monthlySurplus >= 0 ? '+' : ''}{monthlySurplus.toLocaleString('ko-KR')}만원
              </span>
            </div>

            {/* 설명 */}
            <div style={{
              fontSize: 12, color: 'var(--tds-gray-400)', lineHeight: 1.5,
              padding: '6px 8px',
              background: monthlySurplus > 0 ? 'var(--tds-blue-50)' : 'var(--tds-orange-50)',
              borderRadius: 6,
            }}>
              {monthlySurplus > 0
                ? `남는 돈은 지금 자산 비율대로 다시 투자되고, 수익이 더해져 복리로 커져요.`
                : `지금은 적자예요. 지출을 줄이거나 수입을 늘려야 해요.`
              }
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function Row({
  label, value, sign, color,
}: {
  label: string; value: number; sign: string; color: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--tds-gray-500)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>
        {sign}{value.toLocaleString('ko-KR')}만원
      </span>
    </div>
  );
}
