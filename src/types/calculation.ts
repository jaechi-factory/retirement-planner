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

  // 역산 결과
  possibleMonthly: number;     // 가능한 월 생활비 (만원, 현재가치)

  // 시뮬레이션 데이터
  yearlySnapshots: YearlySnapshot[];        // possibleMonthly 기준 (내부 계산용)
  targetYearlySnapshots: YearlySnapshot[];  // targetMonthly 기준 (차트 표시용)

  // 연금
  totalMonthlyPensionTodayValue: number;    // 연금 월 합계 전체 (현재가치, 만원)
  monthlyPensionAtRetirementStart: number;  // 은퇴 직후 시점 이미 개시된 연금 합계 (현재가치, 만원)
  pensionCoverageRate: number;              // 연금 커버율 = 전체합계 / 목표생활비 (0~1)

  // 자산 소진
  depletionAge: number | null;         // 목표 생활비 기준 순자산 소진 나이 (null = 기대수명까지 유지)
  financialStressAge: number | null;   // 금융자산만 먼저 바닥나는 나이 (null = 기대수명까지 유지)

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
