import type { PropertyOptionResult } from '../../types/calculationV2';
import type { HouseDecisionStrategy } from './houseDecisionVM';

function isSelectable(option: PropertyOptionResult): boolean {
  return option.yearlyAggregates.length > 0;
}

export function pickDefaultSelectedStrategy(
  propertyOptions: PropertyOptionResult[],
  recommendedStrategy?: HouseDecisionStrategy | null,
): HouseDecisionStrategy | null {
  const selectable = propertyOptions.filter(isSelectable);
  if (selectable.length === 0) return null;

  const sellOption = selectable.find((option) => option.strategy === 'sell');
  if (sellOption) return 'sell';

  const recommendedOption = selectable.find((option) => option.isRecommended);
  if (recommendedOption) return recommendedOption.strategy;

  if (recommendedStrategy) {
    const strategyMatched = selectable.find((option) => option.strategy === recommendedStrategy);
    if (strategyMatched) return strategyMatched.strategy;
  }

  return selectable[0].strategy;
}

export function resolveSelectedStrategy(params: {
  propertyOptions: PropertyOptionResult[];
  currentSelected: HouseDecisionStrategy | null;
  recommendedStrategy?: HouseDecisionStrategy | null;
}): HouseDecisionStrategy | null {
  const { propertyOptions, currentSelected, recommendedStrategy } = params;
  if (
    currentSelected
    && propertyOptions.some((option) => option.strategy === currentSelected && isSelectable(option))
  ) {
    return currentSelected;
  }

  return pickDefaultSelectedStrategy(propertyOptions, recommendedStrategy);
}

