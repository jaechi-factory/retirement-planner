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

const STATUS_CONFIG: Record<StatusBadge, {
  label: string;
  bannerBg: string;
  bannerText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  stable: {
    label: '안정적',
    bannerBg: 'var(--palette-yellow)',
    bannerText: 'var(--palette-ink)',
    badgeBg: 'rgba(248,205,51,0.18)',
    badgeText: '#B8900A',
    badgeBorder: 'rgba(248,205,51,0.5)',
  },
  adjust: {
    label: '조정 필요',
    bannerBg: 'var(--palette-pink)',
    bannerText: '#FFFDFE',
    badgeBg: 'rgba(203,132,114,0.22)',
    badgeText: '#CB8472',
    badgeBorder: 'rgba(203,132,114,0.4)',
  },
  shortage: {
    label: '자금 부족',
    bannerBg: 'var(--palette-orange)',
    bannerText: '#FFFDFE',
    badgeBg: 'rgba(255,102,0,0.16)',
    badgeText: '#FF6600',
    badgeBorder: 'rgba(255,102,0,0.35)',
  },
};

function metricToneColor(tone?: NarrativeMetric['tone']): string {
  if (tone === 'positive') return 'var(--palette-yellow)';
  if (tone === 'negative') return 'var(--palette-orange)';
  return 'var(--text-on-dark)';
}

// "월 621만원" → { num: "621", suffix: "만원" }
function parseMonthlyValue(value: string): { num: string; suffix: string } | null {
  const match = value.match(/^월\s*([\d,]+)(만원.*)$/);
  if (match) return { num: match[1], suffix: match[2] };
  return null;
}

export default function ResultHeroSection({ summary, narrative, hasRealEstate }: ResultHeroSectionProps) {
  const badge = getStatusBadge(summary);
  const cfg = STATUS_CONFIG[badge];
  // metrics[0] = 가능한 월 생활비 ("월 608만원")
  const mainMetric = narrative.metrics[0];
  const parsed = mainMetric ? parseMonthlyValue(mainMetric.value) : null;
  const auxMetrics = narrative.metrics.slice(1);

  return (
    <section style={{ marginBottom: 40 }}>
      {/* ── Status Banner (full-width 상단 스트립) ── */}
      <div
        style={{
          background: cfg.bannerBg,
          borderRadius: '16px 16px 0 0',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: cfg.bannerText,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {cfg.label}
        </span>
        <span
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: cfg.bannerText,
            opacity: 0.5,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: cfg.bannerText,
            opacity: 0.72,
            fontWeight: 500,
          }}
        >
          {hasRealEstate ? '추천 전략 기준' : '무주택 기준'} · 최대 생활비
        </span>
      </div>

      {/* ── Dark Hero Body ── */}
      <div
        style={{
          background: 'var(--surface-hero)',
          borderRadius: '0 0 16px 16px',
          padding: '32px 28px 28px',
        }}
      >
        {/* ── 핵심 숫자 블록 ── */}
        <div style={{ marginBottom: 28 }}>
          {/* 레이블 */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-on-dark-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 8,
            }}
          >
            {mainMetric?.label ?? '가능한 월 생활비'}
          </span>

          {/* 대형 숫자 */}
          {parsed ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', lineHeight: 1 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-on-dark-muted)',
                  letterSpacing: '-0.01em',
                  alignSelf: 'flex-end',
                  paddingBottom: 6,
                }}
              >
                월
              </span>
              <span
                style={{
                  fontSize: 68,
                  fontWeight: 900,
                  color: 'var(--text-on-dark)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {parsed.num}
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--text-on-dark)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  alignSelf: 'flex-end',
                  paddingBottom: 4,
                }}
              >
                {parsed.suffix}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: 'var(--text-on-dark)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                display: 'block',
              }}
            >
              {mainMetric?.value ?? ''}
            </span>
          )}

          {/* 서브타이틀 — narrative headline */}
          <span
            style={{
              fontSize: 14,
              color: 'var(--text-on-dark-muted)',
              lineHeight: 1.5,
              display: 'block',
              marginTop: 10,
            }}
          >
            {narrative.headline}
          </span>
        </div>

        {/* ── 보조 지표 2개 ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {auxMetrics.map((metric) => (

            <div
              key={metric.label}
              style={{
                borderRadius: 10,
                border: '1px solid var(--border-on-dark)',
                background: 'rgba(255,253,254,0.05)',
                padding: '14px 14px',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--text-on-dark-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {metric.label}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: metricToneColor(metric.tone),
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  display: 'block',
                }}
              >
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {/* 권장 전략 줄 */}
        <div
          style={{
            borderTop: '1px solid var(--border-on-dark)',
            paddingTop: 18,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-on-dark-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              paddingTop: 2,
              flexShrink: 0,
            }}
          >
            {hasRealEstate ? '권장 전략' : '현재 상태'}
          </span>
          <div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-on-dark)',
                display: 'block',
                lineHeight: 1.3,
                marginBottom: 4,
              }}
            >
              {narrative.recommendedStrategyLabel}
            </span>
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-on-dark-muted)',
                lineHeight: 1.55,
                display: 'block',
              }}
            >
              {narrative.recommendationReasonLine}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
