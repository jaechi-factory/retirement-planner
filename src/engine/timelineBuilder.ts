/**
 * 연도별 타임라인 이벤트 빌더 — LifetimeTimeline 컴포넌트 전용 순수 함수
 *
 * React 의존성 없음. 입력 데이터로부터 렌더링에 필요한 이벤트 목록과
 * 묶음 행(GroupedRow)을 만들어 반환한다.
 */

import type { YearlyAggregateV2, CalculationResultV2, PropertyOptionResult } from '../types/calculationV2';
import type { PlannerInputs } from '../types/inputs';
import { fmtKRW } from '../utils/format';
import { getPensionBreakdown } from './pensionEstimation';
import { getPlannerPolicy } from '../policy/policyTable';

// ── 이벤트 타입 ───────────────────────────────────────────────────────────────

export type EventType =
  | 'retirement'
  | 'pension_public'
  | 'pension_retirement'
  | 'pension_retirement_end'
  | 'pension_private'
  | 'financial_exhaustion'
  | 'property_sell'
  | 'property_loan'
  | 'failure';

export interface TimelineEvent {
  age: number;
  type: EventType;
  header: string;
  description: string;
  warning?: string;
  propertyData?: {
    estimatedPrice: number;
    mortgageBalance: number;
    netProceeds: number;
    lifeExpectancy: number;
  };
}

export interface GroupedRow {
  fromAge: number;
  toAge: number;
  avgMonthlyExpense: number;
}

export type KeyDecisionEventKind =
  | 'retirement_start'
  | 'pension_public_start'
  | 'pension_retirement_start'
  | 'pension_retirement_end'
  | 'pension_private_start'
  | 'pension_private_end'
  | 'financial_peak'
  | 'net_cashflow_negative_start'
  | 'financial_exhaustion_start'
  | 'financial_depletion'
  | 'property_intervention_start'
  | 'lifestyle_shortfall_start'
  | 'child_expense_end';

export interface KeyDecisionEvent {
  kind: KeyDecisionEventKind;
  age: number;
  text: string;
  note?: string;
}

// ── 이벤트 추출 ───────────────────────────────────────────────────────────────

export function extractEvents(
  aggregates: YearlyAggregateV2[],
  summary: CalculationResultV2['summary'],
  propertyOptions: PropertyOptionResult[],
  inputs: PlannerInputs,
  timelineStrategyMode: 'recommended' | 'selected' = 'recommended',
  selectedPropertyStrategy: PropertyOptionResult['strategy'] | null = null,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const { retirementAge, lifeExpectancy } = inputs.goal;

  const pensionBreakdown = getPensionBreakdown(
    inputs.pension,
    inputs.status.currentAge,
    retirementAge,
    inputs.status.annualIncome,
    inputs.goal.inflationRate,
    inputs.goal.retirementStartMonth ?? 0,
  );

  // 1. 은퇴 + 연금 공백기 경고
  const pensionStartAges = [
    inputs.pension.publicPension.enabled ? inputs.pension.publicPension.startAge : Infinity,
    inputs.pension.retirementPension.enabled ? inputs.pension.retirementPension.startAge : Infinity,
    inputs.pension.privatePension.enabled ? inputs.pension.privatePension.startAge : Infinity,
  ].filter((a) => a >= retirementAge && a < Infinity);

  const firstPensionAge = pensionStartAges.length > 0 ? Math.min(...pensionStartAges) : null;
  const gapYears = firstPensionAge !== null ? firstPensionAge - retirementAge : 0;

  events.push({
    age: retirementAge,
    type: 'retirement',
    header: `${retirementAge}세 — 은퇴 시작`,
    description: '이 해부터 근로소득이 멈추고, 저축과 연금으로 생활해요.',
    warning: gapYears > 0
      ? `이후 ${gapYears}년은 연금 없이 금융자산으로 생활해요.`
      : undefined,
  });

  // 2. 국민연금 개시
  if (inputs.pension.publicPension.enabled) {
    const startAge = inputs.pension.publicPension.startAge;
    if (startAge > retirementAge) {
      const monthly = pensionBreakdown.publicMonthly;
      events.push({
        age: startAge,
        type: 'pension_public',
        header: `${startAge}세 — 국민연금 시작`,
        description: monthly > 0
          ? `이때부터 국민연금 시작 월액(오늘 가치) ${fmtKRW(monthly)}이 들어와요.`
          : '이때부터 국민연금이 들어와요.',
      });
    }
  }

  // 3. 퇴직연금 개시
  if (inputs.pension.retirementPension.enabled) {
    const startAge = inputs.pension.retirementPension.startAge;
    if (startAge > retirementAge) {
      const monthly = pensionBreakdown.retirementMonthly;
      events.push({
        age: startAge,
        type: 'pension_retirement',
        header: `${startAge}세 — 퇴직연금 시작`,
        description: monthly > 0
          ? `이때부터 퇴직연금 시작 월액(오늘 가치) ${fmtKRW(monthly)}이 추가돼요.`
          : '이때부터 퇴직연금이 들어와요.',
      });
    }
  }

  // 3-1. 퇴직연금 종료
  if (inputs.pension.retirementPension.enabled) {
    const endAge = inputs.pension.retirementPension.startAge + inputs.pension.retirementPension.payoutYears;
    if (endAge <= lifeExpectancy) {
      events.push({
        age: endAge,
        type: 'pension_retirement_end',
        header: `${endAge}세 — 퇴직연금 수령 종료`,
        description: '퇴직연금이 끝나요. 이후에는 다른 자산에서 생활비 비중이 커져요.',
      });
    }
  }

  // 4. 개인연금 개시
  if (inputs.pension.privatePension.enabled) {
    const startAge = inputs.pension.privatePension.startAge;
    if (startAge > retirementAge) {
      const monthly = pensionBreakdown.privateMonthly;
      events.push({
        age: startAge,
        type: 'pension_private',
        header: `${startAge}세 — 개인연금 시작`,
        description: monthly > 0
          ? `이때부터 개인연금 시작 월액(오늘 가치) ${fmtKRW(monthly)}이 추가돼요.`
          : '이때부터 개인연금이 들어와요.',
      });
    }
  }

  // 5. 금융자산 소진
  if (summary.financialExhaustionAge !== null) {
    events.push({
      age: summary.financialExhaustionAge,
      type: 'financial_exhaustion',
      header: `${summary.financialExhaustionAge}세 — 금융자산이 거의 다 떨어져요`,
      description: '현금·예금·주식이 거의 다 떨어져요. 이후에는 연금과 집으로 생활비를 메워야 해요.',
    });
  }

  // 6. 집 이벤트
  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  if (hasRealEstate) {
    const sellOption = propertyOptions.find((o) => o.strategy === 'sell');
    const loanOption = propertyOptions.find((o) => o.strategy === 'secured_loan');
    const recommendedOption = propertyOptions.find((o) => o.isRecommended) ?? null;

    let propertyOption: PropertyOptionResult | null = null;
    if (timelineStrategyMode === 'selected') {
      if (selectedPropertyStrategy && selectedPropertyStrategy !== 'keep') {
        propertyOption = propertyOptions.find((o) => o.strategy === selectedPropertyStrategy) ?? null;
      }
    } else if (recommendedOption) {
      propertyOption = recommendedOption.strategy === 'keep' ? null : recommendedOption;
    } else {
      propertyOption = sellOption ?? loanOption ?? null;
    }

    if (propertyOption && propertyOption.interventionAge !== null) {
      const isSell = propertyOption.strategy === 'sell';
      const interventionAge = propertyOption.interventionAge;
      const policy = getPlannerPolicy();

      const allMonths = aggregates.flatMap((r) => r.months);
      const interventionMonth = allMonths.find(
        (m) => m.ageYear === interventionAge && m.eventFlags.propertyInterventionStarted,
      );
      const saleMonth = allMonths.find(
        (m) => m.ageYear === interventionAge && m.eventFlags.propertySold,
      );
      const yearRow = aggregates.find((r) => r.ageYear === interventionAge);

      let estimatedPrice = 0;
      let mortgageBalance = 0;
      let netProceeds = 0;

      if (isSell && saleMonth) {
        estimatedPrice = saleMonth.propertySaleGrossProceedsThisMonth;
        if (estimatedPrice <= 0) {
          const saleIdx = allMonths.findIndex((m) => m === saleMonth);
          estimatedPrice = saleIdx > 0 ? allMonths[saleIdx - 1].propertyValueEnd : 0;
        }
        mortgageBalance = saleMonth.propertySaleDebtSettledThisMonth;
        netProceeds = saleMonth.propertySaleNetProceedsThisMonth > 0
          ? saleMonth.propertySaleNetProceedsThisMonth
          : Math.max(0, estimatedPrice * (1 - policy.property.propertySaleHaircut) - mortgageBalance);
      } else {
        estimatedPrice = interventionMonth?.propertyValueEnd ?? yearRow?.propertyValueEnd ?? 0;
        const existingMortgage =
          interventionMonth?.mortgageDebtEnd ??
          yearRow?.months?.[yearRow.months.length - 1]?.mortgageDebtEnd ??
          0;
        const securedLoan =
          interventionMonth?.securedLoanBalanceEnd ??
          yearRow?.securedLoanBalanceEnd ??
          0;
        mortgageBalance = existingMortgage + securedLoan;
        netProceeds = Math.max(0, estimatedPrice * (1 - policy.property.propertySaleHaircut) - mortgageBalance);
      }

      events.push({
        age: interventionAge,
        type: isSell ? 'property_sell' : 'property_loan',
        header: isSell
          ? `${interventionAge}세 — 집을 팔아야 할 수 있어요`
          : `${interventionAge}세 — 집 담보대출이 필요해져요`,
        description: isSell
          ? '이 해에 집을 팔면 이렇게 계산돼요.'
          : '이 해부터 집 담보대출로 생활비를 메워요.',
        propertyData: { estimatedPrice, mortgageBalance, netProceeds, lifeExpectancy },
      });
    }
  }

  // 7. 자금 고갈
  if (summary.failureAge !== null) {
    const failureRow = aggregates.find((r) => r.ageYear === summary.failureAge);
    const monthlyShortfall = failureRow && failureRow.totalShortfall > 0
      ? Math.round(failureRow.totalShortfall / 12)
      : null;

    events.push({
      age: summary.failureAge,
      type: 'failure',
      header: `${summary.failureAge}세 — 생활비가 모자라기 시작해요`,
      description: monthlyShortfall
        ? `이 해부터 매달 ${fmtKRW(monthlyShortfall)}이 부족해요.`
        : '이 해부터 생활비가 부족해요.',
    });
  }

  events.sort((a, b) => a.age - b.age);
  return events.filter((e) => e.age <= lifeExpectancy);
}

function eventPriority(kind: KeyDecisionEventKind): number {
  switch (kind) {
    case 'retirement_start':
      return 10;
    case 'pension_public_start':
      return 20;
    case 'pension_retirement_start':
      return 30;
    case 'pension_private_start':
      return 40;
    case 'pension_retirement_end':
      return 50;
    case 'pension_private_end':
      return 60;
    case 'child_expense_end':
      return 70;
    case 'financial_peak':
      return 75;
    case 'net_cashflow_negative_start':
      return 77;
    case 'financial_exhaustion_start':
      return 80;
    case 'financial_depletion':
      return 85;
    case 'property_intervention_start':
      return 90;
    case 'lifestyle_shortfall_start':
      return 100;
  }
}

export function extractKeyDecisionEvents(
  aggregates: YearlyAggregateV2[],
  summary: CalculationResultV2['summary'],
  propertyOptions: PropertyOptionResult[],
  inputs: PlannerInputs,
  timelineStrategyMode: 'recommended' | 'selected' = 'recommended',
  selectedPropertyStrategy: PropertyOptionResult['strategy'] | null = null,
): KeyDecisionEvent[] {
  const { retirementAge, lifeExpectancy } = inputs.goal;
  const timelineEvents = extractEvents(
    aggregates,
    summary,
    propertyOptions,
    inputs,
    timelineStrategyMode,
    selectedPropertyStrategy,
  );

  const all: KeyDecisionEvent[] = [];
  const add = (event: KeyDecisionEvent) => {
    if (event.age < retirementAge || event.age > lifeExpectancy) return;
    all.push(event);
  };

  const retirementEvent = timelineEvents.find((event) => event.type === 'retirement');
  add({
    kind: 'retirement_start',
    age: retirementAge,
    text: `${retirementAge}세 은퇴가 시작돼요`,
    note: retirementEvent?.warning,
  });

  if (inputs.pension.publicPension.enabled) {
    add({
      kind: 'pension_public_start',
      age: inputs.pension.publicPension.startAge,
      text: `${inputs.pension.publicPension.startAge}세 국민연금이 시작돼요`,
    });
  }

  if (inputs.pension.retirementPension.enabled) {
    const retirementStartAge = inputs.pension.retirementPension.startAge;
    add({
      kind: 'pension_retirement_start',
      age: retirementStartAge,
      text: `${retirementStartAge}세 퇴직연금이 시작돼요`,
    });

    const retirementEndAge = retirementStartAge + inputs.pension.retirementPension.payoutYears;
    add({
      kind: 'pension_retirement_end',
      age: retirementEndAge,
      text: `${retirementEndAge}세 퇴직연금이 끝나요`,
    });
  }

  if (inputs.pension.privatePension.enabled) {
    const privateStartAge = inputs.pension.privatePension.startAge;
    add({
      kind: 'pension_private_start',
      age: privateStartAge,
      text: `${privateStartAge}세 개인연금이 시작돼요`,
    });

    const privateEndAge = privateStartAge + inputs.pension.privatePension.payoutYears;
    add({
      kind: 'pension_private_end',
      age: privateEndAge,
      text: `${privateEndAge}세 개인연금이 끝나요`,
    });
  }

  if (inputs.children.hasChildren && inputs.children.count > 0) {
    const childExpenseEndAge = inputs.children.independenceAge;
    add({
      kind: 'child_expense_end',
      age: childExpenseEndAge,
      text: `${childExpenseEndAge}세 자녀 지출이 끝나요`,
      note: `${inputs.children.independenceMonth ?? 11}월부터 자녀비를 0으로 계산해요.`,
    });
  }

  // 금융자산 최고점 (은퇴 전 포함)
  if (aggregates.length > 0) {
    let peakAmount = -Infinity;
    let peakAge = -1;
    for (const row of aggregates) {
      const total = row.cashLikeEnd + row.financialInvestableEnd;
      if (total > peakAmount) {
        peakAmount = total;
        peakAge = row.ageYear;
      }
    }
    // 첫 해·마지막 해가 아닌 실질적인 정점만 표시
    const firstAge = aggregates[0]?.ageYear ?? -1;
    const lastAge = aggregates[aggregates.length - 1]?.ageYear ?? -1;
    if (peakAge > firstAge && peakAge < lastAge) {
      add({
        kind: 'financial_peak',
        age: peakAge,
        text: `${peakAge}세 금융자산이 최고점이에요`,
        note: peakAge < retirementAge
          ? '이 해 이후 은퇴하면 자산이 줄어들기 시작해요.'
          : undefined,
      });
    }
  }

  // 순현금흐름 적자 전환 시점 (수입+연금 < 지출+상환)
  if (aggregates.length > 0) {
    let foundNegativeAge: number | null = null;
    for (const row of aggregates) {
      const annualInflow = row.totalIncome + row.totalPension;
      const annualOutflow = row.totalExpense + row.totalDebtService + row.totalChildExpense + row.totalRentalCost;
      if (annualInflow < annualOutflow && foundNegativeAge === null) {
        foundNegativeAge = row.ageYear;
        break;
      }
    }
    if (foundNegativeAge !== null) {
      add({
        kind: 'net_cashflow_negative_start',
        age: foundNegativeAge,
        text: `${foundNegativeAge}세부터 수입보다 지출이 많아져요`,
        note: '이때부터 모아둔 자산으로 부족분을 메워야 해요.',
      });
    }
  }

  // 금융자산 소진 시작 (매도 시작 나이)
  if (summary.financialSellStartAge !== null) {
    add({
      kind: 'financial_exhaustion_start',
      age: summary.financialSellStartAge,
      text: `${summary.financialSellStartAge}세 금융자산이 부족해지기 시작해요`,
    });
  }

  // 금융자산 완전 소진
  if (summary.financialExhaustionAge !== null) {
    add({
      kind: 'financial_depletion',
      age: summary.financialExhaustionAge,
      text: `${summary.financialExhaustionAge}세 금융자산이 바닥나요`,
    });
  }

  const propertyEvent = timelineEvents.find(
    (event) => event.type === 'property_loan' || event.type === 'property_sell',
  );
  if (propertyEvent) {
    add({
      kind: 'property_intervention_start',
      age: propertyEvent.age,
      text: propertyEvent.type === 'property_sell'
        ? `${propertyEvent.age}세 집을 팔거나, 대출을 받아서 생활비를 마련해야 해요`
        : `${propertyEvent.age}세 집을 담보로 빌려 생활비를 보태야 해요`,
    });
  }

  if (summary.failureAge !== null) {
    const targetText = inputs.goal.targetMonthly > 0
      ? `목표 생활비(월 ${inputs.goal.targetMonthly.toLocaleString()}만원) 기준, `
      : '';
    add({
      kind: 'lifestyle_shortfall_start',
      age: summary.failureAge,
      text: `${summary.failureAge}세 ${targetText}자금이 바닥나요`,
      note: '이 나이부터 생활비를 충당할 자산이 남아있지 않아요.',
    });
  }

  const deduped = all.filter((event, index, arr) => (
    arr.findIndex((candidate) => candidate.kind === event.kind && candidate.age === event.age) === index
  ));

  deduped.sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age;
    return eventPriority(a.kind) - eventPriority(b.kind);
  });

  return deduped;
}

// ── 묶음 행 생성 ──────────────────────────────────────────────────────────────

export function buildGroupedRows(
  aggregates: YearlyAggregateV2[],
  eventAges: Set<number>,
  retirementAge: number,
): GroupedRow[] {
  const groups: GroupedRow[] = [];
  let groupStart: number | null = null;
  let groupExpenses: number[] = [];

  for (let i = 0; i < aggregates.length; i++) {
    const row = aggregates[i];
    if (row.ageYear < retirementAge) continue;

    if (eventAges.has(row.ageYear)) {
      if (groupStart !== null && groupExpenses.length > 1) {
        const avgMonthly = groupExpenses.reduce((a, b) => a + b, 0) / groupExpenses.length / 12;
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

  if (groupStart !== null && groupExpenses.length > 1) {
    const lastRow = aggregates[aggregates.length - 1];
    const avgMonthly = groupExpenses.reduce((a, b) => a + b, 0) / groupExpenses.length / 12;
    groups.push({
      fromAge: groupStart,
      toAge: lastRow.ageYear,
      avgMonthlyExpense: Math.round(avgMonthly),
    });
  }

  return groups;
}
