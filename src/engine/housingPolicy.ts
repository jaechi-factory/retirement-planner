/**
 * 주택 자산 활용 정책 상수 및 타입
 *
 * 세 가지 시나리오:
 *  - keep      (A): 집 그대로 유지 — 금융자산만으로 생활비 충당
 *  - annuity   (B): 주택연금 활용 — 금융자산 고갈 시 주택연금 개시
 *  - liquidate (C): 집 매각     — 금융자산 고갈 시 집 팔고 임대
 */

/** 주택 활용 정책 */
export type HousingPolicy = 'keep' | 'annuity' | 'liquidate';

/** 매각 시 거래비용·세금 헤어컷 (7%) */
export const HOUSING_LIQUIDATION_HAIRCUT = 0.07;

/**
 * 매각 후 연 임대비용 = 매각 순수익 × 이 비율
 * (3%: 매각 대금을 임대 시장에서 굴리는 기회비용 가정)
 */
export const POST_SALE_HOUSING_COST_YIELD = 0.03;
