
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
        background: 'var(--tds-gray-50)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--tds-gray-500)' }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: valueColor ?? 'var(--tds-gray-900)',
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--tds-gray-300)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
