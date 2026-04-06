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
          paddingLeft: '1.2em',
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
            }}
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
