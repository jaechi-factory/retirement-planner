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
    bg: '#F0FDF4',
    color: '#15803D',
    border: '#BBF7D0',
  },
  cash_like: {
    label: '현금 사용',
    bg: '#EFF6FF',
    color: '#1D4ED8',
    border: '#BFDBFE',
  },
  financial: {
    label: '투자자산 매도',
    bg: '#EEF2FF',
    color: '#4338CA',
    border: '#C7D2FE',
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
    bg: '#FFF1F2',
    color: '#BE123C',
    border: '#FECDD3',
  },
};

export default function FundingPathSection({ fundingTimeline, lifeExpectancy, retirementAge }: FundingPathSectionProps) {
  if (!fundingTimeline || fundingTimeline.length === 0) return null;

  const totalSpan = lifeExpectancy - retirementAge;
  if (totalSpan <= 0) return null;

  return (
    <div>
      {/* 나이 레이블 행 */}
      <div style={{ position: 'relative', marginBottom: 4 }}>
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
                  paddingLeft: 4,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 11, color: 'rgba(36,39,46,0.64)' }}>
                  {stageFrom}세
                </span>
              </div>
            );
          })}
          {/* 마지막 나이 */}
          <div style={{ position: 'absolute', right: 0, lineHeight: 1.3 }}>
            <span style={{ fontSize: 11, color: 'rgba(36,39,46,0.64)' }}>
              {lifeExpectancy}세
            </span>
          </div>
        </div>
      </div>

      {/* 블록 바 */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          height: 36,
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
                borderRight: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {widthPct > 8 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: cfg.color,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 6px',
                  }}
                >
                  {cfg.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--result-space-2)',
          marginTop: 'var(--result-space-2)',
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
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 500, color: cfg.color }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(36,39,46,0.64)' }}>
                {stageFrom}~{stageTo}세
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
