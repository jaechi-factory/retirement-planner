/** PensionSection 하위 카드들이 공유하는 소형 컴포넌트 */

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {children}
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: 'rgba(36,39,46,0.08)', margin: '10px 0' }} />;
}

export function TextBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        fontSize: 14,
        color: 'rgba(36,39,46,0.64)',
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'Pretendard, sans-serif',
      }}
    >
      {children}
    </button>
  );
}

export function ModeLabel({ text }: { text: string }) {
  return (
    <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(36,39,46,0.64)' }}>
      {text}
    </span>
  );
}
