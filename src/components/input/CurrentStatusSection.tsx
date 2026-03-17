import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';

export default function CurrentStatusSection() {
  const { inputs, setStatus } = usePlannerStore();
  const { status } = inputs;

  return (
    <SectionCard title="현재 상태">
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
        hint="세금·4대보험 공제 후 실수령액 기준 (보너스 포함 시 합산)"
      />
      <RateInput
        label="수입 증가율 (연)"
        value={status.incomeGrowthRate}
        onChange={(v) => setStatus({ incomeGrowthRate: v })}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8 }}>
          <NumberInput
            label="연 소비"
            value={status.annualExpense}
            onChange={(v) => setStatus({ annualExpense: v })}
          />
          <RateInput
            label="지출 증가율 (연)"
            value={status.expenseGrowthRate}
            onChange={(v) => setStatus({ expenseGrowthRate: v })}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--tds-gray-400)', margin: 0 }}>
          같은 수준의 소비를 원한다면 최소 물가 상승률 이상 입력해주세요. 물가는 매년 3% 이상 올라요.
        </p>
      </div>
    </SectionCard>
  );
}
