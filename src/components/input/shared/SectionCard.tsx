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
        borderRadius: 20,
        padding: isPrimary ? '22px 20px 26px' : '18px 20px 22px',
        marginBottom: 16,
      }}
    >
      <div style={{ marginBottom: isPrimary ? 18 : 14 }}>
        <Typography
          as="h3"
          variant={isPrimary ? 'headline1' : 'headline2'}
          weight="bold"
          color="semantic.label.normal"
          style={{
            margin: subtitle ? '0 0 4px 0' : '0',
            letterSpacing: '-0.2px',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption1" color="semantic.label.alternative" style={{ margin: 0, lineHeight: 1.4 }}>
            {subtitle}
          </Typography>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}
