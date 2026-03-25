import type { HousingPolicy } from '../engine/housingPolicy';

export interface YearlySnapshot {
  age: number;
  isRetired: boolean;
  financialAssetEnd: number; // 금융자산 잔액 (만원, 현금/주식/예금 등 realEstate 제외)
  housingAssetEnd: number;   // 부동산 잔액 (만원, 별도 성장)
  grossAssetEnd: number;     // 잔고 자산 = financialAsset + housingAsset (만원, 부채 미차감)
  remainingDebtEnd: number;  // 잔여 부채 (만원)
  netAssetEnd: number;       // 순자산 = gross - debt (만원)
  totalAsset: number;        // = netAssetEnd (하위호환)

  // 연간 현금흐름 breakdown (currentAge 스냅샷은 전부 0)
  annualInvestmentReturn: number;    // 투자수익 (만원)
  annualIncomeThisYear: number;      // 근로소득 (만원)
  annualPensionIncomeThisYear: number; // 연금수입 (만원)
  annualExpenseThisYear: number;     // 생활비 (만원)
  annualDebtRepaymentThisYear: number; // 부채상환 (만원)
  annualChildExpenseThisYear: number;  // 자녀지출 (만원)
  annualNetCashflow: number;         // 순현금흐름 (만원)

  // 주택 활용 정책 관련 (정책 시나리오 시뮬레이션에서만 채워짐)
  housingAnnuityIncomeThisYear?: number;  // 주택연금 수령액 (만원)
  postSaleHousingCostThisYear?: number;   // 집 매각 후 임대비용 (만원)
}

/** 주택 활용 시나리오 결과 */
export interface HousingScenarioResult {
  policy: HousingPolicy;
  possibleMonthly: number;             // 지속 가능한 월 생활비 (현재가치, 만원)
  survivesToLifeExpectancy: boolean;   // 기대수명까지 자산 유지 여부

  // 소진 나이 정보
  cashDepletionAge: number | null;        // 현금+예금 소진 나이
  financialDepletionAge: number | null;   // 금융자산 (현금+예금+주식+채권+코인) 소진 나이
  netDepletionAge: number | null;         // 순자산(전체) 소진 나이 (null=기대수명까지 유지)

  // 주택연금 (B 시나리오)
  housingAnnuityStartAge: number | null;  // 주택연금 개시 나이
  housingAnnuityMonthlyNominal: number;   // 주택연금 명목 월 수령액 (만원)
  housingAnnuityMonthlyTodayValue: number; // 주택연금 현재가치 월 수령액 (만원)

  // 집 매각 (C 시나리오)
  housingLiquidationAge: number | null;   // 집 매각 나이
  liquidationNetProceeds: number;         // 매각 순수익 (부채·헤어컷 차감 후, 만원)
  postSaleAnnualHousingCost: number;      // 매각 후 연 임대비 (만원)

  // 차트용 스냅샷
  targetYearlySnapshots: YearlySnapshot[];
}

/** 3개 시나리오 세트 + 추천 결과 */
export interface HousingScenarioSet {
  keep: HousingScenarioResult;
  annuity: HousingScenarioResult;
  liquidate: HousingScenarioResult;
  recommendedScenario: 'keep' | 'annuity' | 'liquidate';
  recommendationReason: string;
}

export interface CalculationResult {
  // 자동계산 항목
  totalAsset: number;          // 총자산 (만원)
  totalDebt: number;           // 총부채 (만원)
  netWorth: number;            // 순자산 (만원)
  weightedReturn: number;      // 전체 기대수익률 (%)
  annualNetSavings: number;    // 연간 순저축액 (만원)
  annualChildExpense: number;  // 자녀 연지출 (만원)
  requiredMonthlyAtRetirement: number; // 은퇴시점 필요 월생활비 (만원)
  liquidRatio: number;         // 유동자산 비율 (realEstate 제외, 0~1)

  // 역산 결과 (추천 시나리오 기준)
  possibleMonthly: number;     // 가능한 월 생활비 (만원, 현재가치) — 추천 시나리오 possibleMonthly

  // 시뮬레이션 데이터 (추천 시나리오 기준)
  yearlySnapshots: YearlySnapshot[];        // possibleMonthly 기준 (내부 계산용)
  targetYearlySnapshots: YearlySnapshot[];  // targetMonthly 기준 (차트 표시용)

  // 연금
  totalMonthlyPensionTodayValue: number;    // 연금 월 합계 전체 (현재가치, 만원)
  monthlyPensionAtRetirementStart: number;  // 은퇴 직후 시점 이미 개시된 연금 합계 (현재가치, 만원)
  pensionCoverageRate: number;              // 연금 커버율 = 전체합계 / 목표생활비 (0~1)

  // 자산 소진 (금융자산 keep 기준)
  depletionAge: number | null;         // 목표 생활비 기준 순자산 소진 나이 (null = 기대수명까지 유지)
  financialStressAge: number | null;   // 금융자산 고갈 나이 (null = 기대수명까지 유지)

  // 첫 해 월 부채 상환액 (debt schedule 기준, 만원) — UI 표시용
  firstYearMonthlyDebt: number;

  // 주택 활용 시나리오 세트 (기본값 null; 옵션형 "집 활용 전략" 섹션 활성화 시 채워짐)
  housingScenarios: HousingScenarioSet | null;

  // 유효성
  isValid: boolean;
  errorMessage?: string | null;
}

export type VerdictLevel = 'great' | 'good' | 'low' | 'critical';

export interface Verdict {
  level: VerdictLevel;
  label: string;
  color: string;
  bgColor: string;
  gap: number;   // possibleMonthly - targetMonthly (만원, 음수=부족)
}
