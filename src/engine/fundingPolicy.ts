/** V2 자금 운용 정책 설정값 */
export interface FundingPolicy {
  /**
   * 유동성 버퍼: 목표 월 생활비의 몇 개월치를 현금성 잔고 최솟값으로 유지.
   * 이 수준 아래로 내려가면 투자자산 매도로 보충한다.
   * 기본값: 6개월
   */
  liquidityBufferMonths: number;
}

export const DEFAULT_FUNDING_POLICY: FundingPolicy = {
  liquidityBufferMonths: 6,
};

/**
 * 투자자산(financialInvestable) 매도 방식.
 * V2 첫 버전에서는 pro_rata만 구현하고, 나머지는 확장 예약.
 */
export type LiquidationStrategy = 'pro_rata' | 'high_volatility_first' | 'low_return_first';

export interface LiquidationPolicy {
  strategy: LiquidationStrategy;
}

export const DEFAULT_LIQUIDATION_POLICY: LiquidationPolicy = {
  strategy: 'pro_rata',
};
