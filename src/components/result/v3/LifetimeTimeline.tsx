import type { YearlyAggregateV2, CalculationResultV2, PropertyOptionResult } from '../../../types/calculationV2';
import type { PlannerInputs } from '../../../types/inputs';
import { fmtKRW } from '../../../utils/format';

interface LifetimeTimelineProps {
  detailYearlyAggregates: YearlyAggregateV2[];
  summary: CalculationResultV2['summary'];
  propertyOptions: PropertyOptionResult[];
  inputs: PlannerInputs;
}

// ── 이벤트 타입 정의 ──────────────────────────────────────────────────────────
type EventType =
  | 'retirement'
  | 'pension_public'
  | 'pension_retirement'
  | 'pension_private'
  | 'financial_exhaustion'
  | 'property_sell'
  | 'property_loan'
  | 'failure';

interface TimelineEvent {
  age: number;
  type: EventType;
  header: string;
  description: string;
  propertyData?: {
    estimatedPrice: number;
    mortgageBalance: number;
    netProceeds: number;
    lifeExpectancy: number;
  };
}

// ── 묶음 행 타입 ──────────────────────────────────────────────────────────────
interface GroupedRow {
  fromAge: number;
  toAge: number;
  avgMonthlyExpense: number;
}

// ── 이벤트 연도 추출 유틸 ─────────────────────────────────────────────────────
function extractEvents(
  aggregates: YearlyAggregateV2[],
  summary: CalculationResultV2['summary'],
  propertyOptions: PropertyOptionResult[],
  inputs: PlannerInputs
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const { retirementAge, lifeExpectancy } = inputs.goal;

  // 1. 은퇴
  events.push({
    age: retirementAge,
    type: 'retirement',
    header: `${retirementAge}세 — 은퇴`,
    description: '이 해부터 근로소득이 끊기고 저축과 연금으로 생활을 시작해요.',
  });

  // 2. 국민연금 개시
  if (inputs.pension.publicPension.enabled) {
    const startAge = inputs.pension.publicPension.startAge;
    if (startAge > retirementAge) {
      const monthly = inputs.pension.publicPension.manualMonthlyTodayValue;
      const description =
        monthly > 0
          ? `이 달부터 매달 ${fmtKRW(monthly)}의 국민연금이 들어와요.`
          : '이 달부터 국민연금이 들어오기 시작해요.';
      events.push({
        age: startAge,
        type: 'pension_public',
        header: `${startAge}세 — 국민연금 시작`,
        description,
      });
    }
  }

  // 3. 퇴직연금 개시
  if (inputs.pension.retirementPension.enabled) {
    const startAge = inputs.pension.retirementPension.startAge;
    if (startAge > retirementAge) {
      const monthly = inputs.pension.retirementPension.manualMonthlyTodayValue;
      const description =
        monthly > 0
          ? `이 달부터 매달 ${fmtKRW(monthly)}의 퇴직연금이 추가돼요.`
          : '이 달부터 퇴직연금이 들어오기 시작해요.';
      events.push({
        age: startAge,
        type: 'pension_retirement',
        header: `${startAge}세 — 퇴직연금 시작`,
        description,
      });
    }
  }

  // 4. 개인연금 개시
  if (inputs.pension.privatePension.enabled) {
    const startAge = inputs.pension.privatePension.startAge;
    if (startAge > retirementAge) {
      const monthly = inputs.pension.privatePension.manualMonthlyTodayValue;
      const description =
        monthly > 0
          ? `이 달부터 매달 ${fmtKRW(monthly)}의 개인연금이 추가돼요.`
          : '이 달부터 개인연금이 들어오기 시작해요.';
      events.push({
        age: startAge,
        type: 'pension_private',
        header: `${startAge}세 — 개인연금 시작`,
        description,
      });
    }
  }

  // 5. 저축 소진 (금융자산 소진)
  if (summary.financialExhaustionAge !== null) {
    events.push({
      age: summary.financialExhaustionAge,
      type: 'financial_exhaustion',
      header: `${summary.financialExhaustionAge}세 — 저축한 돈이 바닥납니다`,
      description: '현금·예금·주식이 이 해에 모두 소진돼요. 이후에는 연금과 집이 유일한 수입원이에요.',
    });
  }

  // 6. 집 이벤트 — 권장 전략 기준 (sell 우선, 없으면 secured_loan)
  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  if (hasRealEstate) {
    const sellOption = propertyOptions.find((o) => o.strategy === 'sell');
    const loanOption = propertyOptions.find((o) => o.strategy === 'secured_loan');
    const recommendedProperty = propertyOptions.find((o) => o.isRecommended && o.strategy !== 'keep');
    const propertyOption = recommendedProperty ?? sellOption ?? loanOption;

    if (propertyOption && propertyOption.interventionAge !== null) {
      const isSell = propertyOption.strategy === 'sell';
      const interventionAge = propertyOption.interventionAge;

      // 해당 연도 집값 데이터 찾기
      const yearRow = aggregates.find((r) => r.ageYear === interventionAge);
      const estimatedPrice = yearRow?.propertyValueEnd ?? 0;
      // securedLoanBalanceEnd: secured_loan 전략 담보대출 잔고
      // propertyDebtEnd: 기존 주담대 잔고 — YearlyAggregateV2에 없으므로 월별 마지막 달에서 읽음
      const lastMonth = yearRow?.months?.[yearRow.months.length - 1];
      const existingMortgage = lastMonth?.propertyDebtEnd ?? 0;
      const mortgageBalance = (yearRow?.securedLoanBalanceEnd ?? 0) + existingMortgage;
      const netProceeds = Math.max(0, estimatedPrice - mortgageBalance);

      if (isSell) {
        events.push({
          age: interventionAge,
          type: 'property_sell',
          header: `${interventionAge}세 — 집을 팔아야 하는 시점`,
          description: '이 해에 집을 팔면 아래와 같이 돼요.',
          propertyData: {
            estimatedPrice,
            mortgageBalance,
            netProceeds,
            lifeExpectancy,
          },
        });
      } else {
        events.push({
          age: interventionAge,
          type: 'property_loan',
          header: `${interventionAge}세 — 집을 담보로 대출을 받아야 하는 시점`,
          description: '이 해에 집을 담보로 대출을 받아야 해요.',
          propertyData: {
            estimatedPrice,
            mortgageBalance,
            netProceeds,
            lifeExpectancy,
          },
        });
      }
    }
  }

  // 7. 자금 고갈
  if (summary.failureAge !== null) {
    // 해당 연도 shortfall 데이터
    const failureRow = aggregates.find((r) => r.ageYear === summary.failureAge);
    const monthlyShortfall =
      failureRow && failureRow.totalShortfall > 0
        ? Math.round(failureRow.totalShortfall / 12)
        : null;

    const description = monthlyShortfall
      ? `이 해부터 매달 ${fmtKRW(monthlyShortfall)}씩 부족해져요.`
      : '이 해부터 자금이 부족해져요.';

    events.push({
      age: summary.failureAge,
      type: 'failure',
      header: `${summary.failureAge}세 — 자금이 부족해집니다`,
      description,
    });
  }

  // 중복 나이 제거 (같은 나이에 여러 이벤트 있으면 병합하지 않고 순서 유지)
  // age 기준 오름차순 정렬
  events.sort((a, b) => a.age - b.age);

  // lifeExpectancy 초과 이벤트 제거
  return events.filter((e) => e.age <= lifeExpectancy);
}

// ── 묶음 행 생성 ──────────────────────────────────────────────────────────────
function buildGroupedRows(
  aggregates: YearlyAggregateV2[],
  eventAges: Set<number>,
  retirementAge: number
): GroupedRow[] {
  const groups: GroupedRow[] = [];
  let groupStart: number | null = null;
  let groupExpenses: number[] = [];

  for (let i = 0; i < aggregates.length; i++) {
    const row = aggregates[i];
    if (row.ageYear < retirementAge) continue; // 은퇴 전 묶지 않음

    if (eventAges.has(row.ageYear)) {
      // 진행 중인 그룹 마무리
      if (groupStart !== null && groupExpenses.length > 1) {
        const avgMonthly =
          groupExpenses.reduce((a, b) => a + b, 0) / groupExpenses.length / 12;
        groups.push({
          fromAge: groupStart,
          toAge: aggregates[i - 1].ageYear,
          avgMonthlyExpense: Math.round(avgMonthly),
        });
      }
      groupStart = null;
      groupExpenses = [];
    } else {
      if (groupStart === null) {
        groupStart = row.ageYear;
        groupExpenses = [row.totalExpense];
      } else {
        groupExpenses.push(row.totalExpense);
      }
    }
  }

  // 마지막 그룹 마무리
  if (groupStart !== null && groupExpenses.length > 1) {
    const lastRow = aggregates[aggregates.length - 1];
    const avgMonthly =
      groupExpenses.reduce((a, b) => a + b, 0) / groupExpenses.length / 12;
    groups.push({
      fromAge: groupStart,
      toAge: lastRow.ageYear,
      avgMonthlyExpense: Math.round(avgMonthly),
    });
  }

  return groups;
}

// ── 집 이벤트 카드 3종 세트 ───────────────────────────────────────────────────
function PropertyEventCard({ data, isSell }: {
  data: NonNullable<TimelineEvent['propertyData']>;
  isSell: boolean;
}) {
  const { estimatedPrice, mortgageBalance, netProceeds, lifeExpectancy } = data;
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
        {isSell ? '이 해에 집을 팔면 아래와 같이 돼요.' : '이 해에 담보대출을 받으면 아래와 같이 돼요.'}
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
            <span style={{ color: 'var(--tds-gray-500)' }}>
              {isSell ? '남은 주담대' : '담보대출 잔액'}
            </span>
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
          이 돈을 추가 생활비로 쓰면 {lifeExpectancy}세까지 이어질 수 있어요.
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
    case 'financial_exhaustion':
    case 'property_sell':
    case 'property_loan':
      return { dotColor: '#E09400', headerColor: 'var(--tds-gray-800)' };
    case 'failure':
      return { dotColor: '#C0392B', headerColor: 'var(--tds-gray-800)' };
  }
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function LifetimeTimeline({
  detailYearlyAggregates,
  summary,
  propertyOptions,
  inputs,
}: LifetimeTimelineProps) {
  if (detailYearlyAggregates.length === 0) return null;

  const { retirementAge, lifeExpectancy } = inputs.goal;

  const events = extractEvents(detailYearlyAggregates, summary, propertyOptions, inputs);
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
        연도별 타임라인 ({retirementAge}세 → {lifeExpectancy}세)
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
                  {fromAge}~{toAge}세: 큰 변화 없음. 매달{' '}
                  {avgMonthlyExpense > 0 ? fmtKRW(avgMonthlyExpense) : '—'} 생활 유지.
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
