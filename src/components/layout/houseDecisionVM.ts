import { PROPERTY_STRATEGY_LABELS } from '../../engine/propertyStrategiesV2';
import type { PropertyOptionResult } from '../../types/calculationV2';
import { fmtKRW } from '../../utils/format';

export type HouseDecisionStrategy = PropertyOptionResult['strategy'];

export type HouseDecisionRowVM = {
  strategy: HouseDecisionStrategy;
  strategyLabel: string;
  startAgeLabel: string;
  startAgeText: string;
  sustainableMonthlyText: string;
  survivalAgeText: string;
  isRecommended: boolean;
  isSelected: boolean;
  isSelectable: boolean;
  disabledReason?: string;
  detailHeadline: string;
  lastRemainingMoneyText: string;
  houseCashSupportText?: string;
};

const STRATEGY_ORDER: HouseDecisionStrategy[] = ['keep', 'secured_loan', 'sell'];

function computeSaleNetProceeds(option: PropertyOptionResult): number {
  return option.yearlyAggregates.reduce((sum, year) => {
    const yearNet = year.months.reduce((monthSum, month) => monthSum + month.propertySaleNetProceedsThisMonth, 0);
    return sum + yearNet;
  }, 0);
}

function computeMaxSecuredLoanBalance(option: PropertyOptionResult): number {
  return option.yearlyAggregates.reduce((max, year) => {
    const monthMax = year.months.reduce((currentMax, month) => Math.max(currentMax, month.securedLoanBalanceEnd), 0);
    return Math.max(max, monthMax, year.securedLoanBalanceEnd);
  }, 0);
}

function toStartAgeText(option: PropertyOptionResult): string {
  if (option.interventionAge === null) {
    return option.strategy === 'keep' ? '집 개입 없음' : '필요 시점 없음';
  }
  return `${option.interventionAge}세`;
}

function toSurvivalAgeText(option: PropertyOptionResult, lifeExpectancy: number): string {
  if (option.survivesToLifeExpectancy) return `${lifeExpectancy}세까지`;
  if (option.failureAge !== null) return `${option.failureAge}세`;
  return '계산 불가';
}

function toHouseCashSupportText(option: PropertyOptionResult): string | undefined {
  if (option.strategy === 'secured_loan') {
    const borrowed = computeMaxSecuredLoanBalance(option);
    return borrowed > 0 ? `집 담보대출로 꺼내 쓴 돈 ${fmtKRW(borrowed)}` : '집 담보대출 사용 없음';
  }

  if (option.strategy === 'sell') {
    const netProceeds = computeSaleNetProceeds(option);
    return netProceeds > 0 ? `집을 팔고 손에 남는 돈 ${fmtKRW(netProceeds)}` : '집을 팔아 손에 남는 돈 없음';
  }

  return undefined;
}

export function buildHouseDecisionRowsVM(params: {
  propertyOptions: PropertyOptionResult[];
  selectedStrategy: HouseDecisionStrategy;
  lifeExpectancy: number;
}): HouseDecisionRowVM[] {
  const { propertyOptions, selectedStrategy, lifeExpectancy } = params;
  const optionByStrategy = new Map(propertyOptions.map((option) => [option.strategy, option]));

  return STRATEGY_ORDER.flatMap((strategy) => {
    const option = optionByStrategy.get(strategy);
    if (!option) return [];

    const isSelectable = option.yearlyAggregates.length > 0;

    const startAgeLabel =
      strategy === 'secured_loan' ? '대출 시작'
      : strategy === 'sell' ? '매각 시점'
      : '집 개입';

    const row: HouseDecisionRowVM = {
      strategy,
      strategyLabel: PROPERTY_STRATEGY_LABELS[strategy],
      startAgeLabel,
      startAgeText: isSelectable ? toStartAgeText(option) : '계산 불가',
      sustainableMonthlyText: isSelectable ? `월 ${fmtKRW(option.sustainableMonthly)}` : '계산 불가',
      survivalAgeText: isSelectable ? toSurvivalAgeText(option, lifeExpectancy) : '계산 불가',
      isRecommended: option.isRecommended,
      isSelected: isSelectable && strategy === selectedStrategy,
      isSelectable,
      disabledReason: isSelectable ? undefined : '계산 데이터가 부족해 선택할 수 없어요.',
      detailHeadline: option.headline || '이 전략의 상세 계산 결과예요.',
      lastRemainingMoneyText: fmtKRW(option.finalNetWorth),
      houseCashSupportText: toHouseCashSupportText(option),
    };

    return [row];
  });
}
