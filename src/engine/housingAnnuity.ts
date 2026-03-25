/**
 * 주택연금 계산 모듈
 *
 * 한국주택금융공사 주택연금 기준 (2024년 기준 추정 테이블 기반)
 * - 최소 가입 나이: 55세
 * - 주택 가격 상한: 12억 원 (초과분은 절삭)
 * - 월 지급률: 나이별 선형 보간
 */

/** 나이별 월 지급률 (집값 대비 %) — 55세~90세 기준점 */
const ANNUITY_RATE_TABLE: Array<{ age: number; rate: number }> = [
  { age: 55, rate: 0.0012 }, // 0.12%/월
  { age: 60, rate: 0.0016 },
  { age: 65, rate: 0.0021 },
  { age: 70, rate: 0.0027 },
  { age: 75, rate: 0.0034 },
  { age: 80, rate: 0.0042 },
  { age: 85, rate: 0.0052 },
  { age: 90, rate: 0.0063 },
];

/** 주택연금 최소 가입 나이 */
export const HOUSING_ANNUITY_MIN_AGE = 55;

/** 주택연금 주택가격 상한 (만원 단위: 12억 = 120,000만원) */
const HOUSING_ANNUITY_PRICE_CAP = 120_000;

/**
 * 나이에 따른 월 지급률 선형 보간
 * @param age 가입 나이 (55세 미만이면 55세 기준, 90세 초과면 90세 기준)
 * @returns 월 지급률 (소수, 예: 0.0021)
 */
export function getHousingAnnuityMonthlyRate(age: number): number {
  const table = ANNUITY_RATE_TABLE;
  const clampedAge = Math.max(table[0].age, Math.min(table[table.length - 1].age, age));

  for (let i = 0; i < table.length - 1; i++) {
    const lower = table[i];
    const upper = table[i + 1];
    if (clampedAge >= lower.age && clampedAge <= upper.age) {
      const t = (clampedAge - lower.age) / (upper.age - lower.age);
      return lower.rate + t * (upper.rate - lower.rate);
    }
  }

  return table[table.length - 1].rate;
}

/**
 * 주택연금 월 수령액 계산 (현재가치, 만원)
 *
 * @param housingValueNominal 가입 시점의 주택 가격 (명목가치, 만원)
 * @param age 가입 나이
 * @param inflationRate 연 물가상승률 (%, 예: 2.5)
 * @param yearsFromNow 가입 시점이 현재로부터 몇 년 후인지
 * @returns 현재가치 기준 월 수령액 (만원)
 */
export function calcHousingAnnuityMonthly(
  housingValueNominal: number,
  age: number,
  inflationRate: number,
  yearsFromNow: number,
): number {
  if (age < HOUSING_ANNUITY_MIN_AGE) return 0;

  // 주택가격 상한 적용
  const cappedValue = Math.min(housingValueNominal, HOUSING_ANNUITY_PRICE_CAP);

  // 나이별 월 지급률
  const monthlyRate = getHousingAnnuityMonthlyRate(age);

  // 명목 월 수령액
  const nominalMonthly = cappedValue * monthlyRate;

  // 현재가치로 환산
  const inflationDecimal = inflationRate / 100;
  const presentValueMonthly = nominalMonthly / Math.pow(1 + inflationDecimal, yearsFromNow);

  return presentValueMonthly;
}
