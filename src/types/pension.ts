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

export interface PrivatePensionInput {
  enabled: boolean;
  mode: PensionInputMode;
  startAge: number;                  // default max(55, retirementAge)
  payoutYears: number;               // default 20
  currentBalance: number;            // 현재 적립금 (만원)
  monthlyContribution: number;       // 월 납입액 (만원)
  accumulationReturnRate: number;    // 적립 수익률 (%), default 3.5
  payoutReturnRate: number;          // 수령 수익률 (%), default 2.0
  manualMonthlyTodayValue: number;   // 0 = 미입력, 단위: 만원
}

export interface PensionInputs {
  publicPension: PublicPensionInput;
  retirementPension: RetirementPensionInput;
  privatePension: PrivatePensionInput;
}
