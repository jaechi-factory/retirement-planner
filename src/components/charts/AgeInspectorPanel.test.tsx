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
  monthlyVehicleCost: 0,
  monthlyOutflow: 220,
  monthlyNet: -40,
  cashLike: 1000,
  financialInvestable: 500,
  propertyValue: 0,
  saleProceedsEnd: 0,
  monthlySaleProceedsReturn: 0,
  monthlyAssetIncomeRealTodayValue: 0,
  monthlyAssetIncomeBreakdown: { cash: 0, deposit: 0, bond: 0, stock_kr: 0, stock_us: 0, crypto: 0 },
  assetBalancesEnd: { cash: 0, deposit: 0, bond: 0, stock_kr: 0, stock_us: 0, crypto: 0 },
  totalAssets: 1500,
  pensionEvents: [],
};

describe('AgeInspectorPanel', () => {
  it('수입·지출·자산 구성이 올바르게 표시되어야 한다', () => {
    const html = renderToStaticMarkup(
      <AgeInspectorPanel data={baseData} hasRealEstate={false} hasSaleProceeds={false} />,
    );

    expect(html).toContain('수입 구성');
    expect(html).toContain('지출 구성');
    expect(html).toContain('자산 구성');
    expect(html).toContain('현재 가치 기준으로 보여줘요');
    expect(html).toContain('생활비');
  });
});
