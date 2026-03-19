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

export const BINARY_SEARCH_MAX = 5000;      // 만원
export const BINARY_SEARCH_PRECISION = 1;   // 만원
export const BINARY_SEARCH_MAX_ITER = 50;

export const CALCULATION_DEBOUNCE_MS = 300;
