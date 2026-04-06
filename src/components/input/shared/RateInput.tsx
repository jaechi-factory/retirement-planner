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
    // 숫자, 소수점만 허용
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    // 소수점 중복 방지
    const parts = raw.split('.');
    const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
    setDraft(cleaned);
    if (cleaned !== '' && !cleaned.endsWith('.')) {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 0 && num <= 100) onChange(num);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <label style={{ fontSize: 13, color: 'var(--tds-gray-500)', fontWeight: 500 }}>
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: `1.5px solid ${focused ? 'var(--tds-blue-500)' : 'var(--tds-gray-100)'}`,
          borderRadius: 8,
          background: 'var(--tds-white)',
          padding: '0 12px',
          height: 44,
          transition: 'border-color 0.15s',
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={focused ? draft : (value === 0 ? '' : String(value))}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder="0"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            fontSize: 15,
            fontFamily: 'inherit',
            color: 'var(--tds-gray-900)',
            background: 'transparent',
          }}
        />
        <span style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: 13, color: 'var(--tds-gray-500)', marginLeft: 2 }}>%</span>
      </div>
      {hint && (
        <p style={{ fontSize: 12, color: 'var(--tds-gray-400, #B0B8C1)', margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
