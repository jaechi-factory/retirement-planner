/**
 * V2 이진탐색 — 기대수명까지 shortfall 없이 유지 가능한 최대 월 생활비 역산
 *
 * prebuiltSchedules를 외부에서 받으면 그것을 사용한다.
 * 이를 통해 calculatorV2.ts에서 단일 debtSchedules 인스턴스를 공유한다.
 */

import type { PlannerInputs } from '../types/inputs';
import type { FundingPolicy, LiquidationPolicy } from './fundingPolicy';
import type { PropertyStrategyV2 } from './propertyStrategiesV2';
import type { DebtSchedules } from './debtSchedule';
import { simulateMonthlyV2, isSustainableV2 } from './simulatorV2';
import { precomputeDebtSchedules } from './assetWeighting';

/**
 * 정수 이진탐색으로 V2 기준 최대 지속가능 월 생활비를 찾는다.
 *
 * @param inputs            입력값
 * @param strategy          부동산 전략
 * @param fundingPolicy     유동성 버퍼 정책
 * @param liquidationPolicy 투자자산 매도 방식
 * @param prebuiltSchedules 외부에서 미리 계산된 부채 스케줄 (없으면 내부 계산)
 */
export function findMaxSustainableMonthlyV2(
  inputs: PlannerInputs,
  strategy: PropertyStrategyV2,
  fundingPolicy: FundingPolicy,
  liquidationPolicy: LiquidationPolicy,
  prebuiltSchedules?: DebtSchedules,
): number {
  // 단일 source: 외부에서 받거나 없으면 1회 계산 후 재사용
  const debtSchedules = prebuiltSchedules ?? precomputeDebtSchedules(inputs.debts);

  const check = (monthly: number): boolean =>
    isSustainableV2(
      simulateMonthlyV2(inputs, monthly, strategy, fundingPolicy, liquidationPolicy, debtSchedules),
    );

  if (!check(0)) return 0;

  let high = 1000;
  while (check(high)) {
    high *= 2;
    if (high > 1_000_000_000) { high = 1_000_000_000; break; }
  }

  let low = 0;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (check(mid)) low = mid; else high = mid;
  }

  return low;
}
