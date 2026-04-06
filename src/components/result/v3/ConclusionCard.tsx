import type { CalculationResultV2 } from '../../../types/calculationV2';
import type { PlannerInputs } from '../../../types/inputs';
import { fmtKRW } from '../../../utils/format';
import { getTotalMonthlyPensionTodayValue } from '../../../engine/pensionEstimation';

interface ConclusionCardProps {
  summary: CalculationResultV2['summary'];
  propertyOptions: CalculationResultV2['propertyOptions'];
  inputs: PlannerInputs;
  netWorth: number;
  monthlySavings: number;
}

export default function ConclusionCard({ summary, propertyOptions, inputs, netWorth, monthlySavings }: ConclusionCardProps) {
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
    headline = `${lifeExpectancy}세까지 생활비를 유지할 수 있어요`;
    subText = `현재 전략대로라면 은퇴 후 ${lifeExpectancy - retirementAge}년을 버틸 수 있어요.`;
  } else if (financialExhaustionAge !== null && housingSurvivesOption) {
    // 케이스 2: 저축 소진되지만 집 전략으로 해결됨
    isPositive = true;
    const actionLabel = housingSurvivesOption.strategy === 'sell' ? '매각' : '담보대출';
    headline = `집 ${actionLabel} 전략이면 ${lifeExpectancy}세까지 가능해요`;
    subText = `${financialExhaustionAge}세에 금융자산이 거의 다 떨어지지만, 집 전략을 쓰면 ${lifeExpectancy}세까지 이어집니다.`;
  } else {
    // 케이스 3: 어떤 전략도 기대수명까지 생존 못 함
    isPositive = false;
    headline = `이 계획대로라면 ${failureAge}세부터 생활비가 모자라요`;

    const { targetMonthly } = inputs.goal;
    const { sustainableMonthly } = summary;
    const shortfall = targetMonthly > 0 ? targetMonthly - sustainableMonthly : 0;

    const totalPensionMonthly = getTotalMonthlyPensionTodayValue(
      inputs.pension,
      inputs.status.currentAge,
      inputs.goal.retirementAge,
      inputs.status.annualIncome,
      inputs.goal.inflationRate,
    );

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
  const chipBg = isPositive ? 'rgba(27,127,58,0.07)' : 'rgba(192,57,43,0.06)';
  const dividerColor = isPositive ? '#D4EDDA' : '#FFDADA';

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

      {/* 순자산 / 월 여유자금 칩 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${dividerColor}`,
        }}
      >
        <div
          style={{
            flex: 1,
            background: chipBg,
            borderRadius: 8,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--tds-gray-400)', marginBottom: 2 }}>순자산</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: netWorth < 0 ? '#C0392B' : 'var(--tds-gray-800)',
            }}
          >
            {fmtKRW(netWorth)}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: chipBg,
            borderRadius: 8,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--tds-gray-400)', marginBottom: 2 }}>월 여유자금</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: monthlySavings < 0 ? '#C0392B' : 'var(--tds-gray-800)',
            }}
          >
            {monthlySavings >= 0 ? '+' : ''}{fmtKRW(Math.abs(monthlySavings))}
          </div>
        </div>
      </div>
    </div>
  );
}
