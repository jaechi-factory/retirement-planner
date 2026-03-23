import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';

export default function RetirementGoalSection() {
  const { inputs, setGoal } = usePlannerStore();
  const { goal } = inputs;

  return (
    <SectionCard title="은퇴 목표" subtitle="언제, 얼마로 살지 정하면 모든 계산의 기준이 잡혀요">
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
        label="목표 월 생활비 (지금 기준)"
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
