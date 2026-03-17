import type { AssetAllocation, DebtAllocation, DebtItem } from '../types/inputs';

/** 자산 금액 가중평균 기대수익률 계산 */
export function calcWeightedReturn(assets: AssetAllocation): number {
  const items = Object.values(assets);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  if (totalAmount <= 0) return 0;

  const weightedSum = items.reduce(
    (sum, item) => sum + item.amount * (item.expectedReturn / 100),
    0
  );
  return (weightedSum / totalAmount) * 100; // % 단위로 반환
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
 * 부채 항목의 연간 납입액 계산
 * - equal_payment (원리금균등): 매월 동일한 총액 납부
 * - equal_principal (원금균등): 매년 동일한 원금 + 감소하는 이자 → 첫해 기준 반환
 * - interest_only (이자만): 이자만 납부, 만기 일시 상환
 */
export function calcDebtAnnualPayment(debt: DebtItem, yearsElapsed = 0): number {
  if (debt.balance <= 0 || debt.repaymentYears <= 0) return 0;
  if (yearsElapsed >= debt.repaymentYears) return 0;

  const r = debt.interestRate / 100;

  switch (debt.repaymentType) {
    case 'equal_payment': {
      // 원리금균등: 매월 동일 납부액 × 12
      const rm = r / 12;
      const n = debt.repaymentYears * 12;
      if (rm === 0) return debt.balance / debt.repaymentYears;
      const monthly = debt.balance * rm * Math.pow(1 + rm, n) / (Math.pow(1 + rm, n) - 1);
      return monthly * 12;
    }
    case 'equal_principal': {
      // 원금균등: 매년 동일 원금 + 남은 잔액에 대한 이자
      const annualPrincipal = debt.balance / debt.repaymentYears;
      const remainingBalance = debt.balance - annualPrincipal * yearsElapsed;
      return annualPrincipal + remainingBalance * r;
    }
    case 'interest_only': {
      // 이자만: 매년 이자만, 마지막 해에 원금 일시 상환
      const isLastYear = yearsElapsed === debt.repaymentYears - 1;
      return debt.balance * r + (isLastYear ? debt.balance : 0);
    }
  }
}

/** 연간 총부채 상환액 (yearsElapsed: 경과 연수) */
export function calcTotalAnnualRepayment(debts: DebtAllocation, yearsElapsed = 0): number {
  return Object.values(debts).reduce((sum, item) => {
    if (item.balance <= 0) return sum;
    return sum + calcDebtAnnualPayment(item, yearsElapsed);
  }, 0);
}
