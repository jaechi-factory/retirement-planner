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
    <SectionCard title="현재 상태" subtitle="지금 수입과 지출로 앞으로 얼마나 모을 수 있는지 계산해요" tier={1}>
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
        hint="보너스를 포함해서, 1년 동안 통장에 들어오는 총 수입을 입력해 주세요."
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
            hint="주거비를 빼고, 매달 평균적으로 쓰는 돈을 입력해 주세요."
          />
          <RateInput
            label="생활비 증가율 (연)"
            value={status.expenseGrowthRate}
            onChange={(v) => setStatus({ expenseGrowthRate: v })}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>
          앞으로 생활비가 얼마나 오를지 예상해서 입력해 주세요. 보통은 물가상승률과 비슷하게 잡아요.
        </p>
      </div>

      {/* 월 현금흐름 요약 */}
      {showCashflow && (
        <div style={{
          marginTop: 4,
          borderRadius: 10,
          border: '1px solid #E6E0D8',
          overflow: 'hidden',
        }}>
          {/* 헤더 */}
          <div style={{
            background: '#FAF8F4',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-muted)',
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
            <div style={{ height: 1, background: '#E6E0D8', margin: '2px 0' }} />

            {/* 결과 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-base)' }}>
                매달 남는 돈
              </span>
              <span style={{
                fontSize: 16, fontWeight: 800,
                color: monthlySurplus >= 0 ? 'var(--text-strong)' : 'var(--status-shortage-text)',
              }}>
                {monthlySurplus >= 0 ? '+' : ''}{monthlySurplus.toLocaleString('ko-KR')}만원
              </span>
            </div>

            {/* 설명 */}
            <div style={{
              fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.5,
              padding: '6px 8px',
              background: monthlySurplus > 0 ? '#EBF4ED' : '#F6F0E2',
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
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>
        {sign}{value.toLocaleString('ko-KR')}만원
      </span>
    </div>
  );
}
