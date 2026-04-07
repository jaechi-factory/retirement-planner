import { Typography } from '@wanteddev/wds';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function SectionCard({ title, subtitle, children }: Props) {
  return (
    <section
      style={{
        background: 'var(--white)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
        marginBottom: 16,
        border: '1px solid var(--neutral-100)',
        transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
      }}
    >
      {/* Section header */}
      <header style={{ marginBottom: 20 }}>
        <Typography
          as="h3"
          variant="headline2"
          weight="bold"
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--neutral-900)',
            letterSpacing: '-0.015em',
            lineHeight: 1.35,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption1"
            style={{
              display: 'block',
              margin: '4px 0 0',
              fontSize: 13,
              color: 'var(--neutral-400)',
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </header>

      {/* Section content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </section>
  );
}
