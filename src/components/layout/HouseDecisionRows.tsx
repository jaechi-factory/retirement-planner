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
        className="house-decision-row-metric-label"
        style={{
          fontSize: 'var(--result-text-meta)',
          color: 'var(--result-text-faint-color)',
          lineHeight: 1.45,
        }}
      >
        {label}
      </span>
      <span
        className="house-decision-row-metric-value"
        style={{
          fontSize: 'var(--result-text-title)',
          fontWeight: selected ? 600 : 700,
          color: selected ? 'var(--result-text-body-color)' : 'var(--result-text-value-strong-color)',
          lineHeight: 1.35,
        }}
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
              boxShadow: selected
                ? 'inset 4px 0 0 var(--result-accent-strong), inset 0 0 0 1px rgba(49, 130, 246, 0.22)'
                : (hovered ? 'inset 2px 0 0 var(--result-border-strong)' : 'none'),
              transition: 'background-color 0.12s ease, box-shadow 0.12s ease',
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
                      fontSize: 'var(--result-text-title)',
                      fontWeight: selected ? 700 : 600,
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
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--result-text-faint-color)',
                        letterSpacing: '0.01em',
                        padding: '1px 6px',
                        borderRadius: 999,
                        border: '1px solid var(--result-border-subtle)',
                        background: 'var(--result-surface-soft)',
                      }}
                    >
                      추천
                    </span>
                  )}
                  {disabled && (
                    <span style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-faint-color)', lineHeight: 1.4 }}>
                      계산 불가
                    </span>
                  )}
                </div>

                <div className="house-decision-row-metrics">
                  <MetricCell label="시작 시점" value={row.startAgeText} selected={selected} />
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
                  fontSize: 'var(--result-text-meta)',
                  color: 'var(--result-text-meta-color)',
                  lineHeight: 1.55,
                }}
              >
                <div>마지막에 남는 돈 {row.lastRemainingMoneyText}</div>
                {row.houseCashSupportText && <div>{row.houseCashSupportText}</div>}
              </div>
            )}

            {!row.isSelectable && row.disabledReason && (
              <div
                style={{
                  borderTop: '1px solid var(--result-border-subtle)',
                  padding: '8px 12px',
                  fontSize: 'var(--result-text-meta)',
                  color: 'var(--result-text-faint-color)',
                  lineHeight: 1.5,
                }}
              >
                {row.disabledReason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
