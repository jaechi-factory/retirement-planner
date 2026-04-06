interface InsightLinesSectionProps {
  lines: [string, string, string];
}

export default function InsightLinesSection({ lines }: InsightLinesSectionProps) {
  return (
    <section
      style={{
        borderRadius: 14,
        border: '1px solid var(--ux-border-strong)',
        background: 'var(--ux-surface)',
        padding: '14px 16px',
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {lines.map((line, index) => (
        <div
          key={`insight-line-${index}`}
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--ux-text-base)',
          }}
        >
          {line}
        </div>
      ))}
    </section>
  );
}
