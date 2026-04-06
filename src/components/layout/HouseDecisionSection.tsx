import { useMemo } from 'react';
import type { PropertyOptionResult } from '../../types/calculationV2';
import HouseDecisionRows from './HouseDecisionRows';
import { buildHouseDecisionRowsVM, type HouseDecisionStrategy } from './houseDecisionVM';

interface HouseDecisionSectionProps {
  hasRealEstate: boolean;
  propertyOptions: PropertyOptionResult[];
  selectedStrategy: HouseDecisionStrategy;
  lifeExpectancy: number;
  onSelectStrategy: (strategy: HouseDecisionStrategy) => void;
}

export default function HouseDecisionSection({
  hasRealEstate,
  propertyOptions,
  selectedStrategy,
  lifeExpectancy,
  onSelectStrategy,
}: HouseDecisionSectionProps) {
  const rows = useMemo(
    () => buildHouseDecisionRowsVM({ propertyOptions, selectedStrategy, lifeExpectancy }),
    [propertyOptions, selectedStrategy, lifeExpectancy],
  );

  const hasSelectableRows = rows.some((row) => row.isSelectable);

  if (!hasRealEstate || !hasSelectableRows) return null;

  return (
    <section
      style={{
        background: 'transparent',
        padding: 'var(--result-space-3) 0',
        marginBottom: 0,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--result-text-meta-color)', marginBottom: 8 }}>
        집 의사결정
      </div>
      <div style={{ fontSize: 'var(--result-text-meta)', color: 'var(--result-text-meta-color)', marginBottom: 'var(--result-space-2)' }}>
        전략을 누르면 아래 결과가 바뀌어요.
      </div>
      <HouseDecisionRows rows={rows} onSelectStrategy={onSelectStrategy} />
    </section>
  );
}
