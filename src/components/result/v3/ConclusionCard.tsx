import type { CalculationResultV2 } from '../../../types/calculationV2';
import type { PlannerInputs } from '../../../types/inputs';
import { fmtKRW } from '../../../utils/format';

interface ConclusionCardProps {
  summary: CalculationResultV2['summary'];
  propertyOptions: CalculationResultV2['propertyOptions'];
  inputs: PlannerInputs;
}

export default function ConclusionCard({ summary, propertyOptions, inputs }: ConclusionCardProps) {
  const { lifeExpectancy, retirementAge } = inputs.goal;
  const { failureAge, financialExhaustionAge } = summary;

  const hasRealEstate = inputs.assets.realEstate.amount > 0;

  // 집 전략으로 기대수명까지 생존 가능한 옵션 찾기
  const housingSurvivesOption = hasRealEstate
    ? propertyOptions.find(
        (o) => (o.strategy === 'sell' || o.strategy === 'secured_loan') && o.survivesToLifeExpectancy
      )
    : null;

  // 시나리오 판별
  let isPositive = false;
  let headline = '';
  let subText = '';

  if (failureAge === null) {
    // 케이스 1: 기대수명까지 충분
    isPositive = true;
    headline = `당신은 ${lifeExpectancy}세까지 돈이 충분합니다`;
    subText = `현재 전략대로라면 은퇴 후 ${lifeExpectancy - retirementAge}년을 버틸 수 있어요.`;
  } else if (financialExhaustionAge !== null && housingSurvivesOption) {
    // 케이스 2: 저축 소진되지만 집 전략으로 해결됨
    isPositive = true;
    const actionLabel =
      housingSurvivesOption.strategy === 'sell' ? '팔면' : '담보대출을 받으면';
    headline = `집을 ${actionLabel} ${lifeExpectancy}세까지 가능합니다`;
    subText = `${financialExhaustionAge}세에 저축이 바닥나지만, 집을 활용하면 ${lifeExpectancy}세까지 이어집니다.`;
  } else {
    // 케이스 3: 어떤 전략도 기대수명까지 생존 못 함
    isPositive = false;
    headline = `이 계획대로라면 ${failureAge}세에 돈이 바닥납니다`;

    const { targetMonthly } = inputs.goal;
    const { sustainableMonthly } = summary;
    const shortfall = targetMonthly > 0 ? targetMonthly - sustainableMonthly : 0;

    // 연금 수령액 합산 (국민연금 + 퇴직연금 + 개인연금)
    const totalPensionMonthly =
      (inputs.pension.publicPension.enabled ? inputs.pension.publicPension.manualMonthlyTodayValue : 0) +
      (inputs.pension.retirementPension.enabled ? inputs.pension.retirementPension.manualMonthlyTodayValue : 0) +
      (inputs.pension.privatePension.enabled ? inputs.pension.privatePension.manualMonthlyTodayValue : 0);

    if (sustainableMonthly > 0 && shortfall > 0) {
      const pensionNote = totalPensionMonthly > 0
        ? ` ${failureAge}세 이후에는 연금 ${fmtKRW(totalPensionMonthly)}만 남아요.`
        : '';
      subText = `목표 생활비 ${fmtKRW(targetMonthly)} 기준으로 ${lifeExpectancy}세까지 버티기 어렵고, 지금 자산으로는 월 ${fmtKRW(sustainableMonthly)}까지만 가능해요. 저축을 늘리거나 수익률을 높여야 해요.${pensionNote}`;
    } else if (totalPensionMonthly > 0) {
      subText = `${failureAge}세 이후에는 연금 ${fmtKRW(totalPensionMonthly)}만 남아요. 지금부터 저축을 늘리거나 수익률을 높이는 방법을 검토해보세요.`;
    } else {
      subText = `${failureAge}세 이후에는 수입이 없어져요. 저축을 늘리거나 수익률을 높이는 방법을 지금 바로 검토해보세요.`;
    }
  }

  const bg = isPositive ? '#F6FBF7' : '#FFF8F8';
  const borderColor = isPositive ? '#D4EDDA' : '#FFDADA';

  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${borderColor}`,
        borderLeft: `4px solid ${isPositive ? '#1B7F3A' : '#C0392B'}`,
        borderRadius: 14,
        padding: '28px 24px',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: isPositive ? '#1B5E20' : '#8B1A1A',
          lineHeight: 1.3,
          marginBottom: 8,
          letterSpacing: '-0.5px',
        }}
      >
        {headline}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--tds-gray-600)',
          lineHeight: 1.6,
        }}
      >
        {subText}
      </div>
    </div>
  );
}
