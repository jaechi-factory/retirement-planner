import { Typography } from '@wanteddev/wds';
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
    label: '안정',
    bg: 'var(--ux-status-positive-bg)',
    color: 'var(--ux-status-positive)',
    border: 'var(--ux-status-positive-soft)',
  },
  adjust: {
    label: '조정 필요',
    bg: 'var(--ux-status-warning-bg)',
    color: 'var(--ux-status-warning)',
    border: 'var(--ux-status-warning-soft)',
  },
  shortage: {
    label: '부족',
    bg: 'var(--ux-status-negative-bg)',
    color: 'var(--ux-status-negative)',
    border: 'var(--ux-status-negative-soft)',
  },
};

function metricToneColor(tone?: NarrativeMetric['tone']): string {
  if (tone === 'positive') return 'var(--ux-status-positive)';
  if (tone === 'negative') return 'var(--ux-status-negative)';
  return 'var(--neutral-900)';
}

export default function ResultHeroSection({ summary, narrative, hasRealEstate }: ResultHeroSectionProps) {
  const badge = getStatusBadge(summary);
  const badgeCfg = BADGE_CONFIG[badge];

  return (
    <section
      style={{
        marginBottom: 32,
      }}
    >
      {/* Status badge + context */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: badgeCfg.bg,
            border: `1px solid ${badgeCfg.border}`,
            color: badgeCfg.color,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.01em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 'var(--radius-full)',
              background: badgeCfg.color,
            }}
          />
          {badgeCfg.label}
        </span>
        <Typography
          variant="caption1"
          style={{
            fontSize: 13,
            color: 'var(--neutral-400)',
          }}
        >
          {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · 최대 생활비
        </Typography>
      </div>

      {/* Main headline — Big, confident, editorial */}
      <h1
        style={{
          margin: 0,
          fontSize: 36,
          fontWeight: 800,
          color: 'var(--neutral-900)',
          lineHeight: 1.25,
          letterSpacing: '-0.025em',
          marginBottom: 28,
          wordBreak: 'keep-all',
        }}
      >
        {narrative.headline}
      </h1>

      {/* Key metrics — 3 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {narrative.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              background: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-150)',
              padding: '20px',
              minHeight: 90,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="caption2"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--neutral-400)',
                letterSpacing: '0.01em',
                marginBottom: 8,
              }}
            >
              {metric.label}
            </Typography>
            <Typography
              variant="headline2"
              weight="bold"
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: metricToneColor(metric.tone),
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {metric.value}
            </Typography>
          </div>
        ))}
      </div>

      {/* Recommended strategy card */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-150)',
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--neutral-400)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              flexShrink: 0,
              paddingTop: 3,
            }}
          >
            {hasRealEstate ? '권장 전략' : '현재 상태'}
          </span>
          <div style={{ flex: 1 }}>
            <Typography
              variant="headline2"
              weight="bold"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--neutral-900)',
                marginBottom: 4,
              }}
            >
              {narrative.recommendedStrategyLabel}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: 14,
                color: 'var(--neutral-500)',
                lineHeight: 1.6,
              }}
            >
              {narrative.recommendationReasonLine}
            </Typography>
          </div>
        </div>
      </div>
    </section>
  );
}
