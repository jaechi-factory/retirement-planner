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

export type RepaymentType =
  | 'equal_payment'      // 원리금균등분할상환
  | 'equal_principal'    // 원금균등분할상환
  | 'graduated_payment'  // 체증식분할상환 (주담대 전용)
  | 'balloon_payment';   // 만기일시상환 (신용·기타대출 전용)

export interface DebtItem {
  balance: number;              // 잔액 (만원)
  interestRate: number;         // 이자율 (연 %)
  repaymentType: RepaymentType; // 상환 방식
  repaymentYears: number;       // 남은 상환기간 (년)
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
  costGrowthMode?: 'inflation' | 'fixed' | 'custom';
  customGrowthRate?: number;
}

import type { PensionInputs } from './pension';

// ─── 차량 ─────────────────────────────────────────────────────────────────────

/** 차량 보유 유형 */
export type VehicleOwnershipType = 'none' | 'owned' | 'buying' | 'lease';

/**
 * 차량 정보
 *
 * ownershipType별 활성 필드:
 * - none    : (없음)
 * - owned   : costIncludedInExpense, loanBalance, loanRate, loanMonths,
 *             monthlyMaintenance, disposalValue
 * - buying  : costIncludedInExpense, purchaseYearsFromNow, purchasePrice,
 *             loanRate, loanMonths, monthlyMaintenance, disposalValue
 * - lease   : costIncludedInExpense, leaseMonthlyPayment, leaseMonths,
 *             monthlyMaintenance, disposalValue
 */
export interface VehicleInfo {
  ownershipType: VehicleOwnershipType;

  /** 연소비에 이미 포함 여부 ('included' | 'separate') */
  costIncludedInExpense: 'included' | 'separate';

  // owned: 잔여 대출 잔액 + 이율 + 남은 기간
  loanBalance: number;       // 잔여 대출 잔액 (만원)
  loanRate: number;          // 이율 (연 %)
  loanMonths: number;        // 남은 상환 기간 (개월)

  // buying only: 구매 시점 + 가격
  purchaseYearsFromNow: number;  // 몇 년 후 구매 (0 = 즉시)
  purchasePrice: number;         // 선수금 / 현금 지불 금액 (만원) — 구매 시점 일시 지출
  loanAmount: number;            // 대출 원금 (만원) — 할부로 빌리는 금액 (buying 전용)

  // lease only: 월 납입액 + 남은 기간
  leaseMonthlyPayment: number;   // 월 납입액 (만원)
  leaseMonths: number;           // 남은 기간 (개월)

  // 공통 (none 제외)
  monthlyMaintenance: number;    // 월 유지비 - 보험·주유·수리 (만원)
  disposalValue: number;         // 종료 시 처분가 or 보증금 반환액 (만원)
}

export interface PlannerInputs {
  goal: RetirementGoal;
  status: CurrentStatus;
  assets: AssetAllocation;
  debts: DebtAllocation;
  children: ChildrenInfo;
  pension: PensionInputs;
  vehicle?: VehicleInfo;
}
