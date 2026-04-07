import { useState } from 'react';
import { Typography } from '@wanteddev/wds';
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
      <Typography
        variant="caption2"
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--neutral-400)',
          lineHeight: 1.4,
        }}
        className="house-decision-row-metric-label"
      >
        {label}
      </Typography>
      <Typography
        variant="headline2"
        weight={selected ? 'bold' : 'medium'}
        style={{
          fontSize: 15,
          fontWeight: selected ? 700 : 600,
          color: selected ? 'var(--neutral-900)' : 'var(--neutral-700)',
          lineHeight: 1.35,
          fontVariantNumeric: 'tabular-nums',
        }}
        className="house-decision-row-metric-value"
      >
        {value}
      </Typography>
    </div>
  );
}

export default function HouseDecisionRows({ rows, onSelectStrategy }: HouseDecisionRowsProps) {
  const [hoveredStrategy, setHoveredStrategy] = useState<HouseDecisionStrategy | null>(null);

  return (
    <div
      className="house-decision-rows"
      style={{
        border: '1px solid var(--neutral-150)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--neutral-50)',
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
              borderBottom: index < rows.length - 1 ? '1px solid var(--neutral-150)' : 'none',
              background: selected
                ? 'var(--white)'
                : hovered
                  ? 'var(--white)'
                  : 'transparent',
              boxShadow: selected
                ? 'inset 4px 0 0 var(--brand-accent)'
                : hovered
                  ? 'inset 2px 0 0 var(--neutral-300)'
                  : 'none',
              transition: 'background-color var(--transition-fast), box-shadow var(--transition-fast)',
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
                opacity: disabled ? 0.5 : 1,
                padding: '16px 20px',
                position: 'relative',
              }}
            >
              <div style={{ paddingRight: disabled ? 0 : 40 }}>
                {/* Strategy name and badges */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Typography
                    variant="headline2"
                    weight={selected ? 'bold' : 'medium'}
                    style={{
                      fontSize: 15,
                      fontWeight: selected ? 700 : 600,
                      color: selected ? 'var(--brand-accent)' : 'var(--neutral-700)',
                      lineHeight: 1.35,
                      wordBreak: 'keep-all',
                    }}
                  >
                    {row.strategyLabel}
                  </Typography>
                  {row.isRecommended && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--brand-accent)',
                        background: 'var(--result-accent-soft)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      추천
                    </span>
                  )}
                  {disabled && (
                    <Typography
                      variant="caption1"
                      style={{
                        fontSize: 12,
                        color: 'var(--neutral-400)',
                      }}
                    >
                      계산 불가
                    </Typography>
                  )}
                </div>

                {/* Metrics row */}
                <div className="house-decision-row-metrics">
                  <MetricCell label="시작 시점" value={row.startAgeText} selected={selected} />
                  <MetricCell label="가능 월생활비" value={row.sustainableMonthlyText} selected={selected} />
                  <MetricCell label="유지 가능 나이" value={row.survivalAgeText} selected={selected} />
                </div>
              </div>

              {/* Arrow indicator */}
              {!disabled && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 32,
                    height: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 20,
                    lineHeight: 1,
                    color: selected
                      ? 'var(--brand-accent)'
                      : hovered
                        ? 'var(--neutral-500)'
                        : 'var(--neutral-300)',
                    fontWeight: 500,
                    transition: 'color var(--transition-fast)',
                  }}
                >
                  {'>'}
                </span>
              )}
            </button>

            {/* Selected state details */}
            {row.isSelectable && selected && (
              <div
                style={{
                  borderTop: '1px solid var(--neutral-100)',
                  padding: '12px 20px 16px',
                  background: 'var(--neutral-50)',
                }}
              >
                <Typography
                  variant="caption1"
                  style={{
                    fontSize: 13,
                    color: 'var(--neutral-500)',
                    lineHeight: 1.55,
                  }}
                >
                  마지막에 남는 돈 {row.lastRemainingMoneyText}
                </Typography>
                {row.houseCashSupportText && (
                  <Typography
                    variant="caption1"
                    style={{
                      fontSize: 13,
                      color: 'var(--neutral-500)',
                      lineHeight: 1.55,
                      display: 'block',
                      marginTop: 4,
                    }}
                  >
                    {row.houseCashSupportText}
                  </Typography>
                )}
              </div>
            )}

            {/* Disabled state reason */}
            {!row.isSelectable && row.disabledReason && (
              <div
                style={{
                  borderTop: '1px solid var(--neutral-100)',
                  padding: '10px 20px',
                }}
              >
                <Typography
                  variant="caption2"
                  style={{
                    fontSize: 12,
                    color: 'var(--neutral-400)',
                    lineHeight: 1.5,
                  }}
                >
                  {row.disabledReason}
                </Typography>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
