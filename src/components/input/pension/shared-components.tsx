/** PensionSection 하위 카드들이 공유하는 소형 컴포넌트 */

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {children}
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '10px 0' }} />;
}

export function TextBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, color: 'var(--tds-gray-400)',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, textDecoration: 'underline',
      }}
    >
      {children}
    </button>
  );
}

export function ModeLabel({ text }: { text: string }) {
  return (
    <span style={{ fontSize: 11, color: 'var(--tds-gray-400)', fontWeight: 600 }}>
      {text}
    </span>
  );
}
