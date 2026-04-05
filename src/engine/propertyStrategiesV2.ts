/**
 * V2 부동산 전략 타입 및 UI 레이블
 */

export type PropertyStrategyV2 = 'keep' | 'secured_loan' | 'sell';

/** 부동산 전략별 UI 레이블 */
export const PROPERTY_STRATEGY_LABELS: Record<PropertyStrategyV2, string> = {
  keep: '집 안 건드리기',
  secured_loan: '집에 살며 현금흐름 만들기',
  sell: '집 팔고 생활비 늘리기',
};
