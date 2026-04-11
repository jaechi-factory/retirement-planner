import React from 'react';

interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
  children?: React.ReactNode;
}

/**
 * Figma 스펙 pill 토글
 * - 흰색 카드 안에 라벨(왼쪽) + pills(오른쪽) 가로 배치
 * - children 있고 value=true: 카드가 펼쳐져 확장 필드 포함 + 구분선
 */
export default function PillToggle({
  label,
  value,
  onChange,
  trueLabel = '네',
  falseLabel = '아니요',
  children,
}: Props) {
  const isExpanded = value && !!children;

  const pills = [
    { val: false, label: falseLabel },
    { val: true, label: trueLabel },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        padding: isExpanded ? '12px 16px 24px' : '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: isExpanded ? 24 : 0,
      }}
    >
      {/* pill row + 구분선 (expanded 시) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
          <span
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: 600,
              color: '#191f28',
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {label}
          </span>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
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
                    padding: '7px 14px',
                    boxSizing: 'border-box',
                    background: selected ? '#333d4b' : 'rgba(112,115,124,0.08)',
                    color: selected ? '#ffffff' : 'rgba(46,47,51,0.88)',
                    fontSize: 14,
                    fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'Pretendard, sans-serif',
                    letterSpacing: '0.2522px',
                    whiteSpace: 'nowrap',
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

        {/* expanded 시 구분선 */}
        {isExpanded && (
          <div style={{ background: '#d9d9d9', height: 1, width: '100%' }} />
        )}
      </div>

      {/* expanded content */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {children}
        </div>
      )}
    </div>
  );
}
