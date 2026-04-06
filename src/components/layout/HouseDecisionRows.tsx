import type { HouseDecisionRowVM, HouseDecisionStrategy } from './houseDecisionVM';

interface HouseDecisionRowsProps {
  rows: HouseDecisionRowVM[];
  onSelectStrategy: (strategy: HouseDecisionStrategy) => void;
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, color: 'var(--ux-text-subtle)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ux-text-strong)', lineHeight: 1.4 }}>{value}</span>
    </div>
  );
}

export default function HouseDecisionRows({ rows, onSelectStrategy }: HouseDecisionRowsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row) => {
        const selected = row.isSelected;
        const disabled = !row.isSelectable;

        return (
          <div
            key={row.strategy}
            style={{
              borderRadius: 10,
              border: `1px solid ${selected ? 'var(--ux-accent)' : 'var(--ux-border)'}`,
              background: selected ? 'var(--ux-accent-soft)' : 'var(--ux-surface-muted)',
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
                opacity: disabled ? 0.6 : 1,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ux-text-strong)' }}>{row.strategyLabel}</span>
                  {row.isRecommended && (
                    <span
                      style={{
                        borderRadius: 999,
                        padding: '2px 7px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--ux-accent)',
                        background: 'var(--ux-accent-soft)',
                        border: '1px solid var(--ux-accent-soft)',
                      }}
                    >
                      추천
                    </span>
                  )}
                </div>
                {disabled && <span style={{ fontSize: 11, color: 'var(--ux-text-subtle)' }}>선택 불가</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <MetricCell label="시작 시점" value={row.startAgeText} />
                <MetricCell label="가능 월생활비" value={row.sustainableMonthlyText} />
                <MetricCell label="유지 가능 나이" value={row.survivalAgeText} />
              </div>
            </button>

            {row.isSelectable && selected && (
              <div
                style={{
                  borderTop: '1px solid var(--ux-border)',
                  padding: '10px 14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--ux-text-base)',
                  lineHeight: 1.6,
                }}
              >
                <div>{row.detailHeadline}</div>
                <div>마지막에 남는 돈 {row.lastRemainingMoneyText}</div>
                {row.houseCashSupportText && <div>{row.houseCashSupportText}</div>}
              </div>
            )}

            {!row.isSelectable && row.disabledReason && (
              <div style={{ borderTop: '1px solid var(--ux-border)', padding: '10px 14px', fontSize: 12, color: 'var(--ux-text-subtle)' }}>
                {row.disabledReason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
