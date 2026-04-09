/**
 * 차량 비용 계산 엔진
 *
 * 핵심 원칙:
 * - 차량은 투자 자산이 아니라 사용 자산 + 지속 비용으로 취급한다.
 * - 결과는 "은퇴 기간 중 차량이 월 생활비에서 차지하는 평균 비용"으로 단순화한다.
 * - 중복 계산 방지는 costIncludedInExpense 플래그로 처리한다.
 *
 * ─── 계산 방식 요약 ─────────────────────────────────────────────────────────
 * 1. 차량 유형별로 시뮬레이션 시작(currentAge)부터 기대수명까지
 *    연도별 연간 차량 비용을 계산한다.
 * 2. 은퇴 전 기간: 차량 비용이 저축 여력을 줄인다 (자산 축적에 영향).
 *    MVP에서는 이 부분을 현재가치 기준 합계로만 표시하고
 *    시뮬레이터에 직접 반영하지 않는다 (결과 오버레이 방식).
 * 3. 은퇴 후 기간: 차량 비용이 월 가능 생활비에서 직접 차감된다.
 *    이 부분이 사용자에게 보여주는 핵심 수치다.
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
 * 반환값: 만원/년 단위 배열 (길이 = lifeExpectancy - currentAge)
 *
 * ── 유형별 처리 ───────────────────────────────────────────────────────────
 * owned   : 대출 잔액 있으면 대출 상환 + 유지비. 대출 종료 후 유지비만.
 * buying  : purchaseYearsFromNow 이전 = 0.
 *           구매 연도: purchasePrice(선수금/초기 비용) + 대출 상환 + 유지비.
 *           이후: 대출 상환 + 유지비 → 대출 종료 후 유지비만.
 * lease   : leaseMonths 동안 월납입 + 유지비. 종료 후 유지비 0 (leaseMonths 종료).
 * none    : 모두 0.
 */
export function buildYearlyVehicleCosts(
  vehicle: VehicleInfo,
  currentAge: number,
  lifeExpectancy: number,
): number[] {
  const totalYears = lifeExpectancy - currentAge + 1; // inclusive: currentAge ~ lifeExpectancy
  if (totalYears <= 0 || vehicle.ownershipType === 'none') {
    return Array(Math.max(0, totalYears)).fill(0);
  }

  const costs: number[] = [];

  if (vehicle.ownershipType === 'owned') {
    const monthlyLoan = calcMonthlyLoanPayment(
      vehicle.loanBalance, vehicle.loanRate, vehicle.loanMonths,
    );
    const loanEndMonth = vehicle.loanMonths; // 0-based month index (exclusive)

    for (let y = 0; y < totalYears; y++) {
      const startMonth = y * 12;
      const endMonth = startMonth + 12;

      let annualCost = 0;
      for (let m = startMonth; m < endMonth; m++) {
        // 대출 상환 (기간 내)
        if (m < loanEndMonth) annualCost += monthlyLoan;
        // 유지비 (항상)
        annualCost += vehicle.monthlyMaintenance;
      }
      costs.push(annualCost);
    }
    return costs;
  }

  if (vehicle.ownershipType === 'buying') {
    const purchaseStartMonth = Math.round(vehicle.purchaseYearsFromNow * 12);
    // loanAmount = 할부로 빌리는 금액 (purchasePrice는 선수금/일시불 — 별도 필드)
    const monthlyLoan = calcMonthlyLoanPayment(
      vehicle.loanAmount, vehicle.loanRate, vehicle.loanMonths,
    );
    const loanEndMonth = purchaseStartMonth + vehicle.loanMonths;

    for (let y = 0; y < totalYears; y++) {
      const startMonth = y * 12;
      const endMonth = startMonth + 12;

      let annualCost = 0;
      for (let m = startMonth; m < endMonth; m++) {
        if (m < purchaseStartMonth) continue; // 구매 전: 0

        // 구매 시점 일시 비용 (구매 연도 첫 달에만)
        if (m === purchaseStartMonth) annualCost += vehicle.purchasePrice;

        // 대출 상환 (구매 후 loanMonths 동안)
        if (m > purchaseStartMonth && m < loanEndMonth) annualCost += monthlyLoan;

        // 유지비 (구매 후)
        annualCost += vehicle.monthlyMaintenance;
      }
      costs.push(annualCost);
    }
    return costs;
  }

  if (vehicle.ownershipType === 'lease') {
    const leaseEndMonth = vehicle.leaseMonths;

    for (let y = 0; y < totalYears; y++) {
      const startMonth = y * 12;
      const endMonth = startMonth + 12;

      let annualCost = 0;
      for (let m = startMonth; m < endMonth; m++) {
        // 리스 납입 (기간 내)
        if (m < leaseEndMonth) annualCost += vehicle.leaseMonthlyPayment;
        // 유지비 (리스 기간 내만 — 리스 종료 후 차 없음으로 가정)
        if (m < leaseEndMonth) annualCost += vehicle.monthlyMaintenance;
      }
      costs.push(annualCost);
    }
    return costs;
  }

  return Array(totalYears).fill(0);
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
 * costIncludedInExpense === 'included':
 *   - possibleMonthly는 이미 차량 비용이 포함된 채로 계산된 값
 *   - withVehicle = possibleMonthly (그대로)
 *   - withoutVehicle = possibleMonthly + avgMonthlyCost (차 뺐을 때 얼마 느는지)
 *
 * costIncludedInExpense === 'separate':
 *   - possibleMonthly는 차량 비용 미포함 값
 *   - withoutVehicle = possibleMonthly (그대로)
 *   - withVehicle = possibleMonthly - avgMonthlyCost
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
    // possibleMonthly는 이미 차 비용 포함 → without = possibleMonthly + avgMonthlyCost
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
