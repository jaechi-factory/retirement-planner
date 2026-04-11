import type { CounterfactualResult, SlottedRecommendation, SlotType } from '../../engine/counterfactualEngine';
import { getSlotLabel, generateHeadline, generateDetail, generateDeltaBadges } from '../../engine/counterfactualCopy';

interface ActionPlanSectionProps {
  counterfactual: CounterfactualResult | null;
}

const SLOT_BORDER_COLORS: Record<SlotType, string> = {
  best: 'var(--palette-ink)',
  practical: 'var(--palette-muted, rgba(36,39,46,0.35))',
  big_move: 'var(--palette-yellow)',
};

const SLOT_LABEL_COLORS: Record<SlotType, string> = {
  best: 'var(--palette-ink)',
  practical: 'rgba(36,39,46,0.55)',
  big_move: 'var(--palette-yellow-dark, #b8860b)',
};

function SlotCard({ rec, baselineSustainable }: { rec: SlottedRecommendation; baselineSustainable: number }) {
  const { slot, metrics } = rec;
  const headline = generateHeadline(metrics);
  const detail = generateDetail(metrics, baselineSustainable);
  const badges = generateDeltaBadges(metrics);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '18px 20px',
        borderRadius: 14,
        background: 'var(--surface-card)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid rgba(36,39,46,0.06)',
        borderLeft: `4px solid ${SLOT_BORDER_COLORS[slot]}`,
      }}
    >
      {/* 슬롯 라벨 */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: SLOT_LABEL_COLORS[slot],
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {getSlotLabel(slot)}
      </span>

      {/* Headline */}
      <span
        style={{
          color: 'var(--result-text-strong-color)',
          display: 'block',
          lineHeight: 1.45,
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {headline}
      </span>

      {/* Detail */}
      {detail && (
        <span
          style={{
            display: 'block',
            lineHeight: 1.6,
            fontSize: 13,
            color: 'rgba(36,39,46,0.58)',
          }}
        >
          {detail}
        </span>
      )}

      {/* Delta Badges */}
      {badges.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {badges.map((badge) => (
            <span
              key={badge.text}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                background: badge.type === 'positive'
                  ? 'rgba(34, 139, 34, 0.08)'
                  : 'rgba(36,39,46,0.05)',
                color: badge.type === 'positive'
                  ? 'rgb(34, 120, 34)'
                  : 'rgba(36,39,46,0.5)',
              }}
            >
              {badge.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActionPlanSection({ counterfactual }: ActionPlanSectionProps) {
  const slots = counterfactual?.slots ?? [];
  const baselineSustainable = counterfactual?.baseline.sustainableMonthly ?? 0;

  // 빈 상태: best와 practical 모두 없을 때
  const hasBestOrPractical = slots.some((s) => s.slot === 'best' || s.slot === 'practical');

  if (!counterfactual || !hasBestOrPractical) {
    return (
      <section>
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            지금 해야 할 일
          </span>
        </div>
        <div
          style={{
            padding: '20px 22px',
            borderRadius: 14,
            background: 'var(--surface-card)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid rgba(36,39,46,0.06)',
            borderLeft: '4px solid var(--palette-yellow)',
          }}
        >
          <span style={{ color: 'var(--result-text-body-color)', lineHeight: 1.65, fontSize: 14, display: 'block' }}>
            현재 입력 기준으로 안정적인 계획이에요. 입력값을 바꾸면 바로 다시 확인할 수 있어요.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section>
      {/* 섹션 레이블 */}
      <div style={{ marginBottom: 14 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-faint)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          지금 해야 할 일
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {slots.map((rec) => (
          <SlotCard
            key={rec.slot}
            rec={rec}
            baselineSustainable={baselineSustainable}
          />
        ))}
      </div>
    </section>
  );
}
