/**
 * V2 부동산 전략 타입 및 UI 레이블
 */

export type PropertyStrategyV2 = 'keep' | 'secured_loan' | 'sell';

/** 부동산 전략별 UI 레이블 */
export const PROPERTY_STRATEGY_LABELS: Record<PropertyStrategyV2, string> = {
  keep: '집을 그대로 둘 때',
  secured_loan: '집을 담보로 대출받을 때',
  sell: '집을 팔아 쓸 때',
};
