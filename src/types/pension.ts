export type PensionInputMode = 'auto' | 'manual';

export interface PublicPensionInput {
  enabled: boolean;
  mode: PensionInputMode;
  startAge: number;                  // default 65
  manualMonthlyTodayValue: number;   // 0 = 미입력, 단위: 만원
}

export interface RetirementPensionInput {
  enabled: boolean;
  mode: PensionInputMode;
  startAge: number;                  // default max(55, retirementAge)
  payoutYears: number;               // default 20
  currentBalance: number;            // 현재 적립금 (만원), 0 = 모름
  accumulationReturnRate: number;    // 적립 수익률 (%), default 3.5
  payoutReturnRate: number;          // 수령 수익률 (%), default 2.0
  manualMonthlyTodayValue: number;   // 0 = 미입력, 단위: 만원
}

/** 개인연금 개별 상품 (상세 모드에서 사용) */
export interface PrivatePensionProduct {
  id: string;
  label: string;                     // 'IRP' | '연금저축펀드' | '연금보험' | '기타'
  currentBalance: number;
  monthlyContribution: number;
  startAge: number;
  payoutYears: number;
  expectedReturnRate: number;        // 기본 단일 수익률
  accumulationReturnRate: number;    // 고급 설정: 모으는 동안
  payoutReturnRate: number;          // 고급 설정: 받는 동안
}

export interface PrivatePensionInput {
  enabled: boolean;
  mode: PensionInputMode;

  // 기본 모드 입력값
  startAge: number;
  payoutYears: number;
  currentBalance: number;
  monthlyContribution: number;
  expectedReturnRate: number;        // 단일 수익률 (accum/payout 동일값으로 매핑)
  accumulationReturnRate: number;    // 고급 설정: 모으는 동안
  payoutReturnRate: number;          // 고급 설정: 받는 동안
  manualMonthlyTodayValue: number;

  // 상세 모드
  detailMode: boolean;
  products: PrivatePensionProduct[];
}

export interface PensionInputs {
  publicPension: PublicPensionInput;
  retirementPension: RetirementPensionInput;
  privatePension: PrivatePensionInput;
}
