/**
 * 반사실 시뮬레이션 결과에 대한 사용자 대면 텍스트 생성
 *
 * - headline: 1줄 bold 설명
 * - detail: 1-2줄 회색 보충 설명
 * - deltaBadges: 하단 태그 (최대 3개)
 */

import type { ComparisonMetrics, SlotType } from './counterfactualEngine';
import { fmtKRW } from '../utils/format';

// ── 슬롯 라벨 ──────────────────────────────────────────────────

const SLOT_LABELS: Record<SlotType, string> = {
  best: '효과 제일 큼',
  practical: '당장 할 수 있음',
  big_move: '큰 결정 필요',
};

export function getSlotLabel(slot: SlotType): string {
  return SLOT_LABELS[slot];
}

// ── Headline 생성 ──────────────────────────────────────────────

export function generateHeadline(m: ComparisonMetrics, targetMonthly: number): string {
  const { strategyId, sustainableMonthlyDelta, failureAgeDelta, deficitStartAgeDelta } = m;
  const baseFailAge = m.newFailureAge !== null && failureAgeDelta !== null
    ? Math.round(m.newFailureAge - failureAgeDelta)
    : null;
  const newFailAge = m.newFailureAge !== null ? Math.round(m.newFailureAge) : null;
  const budget = targetMonthly > 0 ? `월 ${fmtKRW(targetMonthly)} 기준, ` : '';

  // 고갈 방지가 최우선
  const preventsFailure = !m.baselineSurvives && m.counterfactualSurvives;

  switch (strategyId) {
    case 'delay_retire_2y': {
      if (preventsFailure) {
        return '은퇴를 2년 더 미루면, 죽을 때까지 돈 걱정 없이 살 수 있어요';
      }
      if (sustainableMonthlyDelta > 0) {
        return `은퇴를 2년 더 미루면, 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `은퇴를 2년 더 미루면, 돈이 부족해지는 시점을 ${Math.round(deficitStartAgeDelta)}년 늦출 수 있어요`;
      }
      return `은퇴를 2년 더 미루면, 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
    }

    case 'reduce_expense_10': {
      const cut = Math.round(m.newSustainableMonthly / 0.9 - m.newSustainableMonthly);
      if (preventsFailure) {
        return `지금부터 매달 ${fmtKRW(cut)}씩 덜 쓰면, 죽을 때까지 돈 걱정이 없어요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `지금부터 매달 ${fmtKRW(cut)}씩 덜 쓰면, 돈이 부족해지는 시점을 ${Math.round(deficitStartAgeDelta)}년 늦출 수 있어요`;
      }
      return `지금부터 생활비를 10%만 줄이면, 나중에 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
    }

    case 'add_private_pension': {
      if (preventsFailure) {
        return '개인연금에 매달 30만원씩 붓기만 해도, 돈이 바닥나는 걸 막을 수 있어요';
      }
      if (failureAgeDelta !== null && failureAgeDelta > 0 && failureAgeDelta !== Infinity) {
        return `개인연금에 매달 30만원씩 붓기만 해도, 돈이 바닥나는 시점이 ${baseFailAge}세에서 ${newFailAge}세로 미뤄져요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `개인연금에 매달 30만원씩 붓기만 해도, 돈이 부족해지는 시점을 ${Math.round(deficitStartAgeDelta)}년 늦출 수 있어요`;
      }
      return `개인연금에 매달 30만원씩 붓기만 해도, 은퇴 후 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
    }

    case 'remove_vehicle': {
      if (preventsFailure) {
        return '차를 정리하면, 죽을 때까지 돈 걱정 없이 살 수 있어요';
      }
      if (failureAgeDelta !== null && failureAgeDelta > 0 && failureAgeDelta !== Infinity) {
        return `차를 정리하면, 돈이 바닥나는 시점이 ${baseFailAge}세에서 ${newFailAge}세로 미뤄져요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `차를 정리하면, 돈이 부족해지는 시점을 ${Math.round(deficitStartAgeDelta)}년 늦출 수 있어요`;
      }
      return `차를 정리하면, 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
    }

    case 'debt_paydown': {
      if (preventsFailure) {
        return '지금 대출을 한 번에 갚으면, 죽을 때까지 돈 걱정이 없어요';
      }
      if (failureAgeDelta !== null && failureAgeDelta > 0 && failureAgeDelta !== Infinity) {
        return `지금 대출을 한 번에 갚으면, 돈이 바닥나는 시점이 ${baseFailAge}세에서 ${newFailAge}세로 미뤄져요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `지금 대출을 한 번에 갚으면, 돈이 부족해지는 시점을 ${Math.round(deficitStartAgeDelta)}년 늦출 수 있어요`;
      }
      return `지금 대출을 한 번에 갚으면, 그냥 계속 내는 것보다 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
    }

    case 'debt_keep_invest': {
      if (preventsFailure) {
        return '대출은 그냥 두고 그 돈을 투자하면, 죽을 때까지 돈 걱정이 없어요';
      }
      if (failureAgeDelta !== null && failureAgeDelta > 0 && failureAgeDelta !== Infinity) {
        return `대출은 그냥 두고 그 돈을 투자하면, 돈이 바닥나는 시점이 ${baseFailAge}세에서 ${newFailAge}세로 미뤄져요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `대출은 그냥 두고 그 돈을 투자하면, 돈이 부족해지는 시점을 ${Math.round(deficitStartAgeDelta)}년 늦출 수 있어요`;
      }
      return `대출은 그냥 두고 그 돈을 투자하면, 한 번에 갚는 것보다 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
    }

    case 'housing_best': {
      const isSecured = m.label === '집 담보대출';
      if (preventsFailure) {
        return isSecured
          ? '집을 담보로 돈을 빌려 쓰면, 죽을 때까지 돈 걱정이 없어요'
          : '집을 팔아서 생활비로 쓰면, 죽을 때까지 돈 걱정이 없어요';
      }
      if (failureAgeDelta !== null && failureAgeDelta > 0 && failureAgeDelta !== Infinity) {
        return isSecured
          ? `집을 담보로 돈을 빌려 쓰면, 돈이 바닥나는 시점이 ${baseFailAge}세에서 ${newFailAge}세로 미뤄져요`
          : `집을 팔아서 생활비로 쓰면, 돈이 바닥나는 시점이 ${baseFailAge}세에서 ${newFailAge}세로 미뤄져요`;
      }
      return isSecured
        ? `집을 담보로 돈을 빌려 쓰면, 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`
        : `집을 팔아서 생활비로 쓰면, 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
    }

    default:
      return `이 방법을 쓰면, 매달 ${fmtKRW(sustainableMonthlyDelta)}씩 더 쓸 수 있어요`;
  }
}

// ── Detail 생성 ──────────────────────────────────────────────────

export function generateDetail(m: ComparisonMetrics, baselineSustainable: number): string {
  const parts: string[] = [];

  switch (m.strategyId) {
    case 'delay_retire_2y':
      parts.push(`지금은 매달 ${fmtKRW(baselineSustainable)} 쓸 수 있는데, ${fmtKRW(m.newSustainableMonthly)}까지 늘어나요`);
      break;
    case 'reduce_expense_10':
      parts.push(`지출을 조금만 줄여도, 모은 돈이 더 오래 버텨줘요`);
      break;
    case 'add_private_pension':
      parts.push(`65세부터 20년 동안 매달 개인연금을 받는 걸 기준으로 계산했어요`);
      break;
    case 'remove_vehicle':
      parts.push(`차 유지비랑 할부금이 빠져서 그만큼 여유가 생겨요`);
      break;
    case 'debt_paydown':
      parts.push(`지금 모아둔 돈으로 남은 대출을 전부 갚는 경우예요`);
      break;
    case 'debt_keep_invest':
      parts.push(`대출을 갚을 수 있는 돈을 대신 투자에 쓰는 경우예요`);
      break;
    case 'housing_best':
      parts.push(`지금 설정한 집 유지와 비교한 결과예요`);
      break;
  }

  // 돈이 부족해지는 시점 변화
  if (m.deficitStartAgeDelta !== null && m.deficitStartAgeDelta > 0 && m.deficitStartAgeDelta !== Infinity) {
    parts.push(`돈이 부족해지는 시점도 ${Math.round(m.deficitStartAgeDelta)}년 늦춰져요`);
  }

  return parts.join('. ');
}

// ── Delta Badges ──────────────────────────────────────────────────

export interface DeltaBadge {
  text: string;
  type: 'positive' | 'neutral';
}

export function generateDeltaBadges(m: ComparisonMetrics): DeltaBadge[] {
  const badges: DeltaBadge[] = [];

  // 매달 쓸 수 있는 돈 변화
  if (m.sustainableMonthlyDelta > 0) {
    badges.push({ text: `매달 +${fmtKRW(m.sustainableMonthlyDelta)}`, type: 'positive' });
  }

  // 돈이 부족해지는 시점 변화
  if (m.deficitStartAgeDelta !== null && m.deficitStartAgeDelta > 0) {
    if (m.deficitStartAgeDelta === Infinity) {
      badges.push({ text: '돈 부족 걱정 없음', type: 'positive' });
    } else {
      badges.push({ text: `부족 시점 +${Math.round(m.deficitStartAgeDelta)}년`, type: 'positive' });
    }
  }

  // 돈이 바닥나는 시점 변화
  if (!m.baselineSurvives && m.counterfactualSurvives) {
    badges.push({ text: '끝까지 버틸 수 있어요', type: 'positive' });
  } else if (m.failureAgeDelta !== null && m.failureAgeDelta > 0 && m.failureAgeDelta !== Infinity) {
    badges.push({ text: `바닥 시점 +${Math.round(m.failureAgeDelta)}년`, type: 'positive' });
  }

  // 최대 3개
  return badges.slice(0, 3);
}
