import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AgeInspectorPanel from './AgeInspectorPanel';
import type { AgeSnapshotData } from './assetBalanceMetrics';

const baseData: AgeSnapshotData = {
  age: 65,
  isRetirementYear: true,
  monthlySalary: 0,
  monthlyPension: 180,
  monthlyPublicPension: 120,
  monthlyPublicPensionRealTodayValue: 100,
  monthlyRetirementPension: 40,
  monthlyRetirementPensionRealTodayValue: 35,
  monthlyPrivatePension: 20,
  monthlyPrivatePensionRealTodayValue: 18,
  monthlyIncome: 180,
  monthlyLivingExpense: 220,
  monthlyRent: 0,
  monthlyDebtService: 0,
  monthlyChildExpense: 0,
  monthlyOutflow: 220,
  monthlyNet: -40,
  cashLike: 1000,
  financialInvestable: 500,
  propertyValue: 0,
  saleProceedsEnd: 0,
  totalAssets: 1500,
  pensionEvents: [],
};

describe('AgeInspectorPanel', () => {
  it('생활비는 선택한 나이 기준 명목금액으로 표시되어야 한다', () => {
    const html = renderToStaticMarkup(
      <AgeInspectorPanel data={baseData} hasRealEstate={false} hasSaleProceeds={false} />,
    );

    expect(html).toContain('지출은 선택한 나이 기준 명목금액이에요');
    expect(html).toContain('생활비 (명목)');
    expect(html).not.toContain('생활비 (오늘 가치)');
  });
});
