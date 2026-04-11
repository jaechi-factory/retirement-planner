/**
 * 반사실 시뮬레이션 기반 액션 추천 엔진
 *
 * 기존 simulateMonthlyV2 + findMaxSustainableMonthlyV2를 입력값만 바꿔
 * 다시 돌린 뒤, baseline과 비교해서 전략의 실제 효과를 숫자로 보여준다.
 */

import type { PlannerInputs } from '../types/inputs';
import type { MonthlySnapshotV2, PropertyOptionResult } from '../types/calculationV2';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
import type { DebtSchedules } from './debtSchedule';
import { findMaxSustainableMonthlyV2 } from './binarySearchV2';
import { simulateMonthlyV2, findFailureAgeV2 } from './simulatorV2';
import { precomputeDebtSchedules } from './assetWeighting';

// ── 타입 정의 ──────────────────────────────────────────────────────

export type StrategyCategory =
  | 'retire_timing'
  | 'expense_reduction'
  | 'pension_addition'
  | 'vehicle_removal'
  | 'debt_strategy'
  | 'housing_strategy';

export type SlotType = 'best' | 'practical' | 'big_move';

export interface BaselineResult {
  sustainableMonthly: number;
  failureAge: number | null;
  deficitStartAge: number | null;
  totalLateLifeShortfall: number;
  survives: boolean;
}

export interface InputPatch {
  strategyId: string;
  label: string;
  category: StrategyCategory;
  slotEligibility: SlotType[];
  practicality: number;
  apply: (base: PlannerInputs) => PlannerInputs;
  isApplicable: (base: PlannerInputs, baseline: BaselineResult) => boolean;
}

export interface ComparisonMetrics {
  strategyId: string;
  label: string;
  category: StrategyCategory;
  slotEligibility: SlotType[];
  practicality: number;

  // 핵심 delta
  sustainableMonthlyDelta: number;
  failureAgeDelta: number | null;
  deficitStartAgeDelta: number | null;

  // 말년 안정성
  totalLateLifeShortfall: number;
  baselineLateLifeShortfall: number;

  // 절대값
  newSustainableMonthly: number;
  newFailureAge: number | null;
  newDeficitStartAge: number | null;

  // 생존 판정
  baselineSurvives: boolean;
  counterfactualSurvives: boolean;
}

export interface SlottedRecommendation {
  slot: SlotType;
  metrics: ComparisonMetrics;
}

export interface CounterfactualResult {
  baseline: BaselineResult;
  allMetrics: ComparisonMetrics[];
  slots: SlottedRecommendation[];
}

// ── 유틸리티 ──────────────────────────────────────────────────────

/** 월별 snapshot에서 incomeThisMonth < expenseThisMonth 최초 시점의 나이 */
export function extractDeficitStartAge(snapshots: MonthlySnapshotV2[]): number | null {
  for (const s of snapshots) {
    const totalIncome = s.incomeThisMonth + s.pensionThisMonth;
    const totalExpense = s.expenseThisMonth + s.debtServiceThisMonth + s.childExpenseThisMonth + s.rentalCostThisMonth + s.vehicleCostThisMonth;
    if (totalIncome < totalExpense) {
      return s.ageYear;
    }
  }
  return null;
}

/** 월별 snapshot에서 shortfall > 0인 달의 합산 */
export function extractTotalLateLifeShortfall(snapshots: MonthlySnapshotV2[]): number {
  let total = 0;
  for (const s of snapshots) {
    if (s.shortfallThisMonth > 0) {
      total += s.shortfallThisMonth;
    }
  }
  return total;
}

/** 상환가용자금 = min(총 대출 잔액, 현금성 자산) */
function calcRepaymentFund(inputs: PlannerInputs): number {
  const totalDebt =
    inputs.debts.mortgage.balance +
    inputs.debts.creditLoan.balance +
    inputs.debts.otherLoan.balance;
  const cashLike = inputs.assets.cash.amount + inputs.assets.deposit.amount;
  return Math.min(totalDebt, cashLike);
}

function totalDebtBalance(inputs: PlannerInputs): number {
  return (
    inputs.debts.mortgage.balance +
    inputs.debts.creditLoan.balance +
    inputs.debts.otherLoan.balance
  );
}

// ── deep copy helper ──────────────────────────────────────────────

function cloneInputs(base: PlannerInputs): PlannerInputs {
  return JSON.parse(JSON.stringify(base));
}

// ── 7개 전략 정의 ──────────────────────────────────────────────────

function buildStrategies(): InputPatch[] {
  return [
    // 1. 은퇴 2년 늦추기
    {
      strategyId: 'delay_retire_2y',
      label: '은퇴 2년 늦추기',
      category: 'retire_timing',
      slotEligibility: ['best', 'practical'],
      practicality: 2,
      apply: (base) => {
        const patched = cloneInputs(base);
        patched.goal.retirementAge = base.goal.retirementAge + 2;
        return patched;
      },
      isApplicable: (base) =>
        base.goal.retirementAge + 2 <= base.goal.lifeExpectancy - 5,
    },

    // 2. 생활비 10% 줄이기
    {
      strategyId: 'reduce_expense_10',
      label: '생활비 10% 줄이기',
      category: 'expense_reduction',
      slotEligibility: ['best', 'practical'],
      practicality: 4,
      apply: (base) => {
        const patched = cloneInputs(base);
        patched.goal.targetMonthly = Math.round(base.goal.targetMonthly * 0.9);
        return patched;
      },
      isApplicable: (base) => base.goal.targetMonthly > 100,
    },

    // 3. 개인연금 월 30만원 추가
    {
      strategyId: 'add_private_pension',
      label: '개인연금 추가',
      category: 'pension_addition',
      slotEligibility: ['best', 'practical'],
      practicality: 3,
      apply: (base) => {
        const patched = cloneInputs(base);
        const newProduct = {
          id: 'counterfactual_private',
          label: '연금저축펀드',
          currentBalance: 0,
          monthlyContribution: 30,
          startAge: 65,
          startMonth: 0,
          payoutYears: 20,
          expectedReturnRate: 3.5,
          accumulationReturnRate: 3.5,
          payoutReturnRate: 2.0,
        };
        patched.pension.privatePension.enabled = true;
        patched.pension.privatePension.detailMode = true;
        patched.pension.privatePension.products = [
          ...patched.pension.privatePension.products,
          newProduct,
        ];
        return patched;
      },
      isApplicable: (base) => {
        const pp = base.pension.privatePension;
        if (!pp.enabled) return true;
        if (pp.detailMode) return pp.products.length === 0;
        return pp.monthlyContribution === 0 && pp.currentBalance === 0;
      },
    },

    // 4. 자동차 비용 제거
    {
      strategyId: 'remove_vehicle',
      label: '자동차 정리',
      category: 'vehicle_removal',
      slotEligibility: ['best', 'practical'],
      practicality: 5,
      apply: (base) => {
        const patched = cloneInputs(base);
        patched.vehicle = {
          ownershipType: 'none',
          costIncludedInExpense: 'separate',
          loanBalance: 0,
          loanRate: 0,
          loanMonths: 0,
          monthlyMaintenance: 0,
        };
        return patched;
      },
      isApplicable: (base) =>
        base.vehicle !== undefined && base.vehicle.ownershipType !== 'none',
    },

    // 5. 대출 조기상환
    {
      strategyId: 'debt_paydown',
      label: '대출 조기상환',
      category: 'debt_strategy',
      slotEligibility: ['best', 'practical'],
      practicality: 1,
      apply: (base) => {
        const patched = cloneInputs(base);
        const repaymentFund = calcRepaymentFund(base);

        // 상환가용자금만큼 대출 상환 (우선순위: 신용대출 → 기타대출 → 주담대)
        let budget = repaymentFund;
        const payDown = (field: 'creditLoan' | 'otherLoan' | 'mortgage') => {
          const bal = patched.debts[field].balance;
          const pay = Math.min(bal, budget);
          patched.debts[field].balance = bal - pay;
          if (patched.debts[field].balance <= 0) patched.debts[field].repaymentYears = 0;
          budget -= pay;
        };
        payDown('creditLoan');
        payDown('otherLoan');
        payDown('mortgage');

        // 현금성 자산에서 차감 (현금 먼저, 부족하면 예금)
        let remaining = repaymentFund;
        const origCash = base.assets.cash.amount;
        patched.assets.cash.amount = Math.max(0, origCash - remaining);
        remaining = Math.max(0, remaining - origCash);
        patched.assets.deposit.amount = Math.max(0, base.assets.deposit.amount - remaining);

        return patched;
      },
      isApplicable: (base) => {
        const debtTotal = totalDebtBalance(base);
        if (debtTotal <= 0) return false;
        return calcRepaymentFund(base) > 0;
      },
    },

    // 6. 대출 유지 + 투자
    {
      strategyId: 'debt_keep_invest',
      label: '대출 유지 + 투자',
      category: 'debt_strategy',
      slotEligibility: ['best', 'practical'],
      practicality: 1,
      apply: (base) => {
        const patched = cloneInputs(base);
        const transferAmount = calcRepaymentFund(base);

        // 현금성 자산에서 차감
        let remaining = transferAmount;
        const origCash = base.assets.cash.amount;
        patched.assets.cash.amount = Math.max(0, origCash - remaining);
        remaining = Math.max(0, remaining - origCash);
        patched.assets.deposit.amount = Math.max(0, base.assets.deposit.amount - remaining);

        // 투자자산(stock_kr)에 추가
        patched.assets.stock_kr.amount = base.assets.stock_kr.amount + transferAmount;

        return patched;
      },
      isApplicable: (base) => {
        const debtTotal = totalDebtBalance(base);
        if (debtTotal <= 0) return false;
        return calcRepaymentFund(base) > 0;
      },
    },

    // 7. 집 전략 (housing_best) — placeholder, 실제 비교는 별도 로직
    {
      strategyId: 'housing_best',
      label: '집 활용 전략',
      category: 'housing_strategy',
      slotEligibility: ['big_move'],
      practicality: 0,
      apply: (base) => base, // housing_best는 별도 로직으로 처리
      isApplicable: (base) => base.assets.realEstate.amount > 0,
    },
  ];
}

// ── Baseline 계산 ──────────────────────────────────────────────────

function computeBaseline(
  inputs: PlannerInputs,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
  debtSchedules: DebtSchedules,
): BaselineResult {
  const strategy = 'keep' as const;
  const sustainableMonthly = findMaxSustainableMonthlyV2(
    inputs, strategy, fundingPolicy, liquidationPolicy, debtSchedules,
  );

  const targetMonthly = inputs.goal.targetMonthly > 0
    ? inputs.goal.targetMonthly
    : sustainableMonthly;

  const snapshots = simulateMonthlyV2(
    inputs, targetMonthly, strategy, fundingPolicy, liquidationPolicy, debtSchedules,
  );

  const failureAge = findFailureAgeV2(snapshots);
  const deficitStartAge = extractDeficitStartAge(snapshots);
  const totalLateLifeShortfall = extractTotalLateLifeShortfall(snapshots);
  const survives = failureAge === null;

  return { sustainableMonthly, failureAge, deficitStartAge, totalLateLifeShortfall, survives };
}

// ── 개별 전략 시뮬레이션 ──────────────────────────────────────────

function simulateStrategy(
  patchedInputs: PlannerInputs,
  targetMonthly: number,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
): { sustainableMonthly: number; failureAge: number | null; deficitStartAge: number | null; totalLateLifeShortfall: number; survives: boolean } {
  const strategy = 'keep' as const;
  const patchedDebtSchedules = precomputeDebtSchedules(patchedInputs.debts);

  const sustainableMonthly = findMaxSustainableMonthlyV2(
    patchedInputs, strategy, fundingPolicy, liquidationPolicy, patchedDebtSchedules,
  );

  const simMonthly = targetMonthly > 0 ? targetMonthly : sustainableMonthly;
  const snapshots = simulateMonthlyV2(
    patchedInputs, simMonthly, strategy, fundingPolicy, liquidationPolicy, patchedDebtSchedules,
  );

  const failureAge = findFailureAgeV2(snapshots);
  const deficitStartAge = extractDeficitStartAge(snapshots);
  const totalLateLifeShortfall = extractTotalLateLifeShortfall(snapshots);
  const survives = failureAge === null;

  return { sustainableMonthly, failureAge, deficitStartAge, totalLateLifeShortfall, survives };
}

// ── ComparisonMetrics 생성 ──────────────────────────────────────

function buildMetrics(
  patch: InputPatch,
  baseline: BaselineResult,
  counterfactual: { sustainableMonthly: number; failureAge: number | null; deficitStartAge: number | null; totalLateLifeShortfall: number; survives: boolean },
): ComparisonMetrics {
  const failureAgeDelta =
    baseline.failureAge !== null && counterfactual.failureAge !== null
      ? counterfactual.failureAge - baseline.failureAge
      : baseline.failureAge !== null && counterfactual.failureAge === null
        ? Infinity // 고갈 방지됨
        : null;

  const deficitStartAgeDelta =
    baseline.deficitStartAge !== null && counterfactual.deficitStartAge !== null
      ? counterfactual.deficitStartAge - baseline.deficitStartAge
      : baseline.deficitStartAge !== null && counterfactual.deficitStartAge === null
        ? Infinity
        : null;

  return {
    strategyId: patch.strategyId,
    label: patch.label,
    category: patch.category,
    slotEligibility: patch.slotEligibility,
    practicality: patch.practicality,
    sustainableMonthlyDelta: counterfactual.sustainableMonthly - baseline.sustainableMonthly,
    failureAgeDelta,
    deficitStartAgeDelta,
    totalLateLifeShortfall: counterfactual.totalLateLifeShortfall,
    baselineLateLifeShortfall: baseline.totalLateLifeShortfall,
    newSustainableMonthly: counterfactual.sustainableMonthly,
    newFailureAge: counterfactual.failureAge,
    newDeficitStartAge: counterfactual.deficitStartAge,
    baselineSurvives: baseline.survives,
    counterfactualSurvives: counterfactual.survives,
  };
}

// ── 카테고리 내 경쟁 ──────────────────────────────────────────────

/** debt_strategy 카테고리 내 경쟁: 전체 rankMetrics 기준으로 승자 선발 */
function resolveDebtCompetition(metrics: ComparisonMetrics[]): ComparisonMetrics | null {
  const debtMetrics = metrics.filter((m) => m.category === 'debt_strategy');
  if (debtMetrics.length === 0) return null;
  if (debtMetrics.length === 1) return debtMetrics[0];

  // 전체 랭킹 기준(고갈 방지 > 적자 시작 개선 > 생활비 증가 > 실행 가능성)으로 정렬
  debtMetrics.sort(rankMetrics);

  return debtMetrics[0];
}

// ── housing_best 선발 로직 (섹션 3.4) ──────────────────────────

function selectHousingBest(
  propertyOptions: PropertyOptionResult[],
  baseline: BaselineResult,
): ComparisonMetrics | null {
  const sell = propertyOptions.find((o) => o.strategy === 'sell');
  const secured = propertyOptions.find((o) => o.strategy === 'secured_loan');
  if (!sell || !secured) return null;

  // 각 옵션의 deficitStartAge 추출을 위해 snapshot 필요
  // yearlyAggregates의 months에서 추출
  const sellSnapshots = sell.yearlyAggregates.flatMap((a) => a.months);
  const securedSnapshots = secured.yearlyAggregates.flatMap((a) => a.months);

  const sellDeficit = extractDeficitStartAge(sellSnapshots);
  const securedDeficit = extractDeficitStartAge(securedSnapshots);
  const sellShortfall = extractTotalLateLifeShortfall(sellSnapshots);
  const securedShortfall = extractTotalLateLifeShortfall(securedSnapshots);

  // 비교 기준 순차 적용
  let winner: 'sell' | 'secured_loan';

  // 1. 기대수명 전 고갈 해소 여부
  if (sell.survivesToLifeExpectancy !== secured.survivesToLifeExpectancy) {
    winner = sell.survivesToLifeExpectancy ? 'sell' : 'secured_loan';
  }
  // 2. 적자 시작 시점
  else if (sellDeficit !== securedDeficit) {
    const sd = sellDeficit ?? Infinity;
    const secd = securedDeficit ?? Infinity;
    if (sd !== secd) {
      winner = sd > secd ? 'sell' : 'secured_loan';
    } else {
      winner = 'secured_loan'; // 동점 시 secured_loan 우선
    }
  }
  // 3. 지속가능 생활비
  else if (sell.sustainableMonthly !== secured.sustainableMonthly) {
    winner = sell.sustainableMonthly > secured.sustainableMonthly ? 'sell' : 'secured_loan';
  }
  // 4. 비슷하면 secured_loan 우선
  else {
    winner = 'secured_loan';
  }

  // "비슷하다" 체크: 4번 규칙 적용
  const monthlyDiff = Math.abs(sell.sustainableMonthly - secured.sustainableMonthly);
  const sellFail = sell.failureAge ?? Infinity;
  const secFail = secured.failureAge ?? Infinity;
  const failDiff = Math.abs(sellFail - secFail);
  if (monthlyDiff <= 12 && failDiff <= 2) {
    winner = 'secured_loan';
  }

  const winnerOption = winner === 'sell' ? sell : secured;
  const winnerDeficit = winner === 'sell' ? sellDeficit : securedDeficit;
  const winnerShortfall = winner === 'sell' ? sellShortfall : securedShortfall;

  // baseline(keep)과 비교해서 delta 계산
  const sustainableDelta = winnerOption.sustainableMonthly - baseline.sustainableMonthly;
  const failureAgeDelta =
    baseline.failureAge !== null && winnerOption.failureAge !== null
      ? winnerOption.failureAge - baseline.failureAge
      : baseline.failureAge !== null && winnerOption.failureAge === null
        ? Infinity
        : null;

  const deficitDelta =
    baseline.deficitStartAge !== null && winnerDeficit !== null
      ? winnerDeficit - baseline.deficitStartAge
      : baseline.deficitStartAge !== null && winnerDeficit === null
        ? Infinity
        : null;

  // delta ≤ 0이면 housing_best 제외
  const hasPositiveEffect =
    sustainableDelta > 0 ||
    (failureAgeDelta !== null && failureAgeDelta > 0) ||
    (deficitDelta !== null && deficitDelta > 0) ||
    (!baseline.survives && winnerOption.survivesToLifeExpectancy);

  if (!hasPositiveEffect) return null;

  return {
    strategyId: 'housing_best',
    label: winner === 'sell' ? '집 매각' : '집 담보대출',
    category: 'housing_strategy',
    slotEligibility: ['big_move'],
    practicality: 0,
    sustainableMonthlyDelta: sustainableDelta,
    failureAgeDelta,
    deficitStartAgeDelta: deficitDelta,
    totalLateLifeShortfall: winnerShortfall,
    baselineLateLifeShortfall: baseline.totalLateLifeShortfall,
    newSustainableMonthly: winnerOption.sustainableMonthly,
    newFailureAge: winnerOption.failureAge,
    newDeficitStartAge: winnerDeficit,
    baselineSurvives: baseline.survives,
    counterfactualSurvives: winnerOption.survivesToLifeExpectancy,
  };
}

// ── 랭킹 (섹션 2.4) ──────────────────────────────────────────────

function rankMetrics(a: ComparisonMetrics, b: ComparisonMetrics): number {
  // 1. 고갈 방지: baseline 고갈 → counterfactual 생존
  const aPreventsFail = !a.baselineSurvives && a.counterfactualSurvives;
  const bPreventsFail = !b.baselineSurvives && b.counterfactualSurvives;
  if (aPreventsFail !== bPreventsFail) return aPreventsFail ? -1 : 1;

  // 2. 적자 시작 시점 개선
  const aDeficit = a.deficitStartAgeDelta ?? 0;
  const bDeficit = b.deficitStartAgeDelta ?? 0;
  if (aDeficit !== bDeficit) return bDeficit - aDeficit; // 큰 개선이 앞

  // 3. 말년 적자 총합 개선 (줄인 폭이 클수록 앞)
  const aImprovement = a.baselineLateLifeShortfall - a.totalLateLifeShortfall;
  const bImprovement = b.baselineLateLifeShortfall - b.totalLateLifeShortfall;
  if (aImprovement !== bImprovement) return bImprovement - aImprovement;

  // 4. 생활비 증가
  if (a.sustainableMonthlyDelta !== b.sustainableMonthlyDelta) {
    return b.sustainableMonthlyDelta - a.sustainableMonthlyDelta;
  }

  // 5. 실행 가능성 (높을수록 좋음)
  return b.practicality - a.practicality;
}

// ── 3-슬롯 배정 (섹션 4.3) ──────────────────────────────────────

function assignSlots(candidates: ComparisonMetrics[]): SlottedRecommendation[] {
  const slots: SlottedRecommendation[] = [];
  const usedCategories = new Set<StrategyCategory>();

  // 최소 추천 임계값: 사용자에게 설명 가능한 개선이 있는 전략만 통과
  // shortfall 개선은 필터 조건이 아니라 rankMetrics 정렬 보조 지표로만 사용
  const MIN_MONTHLY_DELTA = 5; // 만원
  const positive = candidates.filter((m) => {
    const preventsFail = !m.baselineSurvives && m.counterfactualSurvives;
    const improvesFailureAge = m.failureAgeDelta !== null && m.failureAgeDelta > 0;
    const improvesDeficitStart = m.deficitStartAgeDelta !== null && m.deficitStartAgeDelta > 0;
    const meaningfulMonthlyGain = m.sustainableMonthlyDelta >= MIN_MONTHLY_DELTA;

    return preventsFail || improvesFailureAge || improvesDeficitStart || meaningfulMonthlyGain;
  });

  // 랭킹 정렬
  const ranked = [...positive].sort(rankMetrics);

  // ① best: slotEligibility에 'best' 포함, big_move 전용 제외
  const bestCandidates = ranked.filter(
    (m) => m.slotEligibility.includes('best') && !m.slotEligibility.every((s) => s === 'big_move'),
  );
  if (bestCandidates.length > 0) {
    const best = bestCandidates[0];
    slots.push({ slot: 'best', metrics: best });
    usedCategories.add(best.category);
  }

  // ② practical: best와 다른 카테고리 중 실행 가능성 최고. 조건 충족 후보 없으면 슬롯 비움
  const practicalCandidates = ranked.filter(
    (m) =>
      !usedCategories.has(m.category) &&
      m.slotEligibility.includes('practical') &&
      !m.slotEligibility.every((s) => s === 'big_move'),
  );
  if (practicalCandidates.length > 0) {
    // 실행 가능성 점수 기준 정렬 (동일하면 랭킹 순 유지)
    const sorted = [...practicalCandidates].sort((a, b) => {
      if (a.practicality !== b.practicality) return b.practicality - a.practicality;
      return 0; // 이미 랭킹 순으로 정렬되어 있음
    });
    const practical = sorted[0];
    slots.push({ slot: 'practical', metrics: practical });
    usedCategories.add(practical.category);
  }

  // ③ big_move: slotEligibility에 'big_move' 포함
  const bigMoveCandidates = ranked.filter(
    (m) =>
      !usedCategories.has(m.category) &&
      m.slotEligibility.includes('big_move'),
  );
  if (bigMoveCandidates.length > 0) {
    slots.push({ slot: 'big_move', metrics: bigMoveCandidates[0] });
  }

  // ④ 최종 검증: 같은 카테고리 2개 이상이면 하위 슬롯 제거
  const categoryCount = new Map<StrategyCategory, number>();
  for (const s of slots) {
    categoryCount.set(s.metrics.category, (categoryCount.get(s.metrics.category) ?? 0) + 1);
  }
  for (const [cat, count] of categoryCount) {
    if (count > 1) {
      // big_move 먼저 제거, 그다음 practical
      const idx = slots.findLastIndex((s) => s.metrics.category === cat);
      if (idx >= 0) slots.splice(idx, 1);
    }
  }

  return slots;
}

// ── 메인 진입 함수 ──────────────────────────────────────────────

export function runCounterfactualAnalysis(
  inputs: PlannerInputs,
  propertyOptions: PropertyOptionResult[],
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
  debtSchedules: DebtSchedules,
): CounterfactualResult {
  // 1. Baseline 계산
  const baseline = computeBaseline(inputs, fundingPolicy, liquidationPolicy, debtSchedules);

  // 2. 전략 후보 빌드
  const strategies = buildStrategies();
  const allMetrics: ComparisonMetrics[] = [];

  // 3. 각 전략 시뮬레이션 (housing_best 제외)
  for (const patch of strategies) {
    if (patch.strategyId === 'housing_best') continue;
    if (!patch.isApplicable(inputs, baseline)) continue;

    const patchedInputs = patch.apply(inputs);
    const result = simulateStrategy(
      patchedInputs,
      inputs.goal.targetMonthly,
      fundingPolicy,
      liquidationPolicy,
    );
    const metrics = buildMetrics(patch, baseline, result);
    allMetrics.push(metrics);
  }

  // 4. 카테고리 내 경쟁 해소 (debt_strategy)
  const debtWinner = resolveDebtCompetition(allMetrics);
  const nonDebtMetrics = allMetrics.filter((m) => m.category !== 'debt_strategy');
  const resolvedMetrics = debtWinner
    ? [...nonDebtMetrics, debtWinner]
    : nonDebtMetrics;

  // 5. housing_best 선발 (기존 propertyOptions 재사용)
  const housingPatch = strategies.find((s) => s.strategyId === 'housing_best')!;
  if (housingPatch.isApplicable(inputs, baseline)) {
    const housingMetrics = selectHousingBest(propertyOptions, baseline);
    if (housingMetrics) {
      resolvedMetrics.push(housingMetrics);
    }
  }

  // 6. 3-슬롯 배정
  const slots = assignSlots(resolvedMetrics);

  return { baseline, allMetrics: resolvedMetrics, slots };
}
