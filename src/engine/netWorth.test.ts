import { describe, expect, it } from 'vitest';
import { calcNetWorth } from './netWorth';

describe('calcNetWorth', () => {
  it('[N1] sale bucket = 0이면 cash + fin + property - secured - totalDebt와 같아야 함', () => {
    expect(calcNetWorth({
      cashLikeEnd: 100,
      financialInvestableEnd: 200,
      propertyValueEnd: 300,
      propertySaleProceedsBucketEnd: 0,
      securedLoanBalanceEnd: 40,
      totalDebtEnd: 70,
    })).toBe(490);
  });

  it('[N2] sale bucket이 cashLikeEnd에 이미 포함된 구조면 이중합산하지 않아야 함', () => {
    expect(calcNetWorth({
      cashLikeEnd: 600,
      financialInvestableEnd: 200,
      propertyValueEnd: 300,
      propertySaleProceedsBucketEnd: 100,
      securedLoanBalanceEnd: 40,
      totalDebtEnd: 70,
    }, {
      saleBucketMode: 'included_in_cash_like',
    })).toBe(990);
  });

  it('[N3] sale bucket이 cashLikeEnd와 분리된 구조면 별도 자산으로 포함해야 함', () => {
    expect(calcNetWorth({
      cashLikeEnd: 500,
      financialInvestableEnd: 200,
      propertyValueEnd: 300,
      propertySaleProceedsBucketEnd: 100,
      securedLoanBalanceEnd: 40,
      totalDebtEnd: 70,
    })).toBe(990);
  });
});
