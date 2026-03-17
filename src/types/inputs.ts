export interface RetirementGoal {
  retirementAge: number;       // 은퇴나이
  lifeExpectancy: number;      // 기대수명
  targetMonthly: number;       // 목표 월 생활비 (만원, 현재가치)
  inflationRate: number;       // 물가상승률 (%)
}

export interface CurrentStatus {
  currentAge: number;          // 현재나이
  annualIncome: number;        // 세후 연소득 (만원, 실수령 기준 — 소득세·4대보험 공제 후)
  incomeGrowthRate: number;    // 수입 증가율 (%)
  annualExpense: number;       // 연소비 (만원)
  expenseGrowthRate: number;   // 은퇴 전 지출 증가율 (%)
}

export interface AssetItem {
  amount: number;              // 금액 (만원)
  expectedReturn: number;      // 기대수익률 (%)
}

export interface AssetAllocation {
  cash: AssetItem;
  deposit: AssetItem;
  stock_kr: AssetItem;
  stock_us: AssetItem;
  bond: AssetItem;
  crypto: AssetItem;
  realEstate: AssetItem;
}

export type RepaymentType = 'equal_payment' | 'equal_principal' | 'interest_only';

export interface DebtItem {
  balance: number;             // 잔액 (만원)
  interestRate: number;        // 이자율 (연 %)
  repaymentType: RepaymentType; // 상환 방식
  repaymentYears: number;      // 상환 기간 (년)
}

export interface DebtAllocation {
  mortgage: DebtItem;
  creditLoan: DebtItem;
  otherLoan: DebtItem;
}

export interface ChildrenInfo {
  hasChildren: boolean;
  count: number;
  monthlyPerChild: number;     // 1인당 월 지출 (만원)
  independenceAge: number;     // 자녀 독립 시 사용자 나이
}

import type { PensionInputs } from './pension';

export interface PlannerInputs {
  goal: RetirementGoal;
  status: CurrentStatus;
  assets: AssetAllocation;
  debts: DebtAllocation;
  children: ChildrenInfo;
  pension: PensionInputs;
}
