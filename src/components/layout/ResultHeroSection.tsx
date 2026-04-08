import { ContentBadge, Typography } from '@wanteddev/wds';
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

// Hero 다크 패널(#24272E) 위 배지 — palette 6색 기반
const BADGE_CONFIG: Record<StatusBadge, { label: string; bg: string; color: string; border: string }> = {
  stable: {
    label: '안정적',
    bg: 'rgba(255, 253, 254, 0.10)',
    color: '#FFFDFE',
    border: 'rgba(255, 253, 254, 0.22)',
  },
  adjust: {
    label: '조정 필요',
    bg: 'rgba(203, 132, 114, 0.22)',
    color: '#CB8472',
    border: 'rgba(203, 132, 114, 0.38)',
  },
  shortage: {
    label: '부족',
    bg: 'rgba(255, 102, 0, 0.16)',
    color: '#FF6600',
    border: 'rgba(255, 102, 0, 0.32)',
  },
};

// 다크 패널 위 메트릭 tone 색상 — palette 6색 기반
function metricToneColor(tone?: NarrativeMetric['tone']): string {
  if (tone === 'positive') return '#F8CD33';
  if (tone === 'negative') return '#FF6600';
  return '#FFFDFE';
}

export default function ResultHeroSection({ summary, narrative, hasRealEstate }: ResultHeroSectionProps) {
  const badge = getStatusBadge(summary);
  const badgeCfg = BADGE_CONFIG[badge];

  return (
    <section
      style={{
        borderRadius: 20,
        background: 'var(--surface-hero)',
        padding: '32px 28px',
        marginBottom: 24,
      }}
    >
      {/* 상태 배지 + 서브레이블 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--result-space-2)', marginBottom: 'var(--result-space-3)' }}>
        <ContentBadge
          variant="solid"
          size="small"
          style={{
            color: badgeCfg.color,
            background: badgeCfg.bg,
            border: `1px solid ${badgeCfg.border}`,
            borderRadius: 999,
            padding: '2px 10px',
            letterSpacing: '0.01em',
            fontWeight: 700,
          }}
        >
          {badgeCfg.label}
        </ContentBadge>
        <Typography variant="caption1" style={{ color: 'var(--text-on-dark-muted)' }}>
          {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · 최대 생활비
        </Typography>
      </div>

      {/* 헤드라인 */}
      <Typography
        variant="display3"
        weight="bold"
        style={{
          fontSize: 'var(--result-text-display)',
          color: 'var(--text-on-dark)',
          lineHeight: 1.26,
          letterSpacing: '-0.02em',
          marginBottom: 'var(--result-space-5)',
          display: 'block',
        }}
      >
        {narrative.headline}
      </Typography>

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
              borderRadius: 10,
              border: '1px solid var(--border-on-dark)',
              background: 'rgba(255, 253, 254, 0.06)',
              padding: 'var(--result-space-3)',
              minHeight: 64,
            }}
          >
            <Typography
              variant="caption2"
              style={{ display: 'block', marginBottom: 'var(--result-space-1)', color: 'var(--text-on-dark-muted)' }}
            >
              {metric.label}
            </Typography>
            <Typography
              variant="headline2"
              weight="bold"
              style={{ color: metricToneColor(metric.tone), lineHeight: 1.3, display: 'block' }}
            >
              {metric.value}
            </Typography>
          </div>
        ))}
      </div>

      {/* 요약 액션 1줄 */}
      <hr style={{ border: 'none', borderTop: '1px solid var(--border-on-dark)', margin: '0 0 var(--result-space-3) 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--result-space-2)' }}>
        <Typography
          variant="caption1"
          style={{ flexShrink: 0, paddingTop: 2, color: 'var(--text-on-dark-muted)' }}
        >
          {hasRealEstate ? '권장 전략' : '현재 상태'}
        </Typography>
        <div>
          <Typography
            variant="headline2"
            weight="bold"
            style={{ color: 'var(--text-on-dark)', display: 'block' }}
          >
            {narrative.recommendedStrategyLabel}
          </Typography>
          <Typography
            variant="body1"
            style={{ color: 'var(--text-on-dark-muted)', lineHeight: 1.55, marginTop: 2, display: 'block' }}
          >
            {narrative.recommendationReasonLine}
          </Typography>
        </div>
      </div>
    </section>
  );
}
