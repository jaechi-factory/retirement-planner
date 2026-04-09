import { describe, expect, it } from 'vitest';
import {
  buildYearlyVehicleCosts,
  computeVehicleComparison,
  getVehicleMonthlyCost,
} from './vehicleSchedule';
import type { VehicleInfo } from '../types/inputs';

function makeVehicle(overrides: Partial<VehicleInfo> = {}): VehicleInfo {
  return {
    ownershipType: 'owned',
    costIncludedInExpense: 'separate',
    loanBalance: 1200,
    loanRate: 12,
    loanMonths: 12,
    monthlyMaintenance: 10,
    ...overrides,
  };
}

function calcMonthlyLoanPayment(balance: number, annualRate: number, totalMonths: number): number {
  if (balance <= 0 || totalMonths <= 0) return 0;
  if (annualRate === 0) return balance / totalMonths;
  const r = annualRate / 100 / 12;
  return (balance * r * Math.pow(1 + r, totalMonths)) /
    (Math.pow(1 + r, totalMonths) - 1);
}

describe('vehicleSchedule', () => {
  it('owned는 월별 차량비가 대출상환+유지비로 계산되어야 함', () => {
    const monthlyLoan = calcMonthlyLoanPayment(1200, 12, 12);
    expect(getVehicleMonthlyCost(makeVehicle(), 0)).toBeCloseTo(monthlyLoan + 10, 6);
    expect(getVehicleMonthlyCost(makeVehicle(), 12)).toBe(10);
  });

  it('none이면 모든 연도 차량 비용은 0이어야 함', () => {
    expect(buildYearlyVehicleCosts(
      makeVehicle({ ownershipType: 'none' }),
      60,
      62,
    )).toEqual([0, 0, 0]);
  });

  it('owned는 대출 기간 동안 상환액+유지비, 이후 유지비만 반영해야 함', () => {
    const monthlyLoan = calcMonthlyLoanPayment(1200, 12, 12);
    const yearlyCosts = buildYearlyVehicleCosts(
      makeVehicle(),
      60,
      61,
    );

    expect(yearlyCosts).toHaveLength(2);
    expect(yearlyCosts[0]).toBeCloseTo(monthlyLoan * 12 + 10 * 12, 6);
    expect(yearlyCosts[1]).toBe(10 * 12);
  });

  it('별도 계산 차량 카드는 현재 결과를 withVehicle로 유지하고 차가 없을 때 값을 비교해야 함', () => {
    const comparison = computeVehicleComparison(
      makeVehicle({
        loanBalance: 0,
        loanRate: 0,
        loanMonths: 0,
        monthlyMaintenance: 12,
      }),
      500,
      58,
      60,
      61,
    );

    expect(comparison.withVehicle).toBe(500);
    expect(comparison.withoutVehicle).toBe(512);
    expect(comparison.monthlyReduction).toBe(12);
  });
});
