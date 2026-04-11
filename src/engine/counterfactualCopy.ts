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
  best: '가장 효과적',
  practical: '바로 실행 가능',
  big_move: '큰 결정',
};

export function getSlotLabel(slot: SlotType): string {
  return SLOT_LABELS[slot];
}

// ── Headline 생성 ──────────────────────────────────────────────

export function generateHeadline(m: ComparisonMetrics): string {
  const { strategyId, sustainableMonthlyDelta, failureAgeDelta, deficitStartAgeDelta } = m;

  // 고갈 방지가 최우선
  const preventsFailure = !m.baselineSurvives && m.counterfactualSurvives;

  switch (strategyId) {
    case 'delay_retire_2y': {
      if (preventsFailure) {
        return '은퇴를 2년 늦추면 자금 고갈 없이 기대수명까지 유지돼요';
      }
      if (sustainableMonthlyDelta > 0) {
        return `은퇴를 2년 늦추면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `은퇴를 2년 늦추면 적자 시작이 ${Math.round(deficitStartAgeDelta)}년 늦춰져요`;
      }
      return `은퇴를 2년 늦추면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`;
    }

    case 'reduce_expense_10': {
      const cut = Math.round(m.newSustainableMonthly / 0.9 - m.newSustainableMonthly);
      if (preventsFailure) {
        return `생활비를 월 ${fmtKRW(cut)} 줄이면 자금 고갈 없이 유지돼요`;
      }
      if (deficitStartAgeDelta !== null && deficitStartAgeDelta > 0 && deficitStartAgeDelta !== Infinity) {
        return `생활비를 월 ${fmtKRW(cut)} 줄이면 적자 시작이 ${Math.round(deficitStartAgeDelta)}년 늦춰져요`;
      }
      return `생활비를 10% 줄이면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`;
    }

    case 'add_private_pension': {
      if (preventsFailure) {
        return '개인연금에 월 30만원을 넣으면 자금 고갈을 방지할 수 있어요';
      }
      return `개인연금에 월 30만원을 넣으면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`;
    }

    case 'remove_vehicle': {
      if (preventsFailure) {
        return '자동차를 정리하면 자금 고갈 없이 기대수명까지 유지돼요';
      }
      return `자동차를 정리하면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`;
    }

    case 'debt_paydown': {
      return `대출을 지금 갚으면 유지하는 것보다 월 ${fmtKRW(sustainableMonthlyDelta)} 더 여유가 생겨요`;
    }

    case 'debt_keep_invest': {
      return `대출을 유지하면서 투자하면 조기상환보다 월 ${fmtKRW(sustainableMonthlyDelta)} 더 여유가 생겨요`;
    }

    case 'housing_best': {
      const isSecured = m.label === '집 담보대출';
      if (preventsFailure) {
        return isSecured
          ? '집을 담보로 대출받으면 자금 고갈 없이 기대수명까지 유지돼요'
          : '집을 매각하면 자금 고갈 없이 기대수명까지 유지돼요';
      }
      if (failureAgeDelta !== null && failureAgeDelta > 0 && failureAgeDelta !== Infinity) {
        return isSecured
          ? `집을 담보로 대출받으면 자금 고갈을 ${Math.round(failureAgeDelta)}년 늦출 수 있어요`
          : `집을 매각하면 자금 고갈을 ${Math.round(failureAgeDelta)}년 늦출 수 있어요`;
      }
      return isSecured
        ? `집을 담보로 대출받으면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`
        : `집을 매각하면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`;
    }

    default:
      return `이 전략을 실행하면 월 가능 생활비가 ${fmtKRW(sustainableMonthlyDelta)} 늘어나요`;
  }
}

// ── Detail 생성 ──────────────────────────────────────────────────

export function generateDetail(m: ComparisonMetrics, baselineSustainable: number): string {
  const parts: string[] = [];

  switch (m.strategyId) {
    case 'delay_retire_2y':
      parts.push(`월 ${fmtKRW(baselineSustainable)} → ${fmtKRW(m.newSustainableMonthly)}`);
      break;
    case 'reduce_expense_10':
      parts.push(`목표 생활비를 10% 낮추면 유지 가능 기간이 늘어나요`);
      break;
    case 'add_private_pension':
      parts.push(`65세부터 20년간 개인연금 수령 기준`);
      break;
    case 'remove_vehicle':
      parts.push(`차량 유지비와 할부금이 없어지는 효과`);
      break;
    case 'debt_paydown':
      parts.push(`현금성 자산으로 대출을 전액 상환하는 경우`);
      break;
    case 'debt_keep_invest':
      parts.push(`상환 가능 금액을 투자자산으로 이전하는 경우`);
      break;
    case 'housing_best':
      parts.push(`현재 집 전략(유지)과 비교한 결과`);
      break;
  }

  // 적자 시작 시점 변화
  if (m.deficitStartAgeDelta !== null && m.deficitStartAgeDelta > 0 && m.deficitStartAgeDelta !== Infinity) {
    parts.push(`적자 시작 ${Math.round(m.deficitStartAgeDelta)}년 지연`);
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

  // 생활비 변화
  if (m.sustainableMonthlyDelta > 0) {
    badges.push({ text: `+${fmtKRW(m.sustainableMonthlyDelta)}/월`, type: 'positive' });
  }

  // 적자 시작 변화
  if (m.deficitStartAgeDelta !== null && m.deficitStartAgeDelta > 0) {
    if (m.deficitStartAgeDelta === Infinity) {
      badges.push({ text: '적자 해소', type: 'positive' });
    } else {
      badges.push({ text: `적자 시작 +${Math.round(m.deficitStartAgeDelta)}년`, type: 'positive' });
    }
  }

  // 고갈 시점 변화
  if (!m.baselineSurvives && m.counterfactualSurvives) {
    badges.push({ text: '고갈 방지 ✓', type: 'positive' });
  } else if (m.failureAgeDelta !== null && m.failureAgeDelta > 0 && m.failureAgeDelta !== Infinity) {
    badges.push({ text: `고갈 시점 +${Math.round(m.failureAgeDelta)}년`, type: 'positive' });
  }

  // 최대 3개
  return badges.slice(0, 3);
}
