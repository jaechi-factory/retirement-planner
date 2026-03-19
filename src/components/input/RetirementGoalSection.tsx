import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';

export default function RetirementGoalSection() {
  const { inputs, setGoal } = usePlannerStore();
  const { goal } = inputs;

  return (
    <SectionCard title="은퇴 목표">
      <NumberInput
        label="은퇴 나이"
        value={goal.retirementAge}
        onChange={(v) => setGoal({ retirementAge: v })}
        unit="세"
        min={inputs.status.currentAge + 1}
        max={100}
      />
      <NumberInput
        label="기대수명"
        value={goal.lifeExpectancy}
        onChange={(v) => setGoal({ lifeExpectancy: v })}
        unit="세"
        min={goal.retirementAge + 1}
        max={120}
      />
      <NumberInput
        label="은퇴 후 월 목표 생활비"
        value={goal.targetMonthly}
        onChange={(v) => setGoal({ targetMonthly: v })}
        unit="만원"
      />
      <RateInput
        label="물가상승률 (연)"
        value={goal.inflationRate}
        onChange={(v) => setGoal({ inflationRate: v })}
      />
    </SectionCard>
  );
}
