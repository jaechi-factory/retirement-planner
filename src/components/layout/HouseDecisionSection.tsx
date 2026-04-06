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
        borderRadius: 14,
        border: '1px solid var(--ux-border-strong)',
        background: 'var(--ux-surface)',
        padding: '16px 18px',
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ux-text-muted)', marginBottom: 10 }}>
        집 의사결정
      </div>
      <HouseDecisionRows rows={rows} onSelectStrategy={onSelectStrategy} />
    </section>
  );
}
