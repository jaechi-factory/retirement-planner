import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Typography } from '@wanteddev/wds';
import type { PropertyOptionResult } from '../../types/calculationV2';
import { buildHouseDecisionRowsVM, type HouseDecisionStrategy } from './houseDecisionVM';
import HouseDecisionRows from './HouseDecisionRows';
import { fmtKRW, fmtKRWAxis } from '../../utils/format';

interface HouseStrategyComparisonSectionProps {
  hasRealEstate: boolean;
  propertyOptions: PropertyOptionResult[];
  selectedStrategy: HouseDecisionStrategy;
  lifeExpectancy: number;
  onSelectStrategy: (strategy: HouseDecisionStrategy) => void;
}

const STRATEGY_DISPLAY_LABELS: Record<string, string> = {
  keep: '그대로 두기',
  secured_loan: '담보대출',
  sell: '팔기',
};

const STRATEGY_COLORS: Record<string, string> = {
  keep: 'var(--neutral-300)',
  secured_loan: '#93C5FD',
  sell: 'var(--brand-accent)',
};

const STRATEGY_COLORS_SELECTED = 'var(--brand-accent)';

interface TooltipPayload {
  value: number;
  payload: {
    strategy: string;
    sustainableMonthly: number;
    failureAge: number | null;
    survivalLabel: string;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1px solid var(--neutral-200)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        fontSize: 13,
        lineHeight: 1.6,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: 'var(--neutral-900)',
          marginBottom: 4,
        }}
      >
        {STRATEGY_DISPLAY_LABELS[d.strategy] ?? d.strategy}
      </div>
      <div style={{ color: 'var(--neutral-600)' }}>
        가능한 월 생활비: <strong style={{ color: 'var(--neutral-900)' }}>{fmtKRW(d.sustainableMonthly)}</strong>
      </div>
      <div style={{ color: 'var(--neutral-500)', fontSize: 12 }}>
        유지 나이: {d.survivalLabel}
      </div>
    </div>
  );
}

export default function HouseStrategyComparisonSection({
  hasRealEstate,
  propertyOptions,
  selectedStrategy,
  lifeExpectancy,
  onSelectStrategy,
}: HouseStrategyComparisonSectionProps) {
  const rows = useMemo(
    () => buildHouseDecisionRowsVM({ propertyOptions, selectedStrategy, lifeExpectancy }),
    [propertyOptions, selectedStrategy, lifeExpectancy],
  );

  const hasSelectableRows = rows.some((row) => row.isSelectable);

  if (!hasRealEstate || !hasSelectableRows) return null;

  // Chart data — only selectable strategies
  const chartData = propertyOptions
    .filter((opt) => opt.yearlyAggregates.length > 0)
    .map((opt) => ({
      strategy: opt.strategy,
      label: STRATEGY_DISPLAY_LABELS[opt.strategy] ?? opt.strategy,
      sustainableMonthly: opt.sustainableMonthly,
      failureAge: opt.failureAge,
      survivalLabel: opt.survivesToLifeExpectancy
        ? `${lifeExpectancy}세까지`
        : opt.failureAge !== null
          ? `${opt.failureAge}세`
          : '계산 불가',
      isRecommended: opt.isRecommended,
    }));

  const maxMonthly = Math.max(...chartData.map((d) => d.sustainableMonthly), 0);

  return (
    <section style={{ marginBottom: 40 }}>
      {/* Section label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--neutral-400)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        집을 팔거나 대출받는 선택
      </div>

      {/* Main card */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-150)',
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div
          style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid var(--neutral-100)',
          }}
        >
          <Typography
            variant="headline1"
            weight="bold"
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--neutral-900)',
              marginBottom: 4,
            }}
          >
            전략 비교
          </Typography>
          <Typography
            variant="caption1"
            style={{
              fontSize: 13,
              color: 'var(--neutral-400)',
              lineHeight: 1.5,
            }}
          >
            집을 그대로 둘지, 팔지, 담보대출을 받을지 비교해보세요.
          </Typography>
        </div>

        {/* Chart section */}
        {chartData.length > 0 && (
          <div style={{ padding: '24px' }}>
            <Typography
              variant="caption1"
              weight="medium"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--neutral-500)',
                marginBottom: 12,
                display: 'block',
              }}
            >
              전략별 가능한 월 생활비
            </Typography>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="25%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--neutral-100)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                    fill: 'var(--neutral-500)',
                    fontFamily: 'Pretendard',
                    fontWeight: 500,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => fmtKRWAxis(v)}
                  tick={{
                    fontSize: 11,
                    fill: 'var(--neutral-400)',
                    fontFamily: 'Pretendard',
                  }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, Math.ceil(maxMonthly * 1.2)]}
                  width={52}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'var(--neutral-100)', opacity: 0.5 }}
                />
                <Bar dataKey="sustainableMonthly" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.strategy}
                      fill={
                        entry.strategy === selectedStrategy
                          ? STRATEGY_COLORS_SELECTED
                          : (STRATEGY_COLORS[entry.strategy] ?? 'var(--neutral-300)')
                      }
                      opacity={entry.strategy === selectedStrategy ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--neutral-100)', margin: '0 24px' }} />

        {/* Strategy selection rows */}
        <div style={{ padding: '20px 24px 24px' }}>
          <Typography
            variant="caption1"
            style={{
              fontSize: 12,
              color: 'var(--neutral-400)',
              marginBottom: 12,
              display: 'block',
            }}
          >
            전략을 선택하면 아래 근거 차트가 바뀌어요.
          </Typography>
          <HouseDecisionRows rows={rows} onSelectStrategy={onSelectStrategy} />
        </div>
      </div>
    </section>
  );
}
