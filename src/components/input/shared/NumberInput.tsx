import { useState } from 'react';
import { TextField, TextFieldContent, Typography } from '@wanteddev/wds';

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

  const displayValue = focused
    ? draft
    : (value === 0 ? '' : value.toLocaleString('ko-KR'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <Typography
        as="label"
        variant="label2"
        weight="medium"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--neutral-500)',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </Typography>
      <TextField
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder="0"
        trailingContent={
          <TextFieldContent variant="text">
            <span style={{ color: 'var(--neutral-400)', fontSize: 14 }}>{unit}</span>
          </TextFieldContent>
        }
        style={{
          '--wds-text-field-background': 'var(--neutral-50)',
          '--wds-text-field-border-color': 'var(--neutral-150)',
          '--wds-text-field-border-radius': 'var(--radius-md)',
        } as React.CSSProperties}
      />
      {hint && (
        <Typography
          variant="caption1"
          style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--neutral-400)',
            lineHeight: 1.5,
          }}
        >
          {hint}
        </Typography>
      )}
    </div>
  );
}
