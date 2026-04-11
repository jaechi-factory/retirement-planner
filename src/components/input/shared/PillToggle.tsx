interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
}

/** Figma 스펙 pill 토글 — 아니요/네, 없어요/있어요 등 */
export default function PillToggle({
  label,
  value,
  onChange,
  trueLabel = '네',
  falseLabel = '아니요',
}: Props) {
  const pills = [
    { val: false, label: falseLabel },
    { val: true,  label: trueLabel },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--fig-label-color)',
          letterSpacing: '0.12px',
          lineHeight: 1,
          display: 'block',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {pills.map((pill) => {
          const selected = value === pill.val;
          return (
            <button
              key={String(pill.val)}
              type="button"
              onClick={() => onChange(pill.val)}
              style={{
                width: 63,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: selected ? '#333d4b' : 'rgba(112,115,124,0.08)',
                color: selected ? '#ffffff' : 'rgba(46,47,51,0.88)',
                fontSize: 14,
                fontWeight: selected ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'Pretendard, sans-serif',
                transition: 'background 0.15s, color 0.15s',
                flexShrink: 0,
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
