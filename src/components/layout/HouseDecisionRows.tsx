import type { HouseDecisionRowVM, HouseDecisionStrategy } from './houseDecisionVM';

interface HouseDecisionRowsProps {
  rows: HouseDecisionRowVM[];
  onSelectStrategy: (strategy: HouseDecisionStrategy) => void;
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--ux-text-subtle)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-base)', lineHeight: 1.35 }}>{value}</span>
    </div>
  );
}

export default function HouseDecisionRows({ rows, onSelectStrategy }: HouseDecisionRowsProps) {
  return (
    <div
      style={{
        border: '1px solid var(--ux-border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--ux-surface)',
      }}
    >
      {rows.map((row, index) => {
        const selected = row.isSelected;
        const disabled = !row.isSelectable;

        return (
          <div
            key={row.strategy}
            style={{
              borderBottom: index < rows.length - 1 ? '1px solid var(--ux-border)' : 'none',
              background: selected ? 'var(--ux-surface-muted)' : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => !disabled && onSelectStrategy(row.strategy)}
              disabled={disabled}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.65 : 1,
                padding: '9px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ux-text-strong)' }}>{row.strategyLabel}</span>
                  {row.isRecommended && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ux-accent)' }}>추천</span>}
                </div>
                {disabled && <span style={{ fontSize: 11, color: 'var(--ux-text-subtle)' }}>계산 불가</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                <MetricCell label="시작 시점" value={row.startAgeText} />
                <MetricCell label="가능 월생활비" value={row.sustainableMonthlyText} />
                <MetricCell label="유지 가능 나이" value={row.survivalAgeText} />
              </div>
            </button>

            {row.isSelectable && selected && (
              <div
                style={{
                  borderTop: '1px solid var(--ux-border)',
                  padding: '7px 12px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  fontSize: 12,
                  color: 'var(--ux-text-base)',
                  lineHeight: 1.55,
                }}
              >
                <div>마지막에 남는 돈 {row.lastRemainingMoneyText}</div>
                {row.houseCashSupportText && <div>{row.houseCashSupportText}</div>}
              </div>
            )}

            {!row.isSelectable && row.disabledReason && (
              <div style={{ borderTop: '1px solid var(--ux-border)', padding: '7px 12px', fontSize: 11, color: 'var(--ux-text-subtle)' }}>
                {row.disabledReason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
