import { SectionHeader, Typography } from '@wanteddev/wds';
import { getTotalMonthlyPensionTodayValue } from '../../engine/pensionEstimation';
import type { CalculationResultV2 } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import { fmtKRW } from '../../utils/format';

interface WhyThisResultSectionProps {
  summary: CalculationResultV2['summary'];
  inputs: PlannerInputs;
  hasRealEstate: boolean;
}

interface ReasonCard {
  title: string;
  body: string;
  tone: 'neutral' | 'positive' | 'negative' | 'warning';
}

function cardAccentColor(tone: ReasonCard['tone']): string {
  if (tone === 'positive') return 'var(--ux-status-positive)';
  if (tone === 'negative') return 'var(--ux-status-negative)';
  if (tone === 'warning') return 'var(--ux-status-warning, #D97706)';
  return 'var(--result-accent-strong)';
}

export default function WhyThisResultSection({ summary, inputs, hasRealEstate }: WhyThisResultSectionProps) {
  const { retirementAge, targetMonthly, lifeExpectancy, inflationRate } = inputs.goal;
  const { currentAge, annualIncome } = inputs.status;

  const pensionMonthly = getTotalMonthlyPensionTodayValue(
    inputs.pension,
    currentAge,
    retirementAge,
    annualIncome,
    inflationRate,
  );

  const cards: ReasonCard[] = [];

  // 카드 1: 연금 커버리지
  if (pensionMonthly > 0) {
    const coverageRatio = targetMonthly > 0 ? Math.round((pensionMonthly / targetMonthly) * 100) : 0;
    cards.push({
      title: '연금이 생활비를 얼마나 받쳐주나요',
      body: `연금으로 월 ${fmtKRW(pensionMonthly)}을 받을 수 있어요. 목표 생활비(월 ${fmtKRW(targetMonthly)})의 ${coverageRatio}%를 커버해요.`,
      tone: coverageRatio >= 70 ? 'positive' : coverageRatio >= 40 ? 'neutral' : 'warning',
    });
  } else {
    cards.push({
      title: '연금이 없거나 입력되지 않았어요',
      body: `연금 수입이 없으면 자산만으로 ${lifeExpectancy}세까지 버텨야 해요. 왼쪽에서 연금 정보를 추가하면 더 정확한 결과를 볼 수 있어요.`,
      tone: 'warning',
    });
  }

  // 카드 2: 자산 수준
  const gap = summary.sustainableMonthly - targetMonthly;
  if (gap >= 0) {
    cards.push({
      title: '자산이 목표 생활비를 감당해요',
      body: `현재 자산 기준으로 월 ${fmtKRW(summary.sustainableMonthly)}이 가능해요. 목표보다 월 ${fmtKRW(gap)} 여유가 있어요.`,
      tone: 'positive',
    });
  } else {
    cards.push({
      title: '자산이 목표 생활비에 조금 부족해요',
      body: `현재 자산 기준으로 월 ${fmtKRW(summary.sustainableMonthly)}이 가능해요. 목표보다 월 ${fmtKRW(Math.abs(gap))} 부족해요.`,
      tone: 'negative',
    });
  }

  // 카드 3: 자금 전환 시점
  const exhaustionAge = summary.financialExhaustionAge;
  const interventionAge = summary.propertyInterventionAge;

  if (exhaustionAge !== null && hasRealEstate && interventionAge !== null) {
    cards.push({
      title: '언제부터 자산이 줄기 시작하나요',
      body: `${exhaustionAge}세 무렵 투자자산이 소진돼요. ${interventionAge}세부터는 집을 팔거나 담보대출을 받아야 해요.`,
      tone: summary.failureAge !== null ? 'negative' : 'warning',
    });
  } else if (exhaustionAge !== null) {
    cards.push({
      title: '언제부터 자산이 줄기 시작하나요',
      body: `${exhaustionAge}세 무렵 투자자산이 소진돼요. 그 이후엔 현금성 자산으로 버텨요.`,
      tone: summary.failureAge !== null ? 'negative' : 'warning',
    });
  } else if (summary.failureAge === null) {
    cards.push({
      title: '자금이 기대수명까지 유지돼요',
      body: `${lifeExpectancy}세까지 금융자산이 버텨줄 것으로 계산돼요.`,
      tone: 'positive',
    });
  }

  return (
    <section style={{ marginBottom: 'var(--result-space-5)' }}>
      <SectionHeader
        headingContent="이런 결과가 나온 이유"
        size="small"
        headingTag="h2"
        style={{
          letterSpacing: '0.01em',
          marginBottom: 'var(--result-space-3)',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--result-space-2)',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              borderRadius: 10,
              background: 'var(--surface-card)',
              padding: 'var(--result-space-3) var(--result-space-4)',
              borderLeft: `3px solid ${cardAccentColor(card.tone)}`,
            }}
          >
            <Typography
              variant="body1"
              weight="bold"
              style={{
                color: 'var(--result-text-strong-color)',
                display: 'block',
                marginBottom: 'var(--result-space-1)',
                lineHeight: 1.4,
              }}
            >
              {card.title}
            </Typography>
            <Typography
              variant="body1"
              style={{
                color: 'var(--result-text-body-color)',
                display: 'block',
                lineHeight: 1.62,
              }}
            >
              {card.body}
            </Typography>
          </div>
        ))}
      </div>
    </section>
  );
}
