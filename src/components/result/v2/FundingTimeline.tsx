import type { FundingStage } from '../../../types/calculationV2';

interface Props {
  stages: FundingStage[];
  retirementAge: number;
  lifeExpectancy: number;
}

const BUCKET_COLORS: Record<FundingStage['bucketType'], { bg: string; text: string }> = {
  income:        { bg: '#E8F5E9', text: '#2E7D32' },
  cash_like:     { bg: '#E3F2FD', text: '#1565C0' },
  financial:     { bg: '#EDE7F6', text: '#4527A0' },
  property_keep: { bg: '#FFF3E0', text: '#E65100' },
  property_loan: { bg: '#FFF8E1', text: '#F57F17' },
  property_sale: { bg: '#FCE4EC', text: '#880E4F' },
  failure:       { bg: '#FFEBEE', text: '#B71C1C' },
};

export default function FundingTimeline({ stages, retirementAge, lifeExpectancy }: Props) {
  if (stages.length === 0) return null;

  const totalYears = lifeExpectancy - retirementAge;
  if (totalYears <= 0) return null;

  return (
    <div
      style={{
        background: 'var(--tds-white)',
        borderRadius: 16,
        padding: '20px 20px 16px',
        marginBottom: 20,
        border: '1px solid var(--tds-gray-100)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)', marginBottom: 14 }}>
        자금 조달 순서
      </div>

      {/* 타임라인 바 */}
      <div
        style={{
          display: 'flex',
          height: 28,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        {stages.map((stage, i) => {
          const from = stage.fromAge;
          const to = stage.toAge ?? lifeExpectancy;
          const widthPct = ((to - from) / totalYears) * 100;
          if (widthPct <= 0) return null;
          const colors = BUCKET_COLORS[stage.bucketType];
          return (
            <div
              key={i}
              title={`${stage.label}: ${from}세~${stage.toAge ? `${to}세` : '기대수명'}`}
              style={{
                width: `${widthPct}%`,
                background: colors.bg,
                borderRight: i < stages.length - 1 ? '1px solid rgba(0,0,0,0.06)' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 4px',
                }}
              >
                {widthPct > 8 ? stage.label : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        {stages.map((stage, i) => {
          const colors = BUCKET_COLORS[stage.bucketType];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: colors.bg,
                  border: `1px solid ${colors.text}40`,
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--tds-gray-500)' }}>
                {stage.label}
                {' '}
                <span style={{ color: 'var(--tds-gray-400)' }}>
                  {stage.fromAge}세{stage.toAge ? `~${stage.toAge}세` : '+'}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
