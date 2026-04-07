import { Typography } from '../ui/wds-replacements';
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

function metricBgColor(tone?: NarrativeMetric['tone']): string {
  if (tone === 'positive') return 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)';
  if (tone === 'negative') return 'linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)';
  return 'var(--white)';
}

export default function ResultHeroSection({ summary, narrative, hasRealEstate }: ResultHeroSectionProps) {
  const badge = getStatusBadge(summary);
  const badgeCfg = BADGE_CONFIG[badge];

  return (
    <section style={{ marginBottom: 48 }}>
      {/* Status badge + context — more breathing room */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 16px',
            borderRadius: 'var(--radius-full)',
            background: badgeCfg.bg,
            border: `1.5px solid ${badgeCfg.border}`,
            color: badgeCfg.color,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.01em',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 'var(--radius-full)',
              background: badgeCfg.color,
              boxShadow: `0 0 0 2px ${badgeCfg.bg}`,
            }}
          />
          {badgeCfg.label}
        </span>
        <Typography
          variant="caption1"
          style={{
            fontSize: 13,
            color: 'var(--neutral-400)',
            fontWeight: 500,
          }}
        >
          {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · 최대 생활비
        </Typography>
      </div>

      {/* Main headline — Bigger, bolder, editorial confidence */}
      <h1
        style={{
          margin: 0,
          fontSize: 40,
          fontWeight: 800,
          color: 'var(--neutral-900)',
          lineHeight: 1.2,
          letterSpacing: '-0.03em',
          marginBottom: 36,
          wordBreak: 'keep-all',
          maxWidth: 640,
        }}
      >
        {narrative.headline}
      </h1>

      {/* Key metrics — asymmetric sizing for visual interest */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {narrative.metrics.map((metric, idx) => (
          <div
            key={metric.label}
            style={{
              background: idx === 0 ? metricBgColor(metric.tone) : 'var(--white)',
              borderRadius: idx === 0 ? 'var(--radius-xl)' : 'var(--radius-lg)',
              border: idx === 0 ? 'none' : '1px solid var(--neutral-100)',
              padding: idx === 0 ? '28px 24px' : '20px 20px',
              minHeight: idx === 0 ? 110 : 90,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: idx === 0 ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Typography
              variant="caption2"
              style={{
                fontSize: idx === 0 ? 13 : 12,
                fontWeight: 600,
                color: idx === 0 ? 'var(--neutral-600)' : 'var(--neutral-400)',
                letterSpacing: '0.01em',
                marginBottom: idx === 0 ? 12 : 8,
              }}
            >
              {metric.label}
            </Typography>
            <Typography
              variant="heading2"
              weight="bold"
              style={{
                fontSize: idx === 0 ? 32 : 22,
                fontWeight: 800,
                color: metricToneColor(metric.tone),
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {metric.value}
            </Typography>
          </div>
        ))}
      </div>

      {/* Recommended strategy card — more refined */}
      <div
        style={{
          background: 'var(--neutral-25)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          border: '1px solid var(--neutral-100)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--neutral-400)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              flexShrink: 0,
              paddingTop: 5,
            }}
          >
            {hasRealEstate ? '권장' : '상태'}
          </span>
          <div style={{ flex: 1 }}>
            <Typography
              variant="heading6"
              weight="bold"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--neutral-900)',
                marginBottom: 6,
                letterSpacing: '-0.01em',
              }}
            >
              {narrative.recommendedStrategyLabel}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: 14,
                color: 'var(--neutral-500)',
                lineHeight: 1.65,
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
