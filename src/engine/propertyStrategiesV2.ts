/**
 * V2 부동산 전략 상수 및 타입
 */

export type PropertyStrategyV2 = 'keep' | 'secured_loan' | 'sell';

/** 집 매각 시 거래비용·세금 헤어컷 (매각가 대비 비율) */
export const PROPERTY_SALE_HAIRCUT = 0.05;

/** 매각 후 임차 주거비 연 비율 (매각 순수익 대비) */
export const POST_SALE_RENTAL_ANNUAL_YIELD = 0.04;

/** 담보대출 LTV (부동산 평가액 대비 최대 대출 비율) */
export const SECURED_LOAN_LTV = 0.60;

/** 담보대출 연 금리 기본값 */
export const SECURED_LOAN_ANNUAL_RATE = 0.045;

/** 부동산 전략별 UI 레이블 */
export const PROPERTY_STRATEGY_LABELS: Record<PropertyStrategyV2, string> = {
  keep: '집 그냥 두기',
  secured_loan: '집 담보로 버티기',
  sell: '집 팔아서 현금화',
};
