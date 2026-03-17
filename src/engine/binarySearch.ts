import type { PlannerInputs } from '../types/inputs';
import { simulate, isSustainable } from './calculator';
import {
  BINARY_SEARCH_MAX,
  BINARY_SEARCH_PRECISION,
  BINARY_SEARCH_MAX_ITER,
} from '../utils/constants';

/**
 * 이진탐색으로 기대수명까지 자산이 버티는 최대 월 생활비를 찾는다.
 * @returns 현재가치 기준 가능한 최대 월 생활비 (만원)
 */
export function findMaxSustainableMonthly(inputs: PlannerInputs): number {
  let low = 0;
  let high = BINARY_SEARCH_MAX;
  let iterations = 0;

  // 월 0만원도 안 되면 0 반환
  const zeroSnapshots = simulate(inputs, 0);
  if (!isSustainable(zeroSnapshots)) return 0;

  while (high - low > BINARY_SEARCH_PRECISION && iterations < BINARY_SEARCH_MAX_ITER) {
    const mid = (low + high) / 2;
    const snapshots = simulate(inputs, mid);

    if (isSustainable(snapshots)) {
      low = mid;   // mid로도 버팀 → 더 높은 값 탐색
    } else {
      high = mid;  // mid에서 자산 고갈 → 더 낮은 값 탐색
    }
    iterations++;
  }

  return Math.floor(low); // 만원 단위로 내림
}
