import { Typography } from '@wanteddev/wds';

interface Props {
  title: string;
  subtitle?: string;
  tier?: 1 | 2;
  children: React.ReactNode;
}

export default function SectionCard({ title, subtitle, tier = 2, children }: Props) {
  const isPrimary = tier === 1;

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        borderRadius: 16,
        border: '1px solid rgba(36,39,46,0.06)',
        boxShadow: 'var(--shadow-card)',
        padding: isPrimary ? '24px 22px 28px' : '20px 22px 24px',
        marginBottom: 14,
      }}
    >
      {/* 섹션 헤더 */}
      <div
        style={{
          marginBottom: isPrimary ? 20 : 16,
          paddingBottom: isPrimary ? 16 : 12,
          borderBottom: '1px solid rgba(36,39,46,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPrimary && (
            <div
              style={{
                width: 4,
                height: 18,
                borderRadius: 2,
                background: 'var(--palette-yellow)',
                flexShrink: 0,
              }}
            />
          )}
          <Typography
            as="h3"
            variant={isPrimary ? 'headline1' : 'headline2'}
            weight="bold"
            color="semantic.label.normal"
            style={{
              margin: 0,
              letterSpacing: '-0.3px',
              fontSize: isPrimary ? 16 : 14,
            }}
          >
            {title}
          </Typography>
        </div>
        {subtitle && (
          <Typography
            variant="caption1"
            color="semantic.label.alternative"
            style={{
              margin: isPrimary ? '5px 0 0 12px' : '4px 0 0',
              lineHeight: 1.45,
              display: 'block',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}
