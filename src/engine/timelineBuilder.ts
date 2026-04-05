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

// ── 이벤트 추출 ───────────────────────────────────────────────────────────────

export function extractEvents(
  aggregates: YearlyAggregateV2[],
  summary: CalculationResultV2['summary'],
  propertyOptions: PropertyOptionResult[],
  inputs: PlannerInputs,
  selectedStrategy?: 'sell' | 'secured_loan',
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const { retirementAge, lifeExpectancy } = inputs.goal;

  const pensionBreakdown = getPensionBreakdown(
    inputs.pension,
    inputs.status.currentAge,
    retirementAge,
    inputs.status.annualIncome,
    inputs.goal.inflationRate,
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
    header: `${retirementAge}세 — 은퇴`,
    description: '이 해부터 근로소득이 끊기고 저축과 연금으로 생활을 시작해요.',
    warning: gapYears > 0
      ? `이후 ${gapYears}년간 연금이 없어요. 금융자산만으로 생활해야 하는 기간이에요.`
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
          ? `이 달부터 매달 ${fmtKRW(monthly)}의 국민연금이 들어와요.`
          : '이 달부터 국민연금이 들어오기 시작해요.',
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
          ? `이 달부터 매달 ${fmtKRW(monthly)}의 퇴직연금이 추가돼요.`
          : '이 달부터 퇴직연금이 들어오기 시작해요.',
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
        description: '퇴직연금 수령이 끝나요. 이후 생활비를 연금 수입이 덜 커버하게 돼, 매각대금 인출이 늘어날 수 있어요.',
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
          ? `이 달부터 매달 ${fmtKRW(monthly)}의 개인연금이 추가돼요.`
          : '이 달부터 개인연금이 들어오기 시작해요.',
      });
    }
  }

  // 5. 금융자산 소진
  if (summary.financialExhaustionAge !== null) {
    events.push({
      age: summary.financialExhaustionAge,
      type: 'financial_exhaustion',
      header: `${summary.financialExhaustionAge}세 — 저축한 돈이 바닥납니다`,
      description: '현금·예금·주식이 이 해에 모두 소진돼요. 이후에는 연금과 집이 유일한 수입원이에요.',
    });
  }

  // 6. 집 이벤트
  const hasRealEstate = inputs.assets.realEstate.amount > 0;
  if (hasRealEstate) {
    const sellOption = propertyOptions.find((o) => o.strategy === 'sell');
    const loanOption = propertyOptions.find((o) => o.strategy === 'secured_loan');
    const propertyOption = selectedStrategy
      ? (propertyOptions.find((o) => o.strategy === selectedStrategy) ?? null)
      : (propertyOptions.find((o) => o.isRecommended && o.strategy !== 'keep') ?? sellOption ?? loanOption);

    if (propertyOption && propertyOption.interventionAge !== null) {
      const isSell = propertyOption.strategy === 'sell';
      const interventionAge = propertyOption.interventionAge;

      const yearRow = aggregates.find((r) => r.ageYear === interventionAge);
      const estimatedPrice = yearRow?.propertyValueEnd ?? 0;
      const lastMonth = yearRow?.months?.[yearRow.months.length - 1];
      const existingMortgage = lastMonth?.propertyDebtEnd ?? 0;
      const mortgageBalance = (yearRow?.securedLoanBalanceEnd ?? 0) + existingMortgage;
      const policy = getPlannerPolicy();
      const netProceeds = Math.max(0, estimatedPrice * (1 - policy.property.propertySaleHaircut) - mortgageBalance);

      events.push({
        age: interventionAge,
        type: isSell ? 'property_sell' : 'property_loan',
        header: isSell
          ? `${interventionAge}세 — 집을 팔아야 하는 시점`
          : `${interventionAge}세 — 집을 담보로 대출을 받아야 하는 시점`,
        description: isSell
          ? '이 해에 집을 팔면 아래와 같이 돼요.'
          : '이 해에 집을 담보로 대출을 받아야 해요.',
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
      header: `${summary.failureAge}세 — 자금이 부족해집니다`,
      description: monthlyShortfall
        ? `이 해부터 매달 ${fmtKRW(monthlyShortfall)}씩 부족해져요.`
        : '이 해부터 자금이 부족해져요.',
    });
  }

  events.sort((a, b) => a.age - b.age);
  return events.filter((e) => e.age <= lifeExpectancy);
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
