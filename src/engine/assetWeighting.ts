import type { AssetAllocation, DebtAllocation } from '../types/inputs';
import { buildMonthlyDebtSchedule, getAnnualPaymentFromSchedule, getRemainingBalanceFromSchedule } from './debtSchedule';
import type { DebtSchedules } from './debtSchedule';

const FINANCIAL_ASSET_KEYS = ['cash', 'deposit', 'stock_kr', 'stock_us', 'bond', 'crypto'] as const;
type FinancialAssetKey = typeof FINANCIAL_ASSET_KEYS[number];

/** 전체 자산 금액 가중평균 기대수익률 계산 (부동산 포함) */
export function calcWeightedReturn(assets: AssetAllocation): number {
  const items = Object.values(assets);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  if (totalAmount <= 0) return 0;

  const weightedSum = items.reduce(
    (sum, item) => sum + item.amount * (item.expectedReturn / 100),
    0
  );
  return (weightedSum / totalAmount) * 100;
}

/** 금융자산(부동산 제외) 금액 가중평균 기대수익률 계산 */
export function calcFinancialWeightedReturn(assets: AssetAllocation): number {
  const items = FINANCIAL_ASSET_KEYS.map(k => assets[k as FinancialAssetKey]);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  if (totalAmount <= 0) return 0;

  const weightedSum = items.reduce(
    (sum, item) => sum + item.amount * (item.expectedReturn / 100),
    0
  );
  return (weightedSum / totalAmount) * 100;
}

/** 금융자산 합계 (부동산 제외) */
export function calcFinancialTotalAsset(assets: AssetAllocation): number {
  return FINANCIAL_ASSET_KEYS.reduce((sum, k) => sum + assets[k as FinancialAssetKey].amount, 0);
}

/** 총자산 계산 */
export function calcTotalAsset(assets: AssetAllocation): number {
  return Object.values(assets).reduce((sum, item) => sum + item.amount, 0);
}

/** 총부채 계산 */
export function calcTotalDebt(debts: DebtAllocation): number {
  return Object.values(debts).reduce((sum, item) => sum + item.balance, 0);
}

/**
 * 3개 대출 스케줄을 한 번에 선계산.
 * - binarySearch 루프 바깥에서 1회 호출 후 재사용
 */
export function precomputeDebtSchedules(debts: DebtAllocation): DebtSchedules {
  return {
    mortgage: buildMonthlyDebtSchedule(debts.mortgage),
    creditLoan: buildMonthlyDebtSchedule(debts.creditLoan),
    otherLoan: buildMonthlyDebtSchedule(debts.otherLoan),
  };
}

/**
 * 스케줄 기반 연간 총 부채 납입액 (yearsElapsed: 경과 연수, 0-based)
 * - simulate() 내부에서 각 연도에 호출됨
 */
export function calcTotalAnnualRepaymentFromSchedules(
  schedules: DebtSchedules,
  yearsElapsed: number,
): number {
  return (
    getAnnualPaymentFromSchedule(schedules.mortgage, yearsElapsed) +
    getAnnualPaymentFromSchedule(schedules.creditLoan, yearsElapsed) +
    getAnnualPaymentFromSchedule(schedules.otherLoan, yearsElapsed)
  );
}

/**
 * 스케줄 기반 연도말 총 잔여 부채 (yearsElapsed: 경과 연수, 0-based)
 */
export function calcTotalRemainingDebtFromSchedules(
  schedules: DebtSchedules,
  yearsElapsed: number,
): number {
  return (
    getRemainingBalanceFromSchedule(schedules.mortgage, yearsElapsed) +
    getRemainingBalanceFromSchedule(schedules.creditLoan, yearsElapsed) +
    getRemainingBalanceFromSchedule(schedules.otherLoan, yearsElapsed)
  );
}

/**
 * 첫 해(yearIndex=0) 기준 연간 총 부채 납입액
 * - usePlannerStore의 annualNetSavings 계산용
 */
export function calcTotalAnnualRepayment(
  debts: DebtAllocation,
  yearsElapsed = 0,
): number {
  const schedules = precomputeDebtSchedules(debts);
  return calcTotalAnnualRepaymentFromSchedules(schedules, yearsElapsed);
}

// ─── 하위 호환 export (UI 미리보기용, DebtSection에서 직접 사용) ───────────────
export { buildMonthlyDebtSchedule } from './debtSchedule';
export type { DebtSchedules } from './debtSchedule';
