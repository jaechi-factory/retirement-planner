import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';

export default function RetirementGoalSection() {
  const { inputs, setGoal } = usePlannerStore();
  const { goal } = inputs;

  return (
    <SectionCard title="목표를 먼저 세워볼까요?">
      <NumberInput
        label="언제 은퇴하고 싶나요?"
        value={goal.retirementAge}
        onChange={(v) => setGoal({ retirementAge: v })}
        unit="세"
        min={inputs.status.currentAge + 1}
        max={100}
      />
      <NumberInput
        label="기대 수명을 알려주세요"
        value={goal.lifeExpectancy}
        onChange={(v) => setGoal({ lifeExpectancy: v })}
        unit="세"
        min={goal.retirementAge + 1}
        max={120}
      />
      <NumberInput
        label="은퇴 후 한달에 얼마를 쓰고 싶나요?"
        value={goal.targetMonthly}
        onChange={(v) => setGoal({ targetMonthly: v })}
        unit="만원"
      />
      <RateInput
        label="물가 상승율을 얼마로 잡을까요?"
        value={goal.inflationRate}
        onChange={(v) => setGoal({ inflationRate: v })}
        hint="평균적으로 매년 3.5%정도 올라요"
      />
    </SectionCard>
  );
}
