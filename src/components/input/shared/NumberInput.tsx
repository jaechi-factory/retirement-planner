import { useState } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  hint?: string;
}

export default function NumberInput({
  label, value, onChange, unit = '만원', max, hint,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value === 0 ? '' : String(value));

  const handleFocus = () => {
    setFocused(true);
    setDraft(value === 0 ? '' : String(value));
  };

  const handleBlur = () => {
    setFocused(false);
    if (draft === '') {
      onChange(0);
      return;
    }
    const num = parseInt(draft.replace(/,/g, ''), 10);
    if (isNaN(num)) {
      setDraft('');
      onChange(0);
      return;
    }
    const clamped = max !== undefined ? Math.min(max, num) : num;
    setDraft(clamped === 0 ? '' : String(clamped));
    onChange(clamped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setDraft(raw);
    if (raw !== '') {
      const num = parseInt(raw, 10);
      if (max !== undefined && num > max) return;
      onChange(num);
    }
  };

  const isEmpty = value === 0 && !focused;
  const displayValue = focused
    ? draft
    : (value === 0 ? '' : value.toLocaleString('ko-KR'));

  // border 색상: focused → orange, filled → grey-900, empty → grey-400
  const borderColor = focused
    ? 'var(--fig-input-border-focus)'
    : isEmpty
      ? 'var(--fig-input-border-empty)'
      : 'var(--fig-input-border-filled)';

  const textColor = isEmpty ? 'var(--fig-placeholder-color)' : 'var(--fig-label-color)';
  const fontWeight = isEmpty ? 400 : 600;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
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
          inputMode="numeric"
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
          {unit}
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
