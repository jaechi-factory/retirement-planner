/**
 * V2 부동산 전략 상수 및 타입
 */
import { getPlannerPolicy } from '../policy/policyTable';

const propertyPolicy = getPlannerPolicy().property;

export type PropertyStrategyV2 = 'keep' | 'secured_loan' | 'sell';

/** 집 매각 시 거래비용·세금 헤어컷 (매각가 대비 비율) */
export const PROPERTY_SALE_HAIRCUT = propertyPolicy.propertySaleHaircut;

/** 집 매각 후 월세 — 현재가치 기준 (만원/월) */
export const RENTAL_BASE_MONTHLY_TODAY = propertyPolicy.rentalBaseMonthlyToday;

/** 집 매각 대금 운용 연 수익률 */
export const SALE_PROCEEDS_ANNUAL_RETURN = propertyPolicy.saleProceedsAnnualReturn;

/** 담보대출 LTV (부동산 평가액 대비 최대 대출 비율) */
export const SECURED_LOAN_LTV = propertyPolicy.securedLoanLtv;

/** 담보대출 연 금리 기본값 */
export const SECURED_LOAN_ANNUAL_RATE = propertyPolicy.securedLoanAnnualRate;

/** 부동산 전략별 UI 레이블 */
export const PROPERTY_STRATEGY_LABELS: Record<PropertyStrategyV2, string> = {
  keep: '집 안 건드리기',
  secured_loan: '집에 살며 현금흐름 만들기',
  sell: '집 팔고 생활비 늘리기',
};
