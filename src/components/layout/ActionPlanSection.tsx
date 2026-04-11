import type { CounterfactualResult, SlottedRecommendation } from '../../engine/counterfactualEngine';
import { generateHeadline, generateDetail, generateDeltaBadges } from '../../engine/counterfactualCopy';

interface ActionPlanSectionProps {
  counterfactual: CounterfactualResult | null;
  targetMonthly: number;
}

function SlotCard({ rec, index, baselineSustainable, targetMonthly }: { rec: SlottedRecommendation; index: number; baselineSustainable: number; targetMonthly: number }) {
  const { metrics } = rec;
  const headline = generateHeadline(metrics, targetMonthly);
  const detail = generateDetail(metrics, baselineSustainable);
  const badges = generateDeltaBadges(metrics);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 16,
        borderRadius: 20,
        background: '#f9f0fc',
        overflow: 'hidden',
      }}
    >
      {/* 번호 + 제목 */}
      <p
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: '#191f28',
          lineHeight: 1.5,
          fontFamily: 'Pretendard, sans-serif',
        }}
      >
        {index + 1}. {headline}
      </p>

      {/* 디바이더 */}
      <div style={{ background: '#d9d9d9', height: 1, width: '100%' }} />

      {/* 설명 + 배지 */}
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {detail && (
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 400,
              color: '#191f28',
              lineHeight: 1.6,
              fontFamily: 'Pretendard, sans-serif',
              paddingLeft: 12,
              textIndent: -12,
            }}
          >
            •{'  '}{detail}
          </p>
        )}
        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {badges.map((badge) => (
              <span
                key={badge.text}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: badge.type === 'positive'
                    ? 'rgba(120, 60, 180, 0.10)'
                    : 'rgba(36,39,46,0.06)',
                  color: badge.type === 'positive'
                    ? '#7b3bb0'
                    : 'rgba(36,39,46,0.5)',
                  fontFamily: 'Pretendard, sans-serif',
                }}
              >
                {badge.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActionPlanSection({ counterfactual, targetMonthly }: ActionPlanSectionProps) {
  const slots = counterfactual?.slots ?? [];
  const baselineSustainable = counterfactual?.baseline.sustainableMonthly ?? 0;

  // 빈 상태: best와 practical 모두 없을 때
  const hasBestOrPractical = slots.some((s) => s.slot === 'best' || s.slot === 'practical');

  if (!counterfactual || !hasBestOrPractical) {
    return (
      <section>
        <div
          style={{
            borderRadius: 32,
            background: '#ffffff',
            boxShadow: '0px 2px 8px 4px rgba(121,158,195,0.08)',
            overflow: 'hidden',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#191f28', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
              더 나은 은퇴 준비를 위해 추천드려요
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 400, color: '#4e5968', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
              계산 결과를 바탕으로, 은퇴 생활을 더 안정적으로 만드는 방법을 정리했어요.
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 20,
              background: '#f9f0fc',
            }}
          >
            <p style={{ margin: 0, color: '#191f28', lineHeight: 1.6, fontSize: 16, fontFamily: 'Pretendard, sans-serif' }}>
              현재 입력 기준으로 안정적인 계획이에요. 입력값을 바꾸면 바로 다시 확인할 수 있어요.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div
        style={{
          borderRadius: 32,
          background: '#ffffff',
          boxShadow: '0px 2px 8px 4px rgba(121,158,195,0.08)',
          overflow: 'hidden',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* 타이틀 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#191f28', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
            더 나은 은퇴 준비를 위해 추천드려요
          </p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 400, color: '#4e5968', fontFamily: 'Pretendard, sans-serif', lineHeight: 1.5 }}>
            계산 결과를 바탕으로, 은퇴 생활을 더 안정적으로 만드는 방법을 정리했어요.
          </p>
        </div>

        {/* 추천 카드 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {slots.map((rec, i) => (
            <SlotCard
              key={rec.slot}
              rec={rec}
              index={i}
              baselineSustainable={baselineSustainable}
              targetMonthly={targetMonthly}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
