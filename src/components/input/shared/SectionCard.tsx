
interface Props {
  title: string;
  children: React.ReactNode;
}

export default function SectionCard({ title, children }: Props) {
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
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--tds-gray-900)',
        }}
      >
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}
