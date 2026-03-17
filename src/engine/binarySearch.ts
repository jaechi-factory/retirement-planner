import type { PlannerInputs } from '../types/inputs';
import { simulate, isSustainable } from './calculator';
import { BINARY_SEARCH_PRECISION, BINARY_SEARCH_MAX_ITER } from '../utils/constants';

/**
 * 이진탐색으로 기대수명까지 자산이 버티는 최대 월 생활비를 찾는다.
 * 상한은 동적으로 결정 — 하드코딩된 상한으로 결과가 잘리는 문제 없음.
 * @returns 현재가치 기준 가능한 최대 월 생활비 (만원)
 */
export function findMaxSustainableMonthly(inputs: PlannerInputs): number {
  // 월 0만원도 안 되면 0 반환
  if (!isSustainable(simulate(inputs, 0))) return 0;

  // 상한을 동적으로 탐색: 1,000에서 시작해 2배씩 올리며 불가능한 구간 찾기
  let high = 1000;
  while (isSustainable(simulate(inputs, high))) {
    high *= 2;
    if (high > 1_000_000) { high = 1_000_000; break; } // 100억/월 상한 (안전장치)
  }

  let low = 0;
  let iterations = 0;

  while (high - low > BINARY_SEARCH_PRECISION && iterations < BINARY_SEARCH_MAX_ITER) {
    const mid = (low + high) / 2;
    if (isSustainable(simulate(inputs, mid))) {
      low = mid;
    } else {
      high = mid;
    }
    iterations++;
  }

  return Math.floor(low);
}
