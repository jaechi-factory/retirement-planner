import type { PlannerInputs } from '../types/inputs';
import { simulate, isSustainable } from './calculator';

/**
 * 정수 이진탐색으로 기대수명까지 금융자산이 버티는 최대 월 생활비를 찾는다.
 * - 금융자산 기준 지속 가능성 판단 (부동산 제외)
 * - 정수 단위 탐색으로 경계값 1만원 오차 없음
 * @returns 현재가치 기준 가능한 최대 월 생활비 (만원, 정수)
 */
export function findMaxSustainableMonthly(inputs: PlannerInputs): number {
  // 월 0만원도 안 되면 0 반환
  if (!isSustainable(simulate(inputs, 0))) return 0;

  // 상한을 동적으로 탐색: 1,000에서 시작해 2배씩 올리며 불가능한 구간 찾기
  let high = 1000;
  while (isSustainable(simulate(inputs, high))) {
    high *= 2;
    if (high > 1_000_000_000) { high = 1_000_000_000; break; }
  }

  // 정수 이진탐색
  // 불변식: isSustainable(low) === true, isSustainable(high) === false
  let low = 0;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (isSustainable(simulate(inputs, mid))) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low; // 정확한 최대 정수값
}
