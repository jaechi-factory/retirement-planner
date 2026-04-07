import { useState } from 'react';
import { ContentBadge, Typography } from '@wanteddev/wds';
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
        color="semantic.label.alternative"
        style={{ lineHeight: 1.45 }}
        className="house-decision-row-metric-label"
      >
        {label}
      </Typography>
      <Typography
        variant="headline2"
        weight={selected ? 'medium' : 'bold'}
        style={{
          color: selected ? 'var(--result-text-body-color)' : 'var(--result-text-value-strong-color)',
          lineHeight: 1.35,
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
                  <Typography
                    variant="headline2"
                    weight={selected ? 'bold' : 'medium'}
                    style={{
                      color: selected ? 'var(--result-accent-strong)' : 'var(--result-text-body-color)',
                      lineHeight: 1.35,
                      wordBreak: 'keep-all',
                    }}
                  >
                    {row.strategyLabel}
                  </Typography>
                  {row.isRecommended && (
                    <ContentBadge
                      variant="outlined"
                      size="xsmall"
                      style={{
                        color: 'var(--result-text-faint-color)',
                        borderColor: 'var(--result-border-subtle)',
                        background: 'var(--result-surface-soft)',
                        borderRadius: 999,
                        padding: '1px 6px',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                      }}
                    >
                      추천
                    </ContentBadge>
                  )}
                  {disabled && (
                    <Typography variant="caption1" color="semantic.label.alternative">
                      계산 불가
                    </Typography>
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
                }}
              >
                <Typography variant="caption1" color="semantic.label.alternative" style={{ lineHeight: 1.55 }}>
                  마지막에 남는 돈 {row.lastRemainingMoneyText}
                </Typography>
                {row.houseCashSupportText && (
                  <Typography variant="caption1" color="semantic.label.alternative" style={{ lineHeight: 1.55 }}>
                    {row.houseCashSupportText}
                  </Typography>
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
                <Typography variant="caption2" color="semantic.label.alternative" style={{ lineHeight: 1.5 }}>
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
