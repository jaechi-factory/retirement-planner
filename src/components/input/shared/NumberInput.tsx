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
  // 타이핑 중간 상태를 로컬에서 관리 — 외부 value와 분리
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
    // max만 클램핑, min은 강제하지 않음 (빈 칸 허용)
    const clamped = max !== undefined ? Math.min(max, num) : num;
    setDraft(clamped === 0 ? '' : String(clamped));
    onChange(clamped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 숫자와 콤마만 허용, 콤마는 제거
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setDraft(raw);
    // 완성된 숫자면 바로 onChange 호출 (실시간 계산)
    if (raw !== '') {
      const num = parseInt(raw, 10);
      if (max !== undefined && num > max) return;
      onChange(num);
    }
  };

  const displayValue = focused
    ? draft
    : (value === 0 ? '' : value.toLocaleString('ko-KR'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <label style={{ fontSize: 13, color: 'var(--tds-gray-500)', fontWeight: 600 }}>
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
          inputMode="numeric"
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
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
          placeholder="0"
        />
        <span style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: 13, color: 'var(--tds-gray-500)', marginLeft: 4 }}>
          {unit}
        </span>
      </div>
      {hint && (
        <p style={{ fontSize: 12, color: 'var(--tds-gray-400, #B0B8C1)', margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
