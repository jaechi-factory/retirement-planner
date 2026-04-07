import { useState } from 'react';
import { TextField, TextFieldContent, Typography } from '@wanteddev/wds';

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
        inputMode="decimal"
        value={focused ? draft : (value === 0 ? '' : String(value))}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder="0"
        trailingContent={
          <TextFieldContent variant="text">
            <span style={{ color: 'var(--neutral-400)', fontSize: 14 }}>%</span>
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
