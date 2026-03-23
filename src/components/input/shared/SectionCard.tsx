
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
        <h3
          style={{
            margin: subtitle ? '0 0 3px 0' : '0',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--tds-gray-900)',
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--tds-gray-400)', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}
