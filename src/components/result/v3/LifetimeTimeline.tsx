import type { YearlyAggregateV2, CalculationResultV2, PropertyOptionResult } from '../../../types/calculationV2';
import type { PlannerInputs } from '../../../types/inputs';
import { fmtKRW } from '../../../utils/format';
import { extractEvents, buildGroupedRows } from '../../../engine/timelineBuilder';
import type {
  EventType,
  TimelineEvent,
  GroupedRow,
  KeyDecisionEvent,
  KeyDecisionEventKind,
} from '../../../engine/timelineBuilder';

interface LifetimeTimelineProps {
  detailYearlyAggregates: YearlyAggregateV2[];
  summary: CalculationResultV2['summary'];
  propertyOptions: PropertyOptionResult[];
  inputs: PlannerInputs;
  timelineStrategyMode: 'recommended' | 'selected';
  selectedPropertyStrategy: PropertyOptionResult['strategy'] | null;
}

// ── 집 이벤트 카드 ───────────────────────────────────────────────────────────
function PropertyEventCard({ data, isSell }: {
  data: NonNullable<TimelineEvent['propertyData']>;
  isSell: boolean;
}) {
  const { estimatedPrice, mortgageBalance, netProceeds, lifeExpectancy } = data;

  // 담보대출 카드: 집 유지, 대출로 생활비 보완
  if (!isSell) {
    return (
      <div
        style={{
          background: '#F8F9FA',
          borderRadius: 8,
          padding: '12px 14px',
          marginTop: 10,
          fontSize: 13,
          color: 'var(--tds-gray-600)',
          lineHeight: 1.7,
        }}
      >
        집은 유지하고, 집 담보대출로 부족한 생활비를 채워요.
        {lifeExpectancy > 0 && (
          <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 6 }}>
            이 방식이면 {lifeExpectancy}세까지 이어질 수 있어요.
          </div>
        )}
      </div>
    );
  }

  // 매각 카드
  return (
    <div
      style={{
        background: '#F8F9FA',
        borderRadius: 8,
        padding: '12px 14px',
        marginTop: 10,
        fontSize: 13,
      }}
    >
      <div style={{ color: 'var(--tds-gray-600)', marginBottom: 10, lineHeight: 1.6 }}>
        이 해에 집을 팔면 이렇게 계산돼요.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--tds-gray-500)' }}>집 예상 가격</span>
          <span style={{ fontWeight: 600, color: 'var(--tds-gray-800)' }}>
            {estimatedPrice > 0 ? fmtKRW(estimatedPrice) : '—'}
          </span>
        </div>
        {mortgageBalance > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--tds-gray-500)' }}>남은 주담대</span>
            <span style={{ fontWeight: 600, color: 'var(--tds-gray-800)' }}>
              {fmtKRW(mortgageBalance)}
            </span>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--tds-gray-200)',
            paddingTop: 8,
            marginTop: 2,
          }}
        >
          <span style={{ color: 'var(--tds-gray-700)', fontWeight: 700 }}>내 손에 남는 돈</span>
          <span style={{ fontWeight: 800, color: 'var(--tds-gray-900)' }}>
            {netProceeds > 0 ? fmtKRW(netProceeds) : '—'}
          </span>
        </div>
      </div>
      {netProceeds > 0 && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--tds-gray-400)',
            marginTop: 10,
            lineHeight: 1.6,
          }}
        >
          이 돈을 생활비에 쓰면 {lifeExpectancy}세까지 이어질 수 있어요.
        </div>
      )}
    </div>
  );
}

// ── 이벤트 카드 스타일 매핑 ───────────────────────────────────────────────────
function getEventStyle(type: EventType): { dotColor: string; headerColor: string } {
  switch (type) {
    case 'retirement':
    case 'pension_public':
    case 'pension_retirement':
    case 'pension_private':
      return { dotColor: 'var(--tds-gray-400)', headerColor: 'var(--tds-gray-800)' };
    case 'pension_retirement_end':
      return { dotColor: 'var(--tds-gray-300)', headerColor: 'var(--tds-gray-600)' };
    case 'financial_exhaustion':
    case 'property_sell':
    case 'property_loan':
      return { dotColor: '#E09400', headerColor: 'var(--tds-gray-800)' };
    case 'failure':
      return { dotColor: '#C0392B', headerColor: 'var(--tds-gray-800)' };
  }
}

function getKeyEventStyle(kind: KeyDecisionEventKind): { dotColor: string; textColor: string } {
  switch (kind) {
    case 'financial_exhaustion_start':
    case 'lifestyle_shortfall_start':
      return { dotColor: 'var(--ux-status-negative)', textColor: 'var(--result-text-body-color)' };
    case 'property_intervention_start':
      return { dotColor: 'var(--result-accent-strong)', textColor: 'var(--result-text-body-color)' };
    default:
      return { dotColor: 'var(--result-text-meta-color)', textColor: 'var(--result-text-body-color)' };
  }
}

interface CompactLifetimeTimelineProps {
  events: KeyDecisionEvent[];
  emptyText?: string;
}

export function CompactLifetimeTimeline({
  events,
  emptyText = '표시할 주요 이벤트가 없어요.',
}: CompactLifetimeTimelineProps) {
  if (events.length === 0) {
    return (
      <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)', lineHeight: 1.55 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {events.map((event, index) => {
        const style = getKeyEventStyle(event.kind);
        const isLast = index === events.length - 1;
        return (
          <li key={`${event.kind}-${event.age}`} style={{ display: 'flex', gap: 'var(--result-space-3)', paddingLeft: 2 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 12,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: style.dotColor,
                  marginTop: 6,
                  display: 'inline-block',
                }}
              />
              {!isLast && (
                <span
                  style={{
                    width: 1,
                    flex: 1,
                    minHeight: 22,
                    marginTop: 4,
                    background: 'var(--result-border-subtle)',
                    display: 'inline-block',
                  }}
                />
              )}
            </div>

            <div style={{ paddingBottom: isLast ? 0 : 'var(--result-space-3)', flex: 1 }}>
              <div style={{ fontSize: 'var(--result-text-body)', color: style.textColor, lineHeight: 1.55 }}>
                {event.text}
              </div>
              {event.note && (
                <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)', lineHeight: 1.55, marginTop: 2 }}>
                  {event.note}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function LifetimeTimeline({
  detailYearlyAggregates,
  summary,
  propertyOptions,
  inputs,
  timelineStrategyMode,
  selectedPropertyStrategy,
}: LifetimeTimelineProps) {
  if (detailYearlyAggregates.length === 0) return null;

  const { retirementAge, lifeExpectancy } = inputs.goal;

  const events = extractEvents(
    detailYearlyAggregates,
    summary,
    propertyOptions,
    inputs,
    timelineStrategyMode,
    selectedPropertyStrategy,
  );
  const eventAges = new Set(events.map((e) => e.age));
  const groupedRows = buildGroupedRows(detailYearlyAggregates, eventAges, retirementAge);

  // 렌더링 순서: 이벤트와 묶음 행을 각각 만든 뒤 age 기준 오름차순 정렬
  type RenderItem =
    | { kind: 'event'; data: TimelineEvent }
    | { kind: 'group'; data: GroupedRow };

  const allItems: RenderItem[] = [
    ...events.map((ev): RenderItem => ({ kind: 'event', data: ev })),
    ...groupedRows.map((g): RenderItem => ({ kind: 'group', data: g })),
  ];

  const getItemAge = (item: RenderItem) =>
    item.kind === 'event' ? item.data.age : item.data.fromAge;

  // age 오름차순 정렬. 같은 age면 이벤트를 그룹보다 앞에
  allItems.sort((a, b) => {
    const ageDiff = getItemAge(a) - getItemAge(b);
    if (ageDiff !== 0) return ageDiff;
    if (a.kind === 'event' && b.kind === 'group') return -1;
    if (a.kind === 'group' && b.kind === 'event') return 1;
    return 0;
  });

  const finalItems = allItems;

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--tds-gray-100)',
        padding: '20px 22px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--tds-gray-700)',
          marginBottom: 20,
          letterSpacing: 0.1,
        }}
      >
        나이별 돈 흐름 ({retirementAge}세 → {lifeExpectancy}세)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {finalItems.map((item, idx) => {
          if (item.kind === 'group') {
            const { fromAge, toAge, avgMonthlyExpense } = item.data;
            return (
              <div
                key={`group-${fromAge}`}
                style={{
                  display: 'flex',
                  gap: 16,
                  paddingLeft: 8,
                }}
              >
                {/* 타임라인 라인 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    width: 12,
                  }}
                >
                  <div
                    style={{
                      width: 1,
                      background: 'var(--tds-gray-150, #E8E8E8)',
                      flex: 1,
                      minHeight: 28,
                    }}
                  />
                </div>
                {/* 묶음 행 텍스트 */}
                <div
                  style={{
                    padding: '10px 0',
                    fontSize: 12,
                    color: 'var(--tds-gray-400)',
                    lineHeight: 1.5,
                  }}
                >
                  {fromAge}~{toAge}세: 큰 변화가 없고, 월평균{' '}
                  {avgMonthlyExpense > 0 ? fmtKRW(avgMonthlyExpense) : '—'}을 써요.
                </div>
              </div>
            );
          }

          // 이벤트 카드
          const ev = item.data;
          const style = getEventStyle(ev.type);
          const isSell = ev.type === 'property_sell';
          const isLoan = ev.type === 'property_loan';
          const isLastItem = idx === finalItems.length - 1;

          return (
            <div
              key={`event-${ev.age}-${ev.type}`}
              style={{
                display: 'flex',
                gap: 16,
                paddingLeft: 8,
              }}
            >
              {/* 타임라인 점 + 라인 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  width: 12,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: style.dotColor,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                {!isLastItem && (
                  <div
                    style={{
                      width: 1,
                      background: 'var(--tds-gray-150, #E8E8E8)',
                      flex: 1,
                      minHeight: 20,
                    }}
                  />
                )}
              </div>

              {/* 카드 내용 */}
              <div
                style={{
                  paddingBottom: isLastItem ? 0 : 20,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: style.headerColor,
                    marginBottom: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {ev.header}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--tds-gray-600)',
                    lineHeight: 1.6,
                  }}
                >
                  {ev.description}
                </div>
                {ev.warning && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#FFF8EC',
                      border: '1px solid #FFE0B2',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#8B4A00',
                      lineHeight: 1.6,
                    }}
                  >
                    {ev.warning}
                  </div>
                )}
                {(isSell || isLoan) && ev.propertyData && (
                  <PropertyEventCard data={ev.propertyData} isSell={isSell} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
