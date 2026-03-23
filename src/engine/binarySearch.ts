import type { PlannerInputs } from '../types/inputs';
import { simulate, isSustainable } from './calculator';
import { precomputeDebtSchedules } from './assetWeighting';

/**
 * 정수 이진탐색으로 기대수명까지 순자산이 버티는 최대 월 생활비를 찾는다.
 *
 * 성능 최적화:
 * - 부채 스케줄은 inputs가 변하지 않으므로 이진탐색 루프 바깥에서 1회 선계산
 * - 이후 모든 simulate() 호출에 선계산본 주입 → 재빌드 없음
 *
 * @returns 현재가치 기준 가능한 최대 월 생활비 (만원, 정수)
 */
export function findMaxSustainableMonthly(inputs: PlannerInputs): number {
  // 부채 스케줄 선계산 (이진탐색 전체에서 재사용)
  const debtSchedules = precomputeDebtSchedules(inputs.debts);

  const check = (monthly: number) =>
    isSustainable(simulate(inputs, monthly, debtSchedules));

  // 월 0만원도 안 되면 0 반환
  if (!check(0)) return 0;

  // 상한을 동적으로 탐색: 1,000에서 시작해 2배씩 올리며 불가능한 구간 찾기
  let high = 1000;
  while (check(high)) {
    high *= 2;
    if (high > 1_000_000_000) { high = 1_000_000_000; break; }
  }

  // 정수 이진탐색
  // 불변식: check(low) === true, check(high) === false
  let low = 0;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (check(mid)) { low = mid; } else { high = mid; }
  }

  return low; // 정확한 최대 정수값
}
