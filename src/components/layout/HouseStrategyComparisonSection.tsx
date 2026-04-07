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
import { Divider, Typography } from '@wanteddev/wds';
import type { PropertyOptionResult } from '../../types/calculationV2';
import { buildHouseDecisionRowsVM, type HouseDecisionStrategy } from './houseDecisionVM';
import HouseDecisionRows from './HouseDecisionRows';
import { fmtKRW, fmtKRWAxis } from '../../utils/format';
import { PROPERTY_STRATEGY_LABELS } from '../../engine/propertyStrategiesV2';

interface HouseStrategyComparisonSectionProps {
  hasRealEstate: boolean;
  propertyOptions: PropertyOptionResult[];
  selectedStrategy: HouseDecisionStrategy;
  lifeExpectancy: number;
  onSelectStrategy: (strategy: HouseDecisionStrategy) => void;
}

const STRATEGY_CHART_LABELS: Record<string, string> = {
  keep: '유지',
  secured_loan: '대출',
  sell: '매각',
};

const STRATEGY_COLORS: Record<string, string> = {
  keep: 'var(--result-border-strong)',
  secured_loan: '#93C5FD',
  sell: 'var(--result-accent-strong)',
};

const STRATEGY_COLORS_RECOMMENDED = 'var(--result-accent-strong)';

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
        background: 'var(--result-surface-base)',
        border: '1px solid var(--result-border-soft)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        lineHeight: 1.6,
        zIndex: 9999,
        position: 'relative',
      }}
    >
      <div style={{ fontWeight: 700, color: 'var(--result-text-strong-color)', marginBottom: 2 }}>
        {PROPERTY_STRATEGY_LABELS[d.strategy as keyof typeof PROPERTY_STRATEGY_LABELS] ?? d.strategy}
      </div>
      <div style={{ color: 'var(--result-text-body-color)' }}>
        가능한 월 생활비: <strong>{fmtKRW(d.sustainableMonthly)}</strong>
      </div>
      <div style={{ color: 'var(--result-text-meta-color)' }}>유지 나이: {d.survivalLabel}</div>
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

  // 그래프용 데이터 — selectable 전략만
  const chartData = propertyOptions
    .filter((opt) => opt.yearlyAggregates.length > 0)
    .map((opt) => ({
      strategy: opt.strategy,
      label: STRATEGY_CHART_LABELS[opt.strategy] ?? opt.strategy,
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
    <section
      style={{
        marginBottom: 'var(--result-space-5)',
        borderRadius: 16,
        border: '1px solid var(--result-border-soft)',
        background: 'var(--result-surface-base)',
        padding: 'var(--result-space-5)',
      }}
    >
      {/* 섹션 헤더 */}
      <div style={{ marginBottom: 'var(--result-space-4)' }}>
        <Typography
          variant="headline1"
          weight="bold"
          style={{ color: 'var(--result-text-strong-color)', display: 'block', marginBottom: 'var(--result-space-1)' }}
        >
          집을 팔거나 대출받는 선택
        </Typography>
        <Typography
          variant="caption1"
          color="semantic.label.alternative"
          style={{ display: 'block', lineHeight: 1.55 }}
        >
          집을 그대로 둘지, 팔지, 담보대출을 받을지 비교해보세요.
        </Typography>
      </div>

      {/* 전략 비교 막대 그래프 */}
      {chartData.length > 0 && (
        <div style={{ marginBottom: 'var(--result-space-4)' }}>
          <Typography
            variant="caption1"
            weight="medium"
            style={{ color: 'var(--result-text-body-color)', display: 'block', marginBottom: 'var(--result-space-2)' }}
          >
            전략별 가능한 월 생활비
          </Typography>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid vertical={false} stroke="var(--result-border-subtle)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'var(--result-text-meta-color)', fontFamily: 'inherit' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmtKRWAxis(v)}
                tick={{ fontSize: 11, fill: 'var(--result-text-faint-color)', fontFamily: 'inherit' }}
                axisLine={false}
                tickLine={false}
                domain={[0, Math.ceil(maxMonthly * 1.2)]}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--result-border-subtle)', opacity: 0.5 }} wrapperStyle={{ zIndex: 9999 }} />
              <Bar dataKey="sustainableMonthly" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.strategy}
                    fill={
                      entry.strategy === selectedStrategy
                        ? STRATEGY_COLORS_RECOMMENDED
                        : (STRATEGY_COLORS[entry.strategy] ?? '#CBD5E1')
                    }
                    opacity={entry.strategy === selectedStrategy ? 1 : 0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 구분선 */}
      <Divider style={{ marginBottom: 'var(--result-space-3)' }} />

      {/* 전략 선택 행 */}
      <Typography
        variant="caption1"
        color="semantic.label.alternative"
        style={{ display: 'block', marginBottom: 'var(--result-space-2)', lineHeight: 1.5 }}
      >
        전략을 누르면 아래 근거 차트가 바뀌어요.
      </Typography>
      <HouseDecisionRows rows={rows} onSelectStrategy={onSelectStrategy} />
    </section>
  );
}
