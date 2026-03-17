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
        label="연 수입"
        value={status.annualIncome}
        onChange={(v) => setStatus({ annualIncome: v })}
      />
      <RateInput
        label="수입 증가율 (연)"
        value={status.incomeGrowthRate}
        onChange={(v) => setStatus({ incomeGrowthRate: v })}
      />
      <NumberInput
        label="연 소비"
        value={status.annualExpense}
        onChange={(v) => setStatus({ annualExpense: v })}
      />
    </SectionCard>
  );
}
