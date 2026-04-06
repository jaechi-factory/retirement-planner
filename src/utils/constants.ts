export const DEFAULT_INFLATION_RATE = 3.5;
export const DEFAULT_INCOME_GROWTH_RATE = 2.0;
export const DEFAULT_EXPENSE_GROWTH_RATE = 3.5;

export const DEFAULT_ASSET_RETURNS = {
  cash: 2.0,
  deposit: 3.5,
  stock_kr: 7.0,
  stock_us: 8.0,
  bond: 4.0,
  crypto: 15.0,
  realEstate: 3.0,
};

export const ASSET_LABELS: Record<string, string> = {
  cash: '현금',
  deposit: '예금·적금',
  stock_kr: '국내 주식',
  stock_us: '해외 주식',
  bond: '채권',
  crypto: '가상자산',
  realEstate: '부동산',
};

export const DEBT_LABELS: Record<string, string> = {
  mortgage: '주택담보대출',
  creditLoan: '신용대출',
  otherLoan: '기타 대출',
};

// ─── 상환방식: 주택담보대출 전용 옵션 ─────────────────────────────────────────
export const MORTGAGE_REPAYMENT_TYPES = ['equal_payment', 'equal_principal', 'graduated_payment'] as const;

/** 버튼 1행: 일상어 (짧게) */
export const MORTGAGE_REPAYMENT_FRIENDLY_LABELS: Record<string, string> = {
  equal_payment:    '매달 비슷하게',
  equal_principal:  '처음엔 많고 점점 적게',
  graduated_payment: '처음엔 적고, 나중에 늘어요',
};

/** 버튼 2행: 금융 용어 */
export const MORTGAGE_REPAYMENT_LABELS: Record<string, string> = {
  equal_payment:    '원리금균등',
  equal_principal:  '원금균등',
  graduated_payment: '체증식',
};

export const MORTGAGE_REPAYMENT_DESCRIPTIONS: Record<string, string> = {
  equal_payment:    '첫 달부터 마지막 달까지 내는 금액이 거의 같아요. 생활비 계획 짜기 편해요.',
  equal_principal:  '매달 갚는 원금이 일정해서 갈수록 납입액이 줄어요. 대신 초반 부담이 좀 더 커요.',
  graduated_payment: '초반엔 부담이 적고 매년 조금씩 늘어나요. 앞으로 소득이 오를 것 같을 때 잘 맞아요.',
};

// ─── 상환방식: 신용대출·기타대출 전용 옵션 ───────────────────────────────────
export const OTHER_REPAYMENT_TYPES = ['equal_payment', 'equal_principal', 'balloon_payment'] as const;

/** 버튼 1행: 일상어 (짧게) */
export const OTHER_REPAYMENT_FRIENDLY_LABELS: Record<string, string> = {
  equal_payment:   '매달 비슷하게',
  equal_principal: '처음엔 많고 점점 적게',
  balloon_payment: '만기에 한 번에',
};

/** 버튼 2행: 금융 용어 */
export const OTHER_REPAYMENT_LABELS: Record<string, string> = {
  equal_payment:   '원리금균등',
  equal_principal: '원금균등',
  balloon_payment: '만기일시상환',
};

export const OTHER_REPAYMENT_DESCRIPTIONS: Record<string, string> = {
  equal_payment:   '첫 달부터 마지막 달까지 내는 금액이 거의 같아요. 생활비 계획 짜기 편해요.',
  equal_principal: '매달 갚는 원금이 일정해서 갈수록 납입액이 줄어요. 대신 초반 부담이 좀 더 커요.',
  balloon_payment: '대출 기간 동안 이자만 내다가 만기에 원금을 한 번에 갚아요.',
};

export const BINARY_SEARCH_MAX = 5000;      // 만원
export const BINARY_SEARCH_PRECISION = 1;   // 만원
export const BINARY_SEARCH_MAX_ITER = 50;

export const CALCULATION_DEBOUNCE_MS = 300;
