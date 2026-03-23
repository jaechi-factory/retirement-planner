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
  crypto: '코인',
  realEstate: '부동산',
};

export const DEBT_LABELS: Record<string, string> = {
  mortgage: '주택담보대출',
  creditLoan: '신용대출',
  otherLoan: '기타 대출',
};

// ─── 상환방식: 주택담보대출 전용 옵션 ─────────────────────────────────────────
export const MORTGAGE_REPAYMENT_TYPES = ['equal_payment', 'equal_principal', 'graduated_payment'] as const;

export const MORTGAGE_REPAYMENT_LABELS: Record<string, string> = {
  equal_payment:    '원리금균등',
  equal_principal:  '원금균등',
  graduated_payment: '체증식',
};

export const MORTGAGE_REPAYMENT_DESCRIPTIONS: Record<string, string> = {
  equal_payment:    '매달 비슷한 금액을 내는 방식',
  equal_principal:  '초반에는 많이 내고, 시간이 갈수록 줄어드는 방식',
  graduated_payment: '초반에는 적게 내고, 시간이 갈수록 늘어나는 방식',
};

// ─── 상환방식: 신용대출·기타대출 전용 옵션 ───────────────────────────────────
export const OTHER_REPAYMENT_TYPES = ['equal_payment', 'equal_principal', 'balloon_payment'] as const;

export const OTHER_REPAYMENT_LABELS: Record<string, string> = {
  equal_payment:   '원리금균등',
  equal_principal: '원금균등',
  balloon_payment: '만기일시상환',
};

export const OTHER_REPAYMENT_DESCRIPTIONS: Record<string, string> = {
  equal_payment:   '매달 비슷한 금액을 내는 방식',
  equal_principal: '초반에는 많이 내고, 시간이 갈수록 줄어드는 방식',
  balloon_payment: '기간 중 이자만 내고, 만기에 원금을 한 번에 갚는 방식',
};

export const BINARY_SEARCH_MAX = 5000;      // 만원
export const BINARY_SEARCH_PRECISION = 1;   // 만원
export const BINARY_SEARCH_MAX_ITER = 50;

export const CALCULATION_DEBOUNCE_MS = 300;
