/** V2 월별 스냅샷 이벤트 플래그 */
export interface SnapshotEventFlags {
  cashBufferHit?: boolean;               // 현금성 버퍼 하한 도달 (투자자산 매도 시작)
  financialSellStarted?: boolean;        // 투자자산 매도 첫 발생
  financialExhausted?: boolean;          // 투자자산 소진
  propertyInterventionStarted?: boolean; // 부동산 전략 개시
  securedLoanDraw?: boolean;             // 담보대출 draw 발생
  propertySold?: boolean;                // 집 매각 발생
  failureOccurred?: boolean;             // 최종 실패 (shortfall 발생)
}

/** V2 월별 스냅샷 */
export interface MonthlySnapshotV2 {
  ageYear: number;
  ageMonthIndex: number;                 // 0~11
  cashLikeEnd: number;                   // 현금성(cash+deposit) 잔고 (만원)
  financialInvestableEnd: number;        // 투자자산(주식+채권+코인) 잔고 (만원)
  propertyValueEnd: number;              // 부동산 평가액 (만원)
  propertyDebtEnd: number;               // 부동산 관련 기존 부채 잔고 (만원)
  securedLoanBalanceEnd: number;         // 담보대출 누적 잔고 (secured_loan 전략, 만원)
  propertySaleProceedsBucketEnd: number; // 매각 대금 버킷 잔고 (sell 전략, 만원)
  shortfallThisMonth: number;            // 미충당 금액 (0이면 정상, 만원)
  incomeThisMonth: number;               // 근로소득 (만원)
  pensionThisMonth: number;              // 연금수입 (만원)
  expenseThisMonth: number;              // 생활비 (만원)
  debtServiceThisMonth: number;          // 부채상환 (만원)
  childExpenseThisMonth: number;         // 자녀지출 (만원)
  rentalCostThisMonth: number;           // 매각 후 임대비 (만원, sell 전략)
  eventFlags: SnapshotEventFlags;
  // 개별 버킷 잔고 — 매도 순서 검증용 (테스트/디버그)
  cashEnd: number;
  depositEnd: number;
  bondEnd: number;
  stockKrEnd: number;
  stockUsEnd: number;
  cryptoEnd: number;
}

/** 월별 스냅샷을 연도별로 집계한 요약 */
export interface YearlyAggregateV2 {
  ageYear: number;
  cashLikeEnd: number;                   // 연말 현금성 잔고
  financialInvestableEnd: number;        // 연말 투자자산 잔고
  propertyValueEnd: number;              // 연말 부동산 평가액
  securedLoanBalanceEnd: number;         // 연말 담보대출 잔고
  propertySaleProceedsBucketEnd: number; // 연말 매각대금 버킷
  totalShortfall: number;                // 연간 미충당 합계
  totalIncome: number;                   // 연간 근로소득
  totalPension: number;                  // 연간 연금
  totalExpense: number;                  // 연간 생활비
  totalDebtService: number;              // 연간 부채상환
  totalChildExpense: number;             // 연간 자녀지출
  eventSummary: string[];                // 이벤트 요약 텍스트 목록
  months: MonthlySnapshotV2[];           // 드릴다운용 원본 월별 데이터
}

/** 자금 조달 단계 */
export interface FundingStage {
  label: string;
  fromAge: number;
  toAge: number | null;                  // null = 기대수명까지
  bucketType:
    | 'income'          // 근로소득 구간
    | 'cash_like'       // 현금성 사용 구간
    | 'financial'       // 투자자산 매도 구간
    | 'property_keep'   // 부동산 유지 (집 그냥 두기)
    | 'property_loan'   // 담보대출 구간
    | 'property_sale'   // 매각 대금 사용 구간
    | 'failure';        // 자금 부족 구간
}

/** 부동산 전략 옵션별 결과 */
export interface PropertyOptionResult {
  strategy: 'keep' | 'secured_loan' | 'sell';
  label: string;                          // "집 그냥 두기"
  sustainableMonthly: number;             // 지속 가능한 월 생활비 (현재가치, 만원)
  interventionAge: number | null;         // 부동산 전략 개시 나이
  survivesToLifeExpectancy: boolean;      // 기대수명까지 유지 여부
  failureAge: number | null;              // 자금 고갈 나이
  finalNetWorth: number;                  // 기대수명 시점 순자산
  headline: string;                       // 한 줄 해석 (사용자 언어)
  isRecommended: boolean;
  yearlyAggregates: YearlyAggregateV2[];  // 차트/비교용 연도별 집계
}

export interface AssumptionItem {
  label: string;
  value: string;
}

export interface WarningItem {
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

/**
 * V2 계산 결과 DTO.
 * chartData는 포함하지 않음 — 각 차트 컴포넌트가 UI selector에서 직접 조립.
 */
export interface CalculationResultV2 {
  summary: {
    sustainableMonthly: number;           // 끝까지 유지 가능한 월 생활비
    targetGap: number;                    // 목표 대비 차이 (음수 = 부족)
    cashRunoutAge: number | null;         // 현금성 고갈 나이
    financialSellStartAge: number | null; // 투자자산 매도 시작 나이
    financialExhaustionAge: number | null;// 투자자산 소진 나이
    propertyInterventionAge: number | null; // 집 건드려야 하는 나이 (권장 전략)
    failureAge: number | null;            // 최종 자금 고갈 나이
  };
  fundingTimeline: FundingStage[];
  propertyOptions: PropertyOptionResult[]; // 항상 3개: keep / secured_loan / sell
  detailYearlyAggregates: YearlyAggregateV2[]; // 권장 전략 기준 연 요약 + 월 드릴다운
  assumptions: AssumptionItem[];
  warnings: WarningItem[];
}
