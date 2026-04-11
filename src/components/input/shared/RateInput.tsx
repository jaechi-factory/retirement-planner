import { useState } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (val: number) => void;
  hint?: string;
}

export default function RateInput({ label, value, onChange, hint }: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value === 0 ? '' : String(value));

  const handleFocus = () => {
    setFocused(true);
    setDraft(value === 0 ? '' : String(value));
  };

  const handleBlur = () => {
    setFocused(false);
    const num = draft === '' ? 0 : parseFloat(draft);
    const clamped = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    setDraft(clamped === 0 ? '' : String(clamped));
    onChange(clamped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
    setDraft(cleaned);
    if (cleaned !== '' && !cleaned.endsWith('.')) {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 0 && num <= 100) onChange(num);
    }
  };

  const isEmpty = value === 0 && !focused;
  const displayValue = focused ? draft : (value === 0 ? '' : String(value));

  const borderColor = focused
    ? 'var(--fig-input-border-focus)'
    : isEmpty
      ? 'var(--fig-input-border-empty)'
      : 'var(--fig-input-border-filled)';

  const textColor = isEmpty ? 'var(--fig-placeholder-color)' : 'var(--fig-label-color)';
  const fontWeight = isEmpty ? 400 : 600;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* 라벨 */}
      <label
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--fig-label-color)',
          letterSpacing: '0.12px',
          lineHeight: 1,
          marginBottom: 16,
          display: 'block',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </label>

      {/* Input 컨테이너 */}
      <div
        style={{
          height: 54,
          borderRadius: 16,
          border: `2px solid ${borderColor}`,
          background: '#ffffff',
          boxShadow: focused ? 'var(--fig-input-shadow-focus)' : 'none',
          display: 'flex',
          alignItems: 'center',
          padding: '11px 14px',
          gap: 8,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxSizing: 'border-box',
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder={isEmpty ? '0' : ''}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 16,
            fontWeight,
            color: textColor,
            fontFamily: 'Pretendard, sans-serif',
            letterSpacing: '0.0798px',
            paddingLeft: 4,
            minWidth: 0,
          }}
        />
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: isEmpty ? 'var(--fig-placeholder-color)' : 'var(--fig-label-color)',
            fontFamily: 'Pretendard, sans-serif',
            letterSpacing: '0.0798px',
            flexShrink: 0,
            lineHeight: '17px',
          }}
        >
          %
        </span>
      </div>

      {/* 힌트 */}
      {hint && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--fig-hint-color)',
            lineHeight: 1.5,
            marginTop: 8,
            fontFamily: 'Pretendard, sans-serif',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
