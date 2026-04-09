import type { MonthlySnapshotV2, YearlyAggregateV2 } from '../types/calculationV2';

export type NetWorthSaleBucketMode = 'separate_asset' | 'included_in_cash_like';

export interface NetWorthState {
  cashLikeEnd: number;
  financialInvestableEnd: number;
  propertyValueEnd: number;
  propertySaleProceedsBucketEnd: number;
  securedLoanBalanceEnd: number;
  totalDebtEnd: number;
}

/**
 * 순자산 단일 정의.
 * 기본 규칙은 현재 엔진/차트 모델과 동일하게 "매각대금 버킷은 cashLikeEnd와 분리된 별도 자산"이다.
 * 테스트에서는 included_in_cash_like 모드로 이중합산 방지 정의도 검증할 수 있다.
 */
export function calcNetWorth(
  state: NetWorthState,
  options: { saleBucketMode?: NetWorthSaleBucketMode } = {},
): number {
  const saleBucketMode = options.saleBucketMode ?? 'separate_asset';
  const saleBucketContribution = saleBucketMode === 'separate_asset'
    ? state.propertySaleProceedsBucketEnd
    : 0;

  return state.cashLikeEnd +
    state.financialInvestableEnd +
    state.propertyValueEnd +
    saleBucketContribution -
    state.securedLoanBalanceEnd -
    state.totalDebtEnd;
}

export type NetWorthSnapshotLike =
  Pick<
    MonthlySnapshotV2,
    | 'cashLikeEnd'
    | 'financialInvestableEnd'
    | 'propertyValueEnd'
    | 'propertySaleProceedsBucketEnd'
    | 'securedLoanBalanceEnd'
    | 'totalDebtEnd'
  > |
  Pick<
    YearlyAggregateV2,
    | 'cashLikeEnd'
    | 'financialInvestableEnd'
    | 'propertyValueEnd'
    | 'propertySaleProceedsBucketEnd'
    | 'securedLoanBalanceEnd'
    | 'totalDebtEnd'
  >;
