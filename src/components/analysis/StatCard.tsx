
interface Props {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

export default function StatCard({ label, value, sub, valueColor }: Props) {
  return (
    <div
      style={{
        background: 'var(--surface-card-soft)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: valueColor ?? 'var(--text-strong)',
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-faint)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
