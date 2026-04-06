interface InsightLinesSectionProps {
  lines: [string, string, string];
}

export default function InsightLinesSection({ lines }: InsightLinesSectionProps) {
  return (
    <section
      style={{
        marginBottom: 'var(--result-space-5)',
      }}
    >
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {lines.map((line, index) => (
          <li
            key={`insight-line-${index}`}
            style={{
              fontSize: 'var(--result-text-body)',
              lineHeight: 1.62,
              color: 'var(--result-text-body-color)',
              padding: 'var(--result-space-2) 0',
              borderBottom: index < lines.length - 1 ? '1px solid var(--result-border-soft)' : 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--result-space-2)',
            }}
          >
            <span
              aria-hidden
              style={{
                fontSize: 'var(--result-text-body)',
                lineHeight: 1.62,
                color: 'var(--result-text-body-color)',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              •
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
