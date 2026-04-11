import { useState } from 'react';
import type { HouseDecisionRowVM, HouseDecisionStrategy } from './houseDecisionVM';

interface HouseDecisionRowsProps {
  rows: HouseDecisionRowVM[];
  onSelectStrategy: (strategy: HouseDecisionStrategy) => void;
}

function MetricCell({
  label,
  value,
  selected,
}: {
  label: string;
  value: string;
  selected: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span
        style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)', lineHeight: 1.45, display: 'block' }}
        className="house-decision-row-metric-label"
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: selected ? 500 : 700,
          color: selected ? 'var(--result-text-body-color)' : 'var(--result-text-value-strong-color)',
          lineHeight: 1.35,
          display: 'block',
        }}
        className="house-decision-row-metric-value"
      >
        {value}
      </span>
    </div>
  );
}

export default function HouseDecisionRows({ rows, onSelectStrategy }: HouseDecisionRowsProps) {
  const [hoveredStrategy, setHoveredStrategy] = useState<HouseDecisionStrategy | null>(null);

  return (
    <div
      className="house-decision-rows"
      style={{
        border: '1px solid var(--result-border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      {rows.map((row, index) => {
        const selected = row.isSelected;
        const disabled = !row.isSelectable;
        const hovered = hoveredStrategy === row.strategy && !disabled;

        return (
          <div
            key={row.strategy}
            style={{
              borderBottom: index < rows.length - 1 ? '1px solid var(--result-border-subtle)' : 'none',
              background: selected ? '#E1EDFF' : (hovered ? 'var(--result-surface-base)' : 'transparent'),
              transition: 'background-color 0.12s ease',
            }}
          >
            <button
              type="button"
              onClick={() => !disabled && onSelectStrategy(row.strategy)}
              onMouseEnter={() => !disabled && setHoveredStrategy(row.strategy)}
              onMouseLeave={() => setHoveredStrategy((current) => (current === row.strategy ? null : current))}
              disabled={disabled}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.65 : 1,
                padding: '12px 12px',
                position: 'relative',
              }}
            >
              <div style={{ paddingRight: disabled ? 0 : 44 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: selected ? 700 : 500,
                      color: selected ? 'var(--result-accent-strong)' : 'var(--result-text-body-color)',
                      lineHeight: 1.35,
                      wordBreak: 'keep-all',
                    }}
                  >
                    {row.strategyLabel}
                  </span>
                  {row.isRecommended && (
                    <span
                      style={{
                        color: 'var(--result-text-faint-color)',
                        border: '1px solid var(--result-border-subtle)',
                        background: 'var(--result-surface-soft)',
                        borderRadius: 999,
                        padding: '1px 6px',
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                        display: 'inline-block',
                      }}
                    >
                      추천
                    </span>
                  )}
                  {disabled && (
                    <span style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)' }}>
                      계산 불가
                    </span>
                  )}
                </div>

                <div className="house-decision-row-metrics">
                  <MetricCell label={row.startAgeLabel} value={row.startAgeText} selected={selected} />
                  <MetricCell label="가능 월생활비" value={row.sustainableMonthlyText} selected={selected} />
                  <MetricCell label="유지 가능 나이" value={row.survivalAgeText} selected={selected} />
                </div>
              </div>

              {!disabled && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 36,
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 20,
                    lineHeight: 1,
                    color: selected ? 'var(--result-accent-strong)' : (hovered ? 'var(--result-text-meta-color)' : 'var(--result-text-faint-color)'),
                    fontWeight: 700,
                  }}
                >
                  ›
                </span>
              )}
            </button>

            {row.isSelectable && selected && (
              <div
                style={{
                  borderTop: '1px solid var(--result-border-subtle)',
                  padding: '8px 12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)', lineHeight: 1.55, display: 'block' }}>
                  마지막에 남는 돈 {row.lastRemainingMoneyText}
                </span>
                {row.houseCashSupportText && (
                  <span style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)', lineHeight: 1.55, display: 'block' }}>
                    {row.houseCashSupportText}
                  </span>
                )}
              </div>
            )}

            {!row.isSelectable && row.disabledReason && (
              <div
                style={{
                  borderTop: '1px solid var(--result-border-subtle)',
                  padding: '8px 12px',
                }}
              >
                <span style={{ fontSize: 14, color: 'rgba(36,39,46,0.64)', lineHeight: 1.5, display: 'block' }}>
                  {row.disabledReason}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
