import { Typography } from '@wanteddev/wds';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function SectionCard({ title, subtitle, children }: Props) {
  return (
    <div
      style={{
        background: 'var(--tds-white)',
        borderRadius: 16,
        padding: '20px 20px 24px',
        marginBottom: 12,
        border: '1px solid var(--tds-gray-100)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Typography as="h3" variant="headline2" weight="bold" color="semantic.label.normal" style={{ margin: subtitle ? '0 0 3px 0' : '0' }}>
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
