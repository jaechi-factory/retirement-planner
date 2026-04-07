import { Typography } from '@wanteddev/wds';
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
  if (tone === 'warning') return 'var(--ux-status-warning)';
  return 'var(--brand-accent)';
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

  // Card 1: Pension coverage
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

  // Card 2: Asset level
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

  // Card 3: Transition timing
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
    <section style={{ marginBottom: 40 }}>
      {/* Section label — Editorial style */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--neutral-400)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        이런 결과가 나온 이유
      </div>

      {/* Reason cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {cards.map((card, index) => (
          <div
            key={card.title}
            style={{
              background: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-150)',
              padding: '20px 24px',
              borderLeft: `4px solid ${cardAccentColor(card.tone)}`,
              position: 'relative',
            }}
          >
            {/* Card number */}
            <span
              style={{
                position: 'absolute',
                top: 20,
                right: 24,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--neutral-300)',
                letterSpacing: '0.02em',
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            <Typography
              variant="body1"
              weight="bold"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--neutral-900)',
                marginBottom: 6,
                lineHeight: 1.4,
                paddingRight: 32,
              }}
            >
              {card.title}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: 14,
                color: 'var(--neutral-500)',
                lineHeight: 1.65,
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
