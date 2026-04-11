import type { CalculationResultV2 } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';

interface ResultHeroSectionProps {
  summary: CalculationResultV2['summary'];
  inputs: PlannerInputs;
}

function getCase(summary: CalculationResultV2['summary'], targetMonthly: number): 'positive' | 'negative' {
  if (summary.failureAge !== null) return 'negative';
  if (targetMonthly > 0 && summary.sustainableMonthly < targetMonthly) return 'negative';
  return 'positive';
}

export default function ResultHeroSection({ summary, inputs }: ResultHeroSectionProps) {
  const lifeExpectancy = inputs.goal.lifeExpectancy || 90;
  const monthly = Math.round(summary.sustainableMonthly);
  const target = inputs.goal.targetMonthly;

  const caseType = getCase(summary, target);
  const isPositive = caseType === 'positive';

  // 배지 텍스트
  const badgeText = isPositive ? '미래가 긍정적이에요' : '미래가 부정적이에요';
  const badgeColor = isPositive ? '#2272eb' : '#f04452';

  // 본문 2줄
  const mainLine1 = `${lifeExpectancy}세까지 매월`;
  const mainLine2 = `${monthly.toLocaleString('ko-KR')}만원을 쓸 수 있어요`;

  // 서브타이틀
  let subtitleText: string;
  if (isPositive) {
    subtitleText =
      monthly >= target && target > 0
        ? '목표 금액보다 더 많은 돈을 쓸 수 있어요.'
        : '목표 금액에 근접하게 쓸 수 있어요.';
  } else {
    subtitleText = summary.failureAge !== null
      ? `${summary.failureAge}세에 자산이 바닥날 수 있어요.`
      : '목표 생활비를 달성하려면 개선이 필요해요.';
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
            color: '#4e5968',
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
