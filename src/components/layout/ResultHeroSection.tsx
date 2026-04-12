import type { CalculationResultV2 } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';

interface ResultHeroSectionProps {
  summary: CalculationResultV2['summary'];
  inputs: PlannerInputs;
  /** 차트에 표시 중인 전략의 sustainableMonthly (있으면 summary 대신 사용) */
  displaySustainableMonthly?: number;
  /** 차트에 표시 중인 전략의 failureAge (있으면 summary 대신 사용) */
  displayFailureAge?: number | null;
}

function getCase(failureAge: number | null, sustainableMonthly: number, targetMonthly: number): 'positive' | 'negative' {
  if (failureAge !== null) return 'negative';
  if (targetMonthly > 0 && sustainableMonthly < targetMonthly) return 'negative';
  return 'positive';
}

export default function ResultHeroSection({ summary, inputs, displaySustainableMonthly, displayFailureAge }: ResultHeroSectionProps) {
  const lifeExpectancy = inputs.goal.lifeExpectancy || 90;
  const effectiveSustainable = displaySustainableMonthly ?? summary.sustainableMonthly;
  const effectiveFailureAge = displayFailureAge !== undefined ? displayFailureAge : summary.failureAge;
  const monthly = Math.round(effectiveSustainable);
  const target = inputs.goal.targetMonthly;

  const caseType = getCase(effectiveFailureAge, effectiveSustainable, target);
  const isPositive = caseType === 'positive';

  // 배지 텍스트
  const badgeText = isPositive ? '미래가 긍정적이에요' : '미래에 쓸 돈이 부족해요';
  const badgeColor = isPositive ? '#2272eb' : '#f04452';

  // 본문 2줄
  const mainLine1 = `${lifeExpectancy}세까지 월 ${monthly.toLocaleString('ko-KR')}만원 수준의`;
  const mainLine2 = `생활을 유지할 수 있어요`;

  // 서브타이틀
  const shortfall = target > 0 ? target - monthly : 0;

  let subtitleText: string;
  let subtitleColor = '#4e5968';

  if (isPositive) {
    subtitleText = '목표한 생활비보다 더 여유 있는 결과예요';
  } else {
    subtitleText = `목표 생활비보다 매월 ${shortfall.toLocaleString('ko-KR')}만원이 부족해요. 목표를 달성하려면 현재 생활에서 개선이 필요해요.`;
    subtitleColor = '#F57800';
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 32,
        padding: '28px 32px',
        boxShadow: '0px 2px 8px 4px rgba(121,158,195,0.08)',
        marginBottom: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* 배지 + 메인 텍스트 묶음 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* 배지 */}
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 500,
              color: badgeColor,
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {badgeText}
          </p>

          {/* 메인 텍스트 (2줄) */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#191f28',
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            <p style={{ margin: 0 }}>{mainLine1}</p>
            <p style={{ margin: 0 }}>{mainLine2}</p>
          </div>
        </div>

        {/* 서브타이틀 */}
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 400,
            color: subtitleColor,
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          {subtitleText}
        </p>
      </div>
    </div>
  );
}
