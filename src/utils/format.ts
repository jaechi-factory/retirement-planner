/** 만원 단위 숫자를 "1,234만원" 형태로 포맷 */
export function formatManwon(value: number): string {
  if (!isFinite(value)) return '-';
  const rounded = Math.round(value);
  return rounded.toLocaleString('ko-KR') + '만원';
}

/** 억 단위로 포맷 (1억 이상인 경우) */
export function formatEok(value: number): string {
  if (!isFinite(value)) return '-';
  if (Math.abs(value) >= 10000) {
    const eok = value / 10000;
    return eok.toFixed(1) + '억원';
  }
  return Math.round(value).toLocaleString('ko-KR') + '만원';
}

/** 월 생활비 표시용: "300만원" */
export function formatMonthly(value: number): string {
  if (!isFinite(value) || value <= 0) return '-';
  return Math.round(value).toLocaleString('ko-KR') + '만원';
}

/** % 포맷 */
export function formatPercent(value: number, digits = 1): string {
  return value.toFixed(digits) + '%';
}
