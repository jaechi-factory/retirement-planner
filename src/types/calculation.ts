export interface YearlySnapshot {
  age: number;
  totalAsset: number;          // 해당 연도 말 총자산 (만원)
  isRetired: boolean;
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
  yearlySnapshots: YearlySnapshot[];

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
