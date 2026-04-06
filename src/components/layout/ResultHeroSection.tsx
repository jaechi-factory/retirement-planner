import type { CalculationResultV2 } from '../../types/calculationV2';
import type { NarrativeMetric, ResultNarrativeModel } from './resultNarrative';

interface ResultHeroSectionProps {
  summary: CalculationResultV2['summary'];
  narrative: ResultNarrativeModel;
  hasRealEstate: boolean;
}

type StatusBadge = 'stable' | 'adjust' | 'shortage';

function getStatusBadge(summary: CalculationResultV2['summary']): StatusBadge {
  if (summary.failureAge !== null) return 'shortage';
  if (summary.targetGap < 0) return 'adjust';
  return 'stable';
}

const BADGE_CONFIG: Record<StatusBadge, { label: string; bg: string; color: string; border: string }> = {
  stable: {
    label: '안정적',
    bg: 'var(--ux-status-positive-bg, #F0FDF4)',
    color: 'var(--ux-status-positive, #16A34A)',
    border: 'var(--ux-status-positive-soft, #BBF7D0)',
  },
  adjust: {
    label: '조정 필요',
    bg: 'var(--ux-status-warning-bg, #FFFBEB)',
    color: 'var(--ux-status-warning, #D97706)',
    border: 'var(--ux-status-warning-soft, #FDE68A)',
  },
  shortage: {
    label: '부족',
    bg: 'var(--ux-status-negative-bg, #FFF1F2)',
    color: 'var(--ux-status-negative, #DC2626)',
    border: 'var(--ux-status-negative-soft, #FECDD3)',
  },
};

function metricToneColor(tone?: NarrativeMetric['tone']): string {
  if (tone === 'positive') return 'var(--ux-status-positive)';
  if (tone === 'negative') return 'var(--ux-status-negative)';
  return 'var(--result-text-value-strong-color)';
}

export default function ResultHeroSection({ summary, narrative, hasRealEstate }: ResultHeroSectionProps) {
  const badge = getStatusBadge(summary);
  const badgeCfg = BADGE_CONFIG[badge];

  return (
    <section
      style={{
        borderRadius: 16,
        border: '1px solid var(--result-border-soft)',
        background: 'var(--result-surface-base)',
        padding: 'var(--result-space-5)',
        marginBottom: 'var(--result-space-4)',
      }}
    >
      {/* 상태 배지 + 서브레이블 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--result-space-2)', marginBottom: 'var(--result-space-3)' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: badgeCfg.color,
            background: badgeCfg.bg,
            border: `1px solid ${badgeCfg.border}`,
            borderRadius: 999,
            padding: '2px 10px',
            letterSpacing: '0.01em',
          }}
        >
          {badgeCfg.label}
        </span>
        <span style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)' }}>
          {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · 최대 생활비
        </span>
      </div>

      {/* 헤드라인 */}
      <div
        style={{
          fontSize: 'var(--result-text-display)',
          fontWeight: 800,
          color: 'var(--result-text-strong-color)',
          lineHeight: 1.26,
          letterSpacing: '-0.02em',
          marginBottom: 'var(--result-space-5)',
        }}
      >
        {narrative.headline}
      </div>

      {/* 핵심 수치 3개 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 'var(--result-space-2)',
          marginBottom: 'var(--result-space-4)',
        }}
      >
        {narrative.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              borderRadius: 8,
              border: '1px solid var(--result-border-soft)',
              background: 'var(--result-surface-metric)',
              padding: 'var(--result-space-3)',
              minHeight: 64,
            }}
          >
            <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)', marginBottom: 'var(--result-space-1)' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: 'var(--result-text-metric)', fontWeight: 700, color: metricToneColor(metric.tone), lineHeight: 1.3 }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* 요약 액션 1줄 */}
      <div
        style={{
          borderTop: '1px solid var(--result-border-soft)',
          paddingTop: 'var(--result-space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--result-space-2)' }}>
          <span style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)', flexShrink: 0, paddingTop: 2 }}>
            {hasRealEstate ? '권장 전략' : '현재 상태'}
          </span>
          <div>
            <span style={{ fontSize: 'var(--result-text-title)', fontWeight: 700, color: 'var(--result-text-strong-color)' }}>
              {narrative.recommendedStrategyLabel}
            </span>
            <div style={{ fontSize: 'var(--result-text-body)', color: 'var(--result-text-body-color)', lineHeight: 1.55, marginTop: 2 }}>
              {narrative.recommendationReasonLine}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
