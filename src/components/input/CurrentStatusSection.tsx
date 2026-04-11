import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';

export default function CurrentStatusSection() {
  const { inputs, setStatus } = usePlannerStore();
  const { status } = inputs;


  return (
    <SectionCard title="내 정보를 알려주세요">
      <NumberInput
        label="현재 나이를 알려주세요"
        value={status.currentAge}
        onChange={(v) => setStatus({ currentAge: v })}
        unit="세"
        min={1}
        max={inputs.goal.retirementAge - 1}
      />
      <NumberInput
        label="세후 연소득을 입력해 주세요"
        value={status.annualIncome}
        onChange={(v) => setStatus({ annualIncome: v })}
        unit="만원"
        hint="보너스를 포함해서, 1년 동안 통장에 들어오는 총 수입을 입력해 주세요."
      />
      <RateInput
        label="1년에 연봉이 얼마나 오르나요?"
        value={status.incomeGrowthRate}
        onChange={(v) => setStatus({ incomeGrowthRate: v })}
      />
      <NumberInput
        label="한 달 생활비"
        value={status.annualExpense > 0 ? Math.round(status.annualExpense / 12) : 0}
        onChange={(v) => setStatus({ annualExpense: v * 12 })}
        unit="만원"
        hint="주거비, 자동차 관련 비용은 제외해주세요."
      />

    </SectionCard>
  );
}
