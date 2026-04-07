import { Typography } from '../ui/wds-replacements';
import type { FundingStage } from '../../types/calculationV2';

interface FundingPathSectionProps {
  fundingTimeline: FundingStage[];
  lifeExpectancy: number;
  retirementAge: number;
}

type BucketType = FundingStage['bucketType'];

const BUCKET_CONFIG: Record<BucketType, { label: string; bg: string; color: string; border: string }> = {
  income: {
    label: '근로소득',
    bg: '#ECFDF5',
    color: '#047857',
    border: '#A7F3D0',
  },
  cash_like: {
    label: '현금 사용',
    bg: '#EFF6FF',
    color: '#1D4ED8',
    border: '#BFDBFE',
  },
  financial: {
    label: '투자자산 매도',
    bg: '#F5F3FF',
    color: '#6D28D9',
    border: '#DDD6FE',
  },
  property_keep: {
    label: '집 유지',
    bg: '#F8FAFC',
    color: '#475569',
    border: '#E2E8F0',
  },
  property_loan: {
    label: '담보대출',
    bg: '#FFFBEB',
    color: '#B45309',
    border: '#FDE68A',
  },
  property_sale: {
    label: '매각 대금',
    bg: '#FFF7ED',
    color: '#C2410C',
    border: '#FED7AA',
  },
  failure: {
    label: '자금 부족',
    bg: '#FEF2F2',
    color: '#B91C1C',
    border: '#FECACA',
  },
};

export default function FundingPathSection({ fundingTimeline, lifeExpectancy, retirementAge }: FundingPathSectionProps) {
  if (!fundingTimeline || fundingTimeline.length === 0) return null;

  const totalSpan = lifeExpectancy - retirementAge;
  if (totalSpan <= 0) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      {/* Section label */}
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
        돈이 어떻게 버텨주는지
      </div>

      {/* Timeline container */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-150)',
          padding: '24px',
        }}
      >
        {/* Age labels row */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <div style={{ display: 'flex', width: '100%' }}>
            {fundingTimeline.map((stage, idx) => {
              const stageFrom = Math.max(stage.fromAge, retirementAge);
              const stageTo = Math.min(stage.toAge ?? lifeExpectancy, lifeExpectancy);
              const span = stageTo - stageFrom;
              const widthPct = (span / totalSpan) * 100;
              if (widthPct <= 0) return null;
              return (
                <div
                  key={`label-${idx}`}
                  style={{
                    width: `${widthPct}%`,
                    lineHeight: 1.3,
                    paddingLeft: 2,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography
                    variant="caption2"
                    style={{
                      fontSize: 11,
                      color: 'var(--neutral-400)',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {stageFrom}세
                  </Typography>
                </div>
              );
            })}
            {/* Last age */}
            <div style={{ position: 'absolute', right: 0, lineHeight: 1.3 }}>
              <Typography
                variant="caption2"
                style={{
                  fontSize: 11,
                  color: 'var(--neutral-400)',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {lifeExpectancy}세
              </Typography>
            </div>
          </div>
        </div>

        {/* Timeline bar */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            height: 48,
            border: '1px solid var(--neutral-200)',
          }}
        >
          {fundingTimeline.map((stage, idx) => {
            const stageFrom = Math.max(stage.fromAge, retirementAge);
            const stageTo = Math.min(stage.toAge ?? lifeExpectancy, lifeExpectancy);
            const span = stageTo - stageFrom;
            const widthPct = (span / totalSpan) * 100;
            if (widthPct <= 0) return null;
            const cfg = BUCKET_CONFIG[stage.bucketType];
            return (
              <div
                key={`block-${idx}`}
                title={`${stageFrom}~${stageTo}세: ${cfg.label}`}
                style={{
                  width: `${widthPct}%`,
                  background: cfg.bg,
                  borderRight: idx < fundingTimeline.length - 1 ? `1px solid ${cfg.border}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'opacity var(--transition-fast)',
                  cursor: 'default',
                }}
              >
                {widthPct > 12 && (
                  <Typography
                    variant="caption2"
                    weight="medium"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: cfg.color,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      padding: '0 8px',
                    }}
                  >
                    {cfg.label}
                  </Typography>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--neutral-100)',
          }}
        >
          {fundingTimeline.map((stage, idx) => {
            const stageFrom = Math.max(stage.fromAge, retirementAge);
            const stageTo = Math.min(stage.toAge ?? lifeExpectancy, lifeExpectancy);
            const span = stageTo - stageFrom;
            if (span <= 0) return null;
            const cfg = BUCKET_CONFIG[stage.bucketType];
            return (
              <div
                key={`legend-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption2"
                  weight="medium"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: cfg.color,
                  }}
                >
                  {cfg.label}
                </Typography>
                <Typography
                  variant="caption2"
                  style={{
                    fontSize: 12,
                    color: 'var(--neutral-400)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stageFrom}-{stageTo}세
                </Typography>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
