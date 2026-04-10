import { describe, expect, it } from 'vitest';
import {
  calculatePayrollBreakdownFromGrossMonthly,
  estimateGrossAnnualFromNetAnnual,
  estimateGrossMonthlyFromNet,
  type PayrollReverseContext,
} from './payrollReverse';

const BASE_CONTEXT: PayrollReverseContext = {
  policyYear: 2026,
  familyCount: 1,
  childCount: 0,
  nonTaxableMonthly: 0,
  withholdingRatePercent: 100,
};

describe('세후 -> 세전 역산', () => {
  const cases = [
    { label: 'net low', netMonthly: 180 },
    { label: 'net mid', netMonthly: 350 },
    { label: 'net upper-band', netMonthly: 700 },
    { label: 'net above-cap', netMonthly: 1500 },
  ];

  for (const testCase of cases) {
    it(`${testCase.label}: estimateGrossMonthlyFromNet -> gross -> take-home roundtrip`, () => {
      const estimated = estimateGrossMonthlyFromNet(testCase.netMonthly, BASE_CONTEXT);
      const roundtrip = calculatePayrollBreakdownFromGrossMonthly(estimated.grossMonthly, BASE_CONTEXT);

      expect(roundtrip.netMonthly).toBeCloseTo(testCase.netMonthly, 2);
      expect(roundtrip.grossMonthly).toBeGreaterThanOrEqual(testCase.netMonthly);
    });
  }

  it('estimateGrossAnnualFromNetAnnual도 월 기준으로 같은 역산 결과를 준다', () => {
    const annual = estimateGrossAnnualFromNetAnnual(4200, BASE_CONTEXT);
    const monthly = estimateGrossMonthlyFromNet(350, BASE_CONTEXT);

    expect(annual.grossMonthly).toBeCloseTo(monthly.grossMonthly, 2);
    expect(annual.netMonthly).toBeCloseTo(monthly.netMonthly, 2);
  });

  it('비과세/가족수/자녀수/원천징수비율을 바꿔도 roundtrip은 유지된다', () => {
    const ctx: PayrollReverseContext = {
      policyYear: 2026,
      familyCount: 4,
      childCount: 2,
      nonTaxableMonthly: 20,
      withholdingRatePercent: 80,
    };
    const estimated = estimateGrossMonthlyFromNet(500, ctx);
    const roundtrip = calculatePayrollBreakdownFromGrossMonthly(estimated.grossMonthly, ctx);

    expect(roundtrip.netMonthly).toBeCloseTo(500, 2);
    expect(roundtrip.taxableMonthly).toBeCloseTo(estimated.grossMonthly - 20, 2);
  });
});
