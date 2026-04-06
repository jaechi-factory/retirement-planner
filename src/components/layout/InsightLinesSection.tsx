interface InsightLinesSectionProps {
  lines: [string, string, string];
}

export default function InsightLinesSection({ lines }: InsightLinesSectionProps) {
  return (
    <section
      style={{
        marginBottom: 'var(--result-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {lines.map((line, index) => (
        <div
          key={`insight-line-${index}`}
          style={{
            fontSize: 'var(--result-text-body)',
            lineHeight: 1.6,
            color: 'var(--result-text-body-color)',
            padding: 'var(--result-space-2) 0',
            borderBottom: index < lines.length - 1 ? '1px solid var(--result-border-soft)' : 'none',
          }}
        >
          {line}
        </div>
      ))}
    </section>
  );
}
