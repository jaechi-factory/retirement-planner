/**
 * V2 이진탐색 — 기대수명까지 shortfall 없이 유지 가능한 최대 월 생활비 역산
 *
 * V1(binarySearch.ts)과 분리 — V1 엔진은 건드리지 않는다.
 *
 * V2 지속가능성 기준: 전 기간 shortfallThisMonth === 0
 */

import type { PlannerInputs } from '../types/inputs';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
import type { PropertyStrategyV2 } from './propertyStrategiesV2';
import { simulateMonthlyV2, isSustainableV2 } from './simulatorV2';
import { precomputeDebtSchedules } from './assetWeighting';

/**
 * 정수 이진탐색으로 V2 기준 최대 지속가능 월 생활비를 찾는다.
 *
 * @param inputs        입력값
 * @param strategy      부동산 전략 ('keep' | 'secured_loan' | 'sell')
 * @param fundingPolicy 유동성 버퍼 등 자금 운용 정책
 * @param liquidationPolicy 투자자산 매도 방식
 * @returns 현재가치 기준 최대 월 생활비 (만원, 정수)
 */
export function findMaxSustainableMonthlyV2(
  inputs: PlannerInputs,
  strategy: PropertyStrategyV2,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
): number {
  // 부채 스케줄 선계산 — 이진탐색 전체에서 재사용
  const debtSchedules = precomputeDebtSchedules(inputs.debts);

  const check = (monthly: number): boolean =>
    isSustainableV2(
      simulateMonthlyV2(inputs, monthly, strategy, fundingPolicy, liquidationPolicy, debtSchedules),
    );

  // 0도 안 되면 즉시 0 반환
  if (!check(0)) return 0;

  // 상한 동적 탐색: 1,000에서 시작해 2배씩 올리며 불가능 구간 확인
  let high = 1000;
  while (check(high)) {
    high *= 2;
    if (high > 1_000_000_000) {
      high = 1_000_000_000;
      break;
    }
  }

  // 정수 이진탐색: check(low) === true, check(high) === false 불변식 유지
  let low = 0;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (check(mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}
