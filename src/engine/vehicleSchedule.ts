/**
 * 차량 비용 계산 엔진
 *
 * 핵심 원칙:
 * - 차량은 투자 자산이 아니라 사용 자산 + 지속 비용으로 취급한다.
 * - 현재 모델은 "이미 보유한 차량 1대"만 다룬다.
 * - 결과는 "은퇴 기간 중 차량이 월 생활비에서 차지하는 평균 비용"으로 단순화한다.
 * - 중복 계산 방지는 costIncludedInExpense 플래그로 처리한다.
 */

import type { VehicleInfo } from '../types/inputs';

/** 원리금균등 월 상환액 (대출 계산용) */
function calcMonthlyLoanPayment(
  balance: number,
  annualRate: number,
  totalMonths: number,
): number {
  if (balance <= 0 || totalMonths <= 0) return 0;
  if (annualRate === 0) return balance / totalMonths;
  const r = annualRate / 100 / 12;
  return (balance * r * Math.pow(1 + r, totalMonths)) /
    (Math.pow(1 + r, totalMonths) - 1);
}

/** 해당 월(0-based)에 실제 발생하는 차량 비용 */
export function getVehicleMonthlyCost(
  vehicle: VehicleInfo | undefined,
  monthIndex: number,
): number {
  if (!vehicle || vehicle.ownershipType !== 'owned' || monthIndex < 0) return 0;

  const monthlyLoan = calcMonthlyLoanPayment(
    vehicle.loanBalance,
    vehicle.loanRate,
    vehicle.loanMonths,
  );

  return (monthIndex < vehicle.loanMonths ? monthlyLoan : 0) + vehicle.monthlyMaintenance;
}

/**
 * 연도별(0-based, currentAge 기준) 연간 차량 비용 배열을 생성한다.
 *
 * yearIndex=0 → currentAge 연도
 * yearIndex=k → currentAge+k 연도
 *
 * 반환값: 만원/년 단위 배열 (길이 = lifeExpectancy - currentAge + 1)
 *
 * ── 유형별 처리 ───────────────────────────────────────────────────────────
 * owned   : 대출 잔액 있으면 대출 상환 + 유지비. 대출 종료 후 유지비만.
 * none    : 모두 0.
 */
export function buildYearlyVehicleCosts(
  vehicle: VehicleInfo,
  currentAge: number,
  lifeExpectancy: number,
): number[] {
  const totalYears = lifeExpectancy - currentAge + 1; // inclusive: currentAge ~ lifeExpectancy
  if (totalYears <= 0 || vehicle.ownershipType !== 'owned') {
    return Array(Math.max(0, totalYears)).fill(0);
  }

  const costs: number[] = [];

  for (let y = 0; y < totalYears; y++) {
    const startMonth = y * 12;
    const endMonth = startMonth + 12;

    let annualCost = 0;
    for (let m = startMonth; m < endMonth; m++) {
      annualCost += getVehicleMonthlyCost(vehicle, m);
    }
    costs.push(annualCost);
  }

  return costs;
}

/**
 * 은퇴 기간 중 평균 월 차량 비용을 계산한다 (현재가치 기준).
 *
 * 이 값이 결과 화면에서 "자동차 때문에 줄어드는 금액"으로 표시된다.
 *
 * costIncludedInExpense === 'included' 이면:
 *   연소비에 이미 포함된 것이므로 possibleMonthly에서 추가 차감하지 않는다.
 *   → avgRetirementMonthlyCost는 0을 반환 (이미 반영됨).
 *
 * costIncludedInExpense === 'separate' 이면:
 *   은퇴 기간 평균 월 비용을 possibleMonthly에서 차감해야 한다.
 */
export function computeAvgRetirementVehicleMonthlyCost(
  vehicle: VehicleInfo,
  currentAge: number,
  retirementAge: number,
  lifeExpectancy: number,
): number {
  if (vehicle.ownershipType === 'none') return 0;
  if (vehicle.costIncludedInExpense === 'included') return 0;

  const yearlyCosts = buildYearlyVehicleCosts(vehicle, currentAge, lifeExpectancy);
  const retirementStartYearIndex = retirementAge - currentAge;
  const retirementYears = lifeExpectancy - retirementAge + 1; // inclusive

  if (retirementYears <= 0) return 0;

  const retirementCosts = yearlyCosts.slice(retirementStartYearIndex);
  const totalRetirementCost = retirementCosts.reduce((sum, c) => sum + c, 0);

  // 연간 → 월 평균
  return totalRetirementCost / (retirementYears * 12);
}

/**
 * 차량 비교 결과 (결과 화면에 표시할 3가지 수치)
 *
 * possibleMonthly: 기존 엔진이 계산한 월 가능 생활비 (차량 미포함 기준 or 이미 포함 기준)
 */
export interface VehicleComparisonResult {
  /** 차량 포함 시 월 가능 생활비 (만원) */
  withVehicle: number;
  /** 차량 제외 시 월 가능 생활비 (만원) */
  withoutVehicle: number;
  /** 차량 때문에 줄어드는 금액 (만원/월) */
  monthlyReduction: number;
  /** 차량 있음 여부 */
  hasVehicle: boolean;
  /** 비용이 연소비에 이미 포함됐는지 */
  isIncluded: boolean;
}

/**
 * possibleMonthly와 차량 정보를 받아 비교 결과를 생성한다.
 *
 * possibleMonthly는 "차량이 있는 현재 시나리오" 기준 값으로 해석한다.
 * 카드에서는 여기서 차를 뺐을 때 얼마나 늘어나는지 비교만 보여준다.
 */
export function computeVehicleComparison(
  vehicle: VehicleInfo,
  possibleMonthly: number,
  currentAge: number,
  retirementAge: number,
  lifeExpectancy: number,
): VehicleComparisonResult {
  const hasVehicle = vehicle.ownershipType !== 'none';

  if (!hasVehicle) {
    return {
      withVehicle: possibleMonthly,
      withoutVehicle: possibleMonthly,
      monthlyReduction: 0,
      hasVehicle: false,
      isIncluded: false,
    };
  }

  const yearlyCosts = buildYearlyVehicleCosts(vehicle, currentAge, lifeExpectancy);
  const retirementStartYearIndex = retirementAge - currentAge;
  const retirementYears = lifeExpectancy - retirementAge + 1; // inclusive

  let avgMonthlyCost = 0;
  if (retirementYears > 0) {
    const retirementCosts = yearlyCosts.slice(retirementStartYearIndex);
    const total = retirementCosts.reduce((sum, c) => sum + c, 0);
    avgMonthlyCost = total / (retirementYears * 12);
  }

  const isIncluded = vehicle.costIncludedInExpense === 'included';

  if (isIncluded) {
    return {
      withVehicle: possibleMonthly,
      withoutVehicle: Math.round(possibleMonthly + avgMonthlyCost),
      monthlyReduction: Math.round(avgMonthlyCost),
      hasVehicle: true,
      isIncluded: true,
    };
  }

  return {
    withVehicle: possibleMonthly,
    withoutVehicle: Math.round(possibleMonthly + avgMonthlyCost),
    monthlyReduction: Math.round(avgMonthlyCost),
    hasVehicle: true,
    isIncluded: false,
  };
}
