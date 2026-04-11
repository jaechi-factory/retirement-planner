/**
 * 만원 단위 숫자를 한국식 단위로 포맷
 *
 * fmtKRW(300)        → "300만원"
 * fmtKRW(9900)       → "9,900만원"
 * fmtKRW(10000)      → "1억원"
 * fmtKRW(19000)      → "1억 9,000만원"
 * fmtKRW(99000)      → "9억 9,000만원"
 */
export function fmtKRW(value: number): string {
  if (!isFinite(value)) return '-';
  const r = Math.round(value);
  const abs = Math.abs(r);
  const sign = r < 0 ? '-' : '';

  if (abs >= 10000) {
    const eok = Math.floor(abs / 10000);
    const remainder = abs % 10000;
    if (remainder === 0) return `${sign}${eok}억원`;
    return `${sign}${eok}억 ${remainder.toLocaleString('ko-KR')}만원`;
  }
  return sign + abs.toLocaleString('ko-KR') + '만원';
}

/**
 * 차트 Y축 등 공간이 좁은 곳에 쓰는 축약형
 *
 * fmtKRWAxis(5000)   → "5,000만"
 * fmtKRWAxis(10000)  → "1억"
 * fmtKRWAxis(15000)  → "1억5천"
 * fmtKRWAxis(99000)  → "9억9천"
 */
export function fmtKRWAxis(value: number): string {
  if (!isFinite(value)) return '';
  const r = Math.round(value);
  const abs = Math.abs(r);
  const sign = r < 0 ? '-' : '';

  if (abs >= 10000) {
    const eok = Math.floor(abs / 10000);
    const remainder = abs % 10000;
    if (remainder === 0) return `${sign}${eok}억`;
    const cheon = Math.round(remainder / 1000);
    if (cheon > 0) return `${sign}${eok}억${cheon}천`;
    return `${sign}${eok}억`;
  }
  // 1,000만 이상은 "N천"으로 축약 (좁은 Y축에서 잘리지 않도록)
  if (abs >= 1000) {
    const cheon = Math.round(abs / 1000);
    return `${sign}${cheon}천`;
  }
  return `${sign}${abs.toLocaleString('ko-KR')}만`;
}

/** 월 생활비 표시용: "300만원" */
export function formatMonthly(value: number): string {
  if (!isFinite(value) || value <= 0) return '-';
  return fmtKRW(value);
}

/** % 포맷 */
export function formatPercent(value: number, digits = 1): string {
  return value.toFixed(digits) + '%';
}

// 하위 호환 alias
export const formatManwon = fmtKRW;
export const formatEok = fmtKRW;
