import type { DebtItem } from '../types/inputs';

/**
 * 월별 상환 스케줄 행
 * - monthIndex: 0-based (0 = 첫 번째 달)
 */
export interface MonthlyDebtRow {
  monthIndex: number;
  payment: number;         // 총 납입액 (만원)
  principal: number;       // 원금 (만원)
  interest: number;        // 이자 (만원)
  remainingBalance: number; // 남은 원금 (만원)
}

/**
 * 여러 대출의 선계산 스케줄 묶음
 * - simulator가 이진탐색 루프 바깥에서 한 번만 계산 후 재사용
 */
export interface DebtSchedules {
  mortgage: MonthlyDebtRow[];
  creditLoan: MonthlyDebtRow[];
  otherLoan: MonthlyDebtRow[];
}

// ─── 체증식 서비스 기본 가정 ──────────────────────────────────────────────────
/**
 * 체증식(graduated_payment) 연간 증가율 서비스 기본값.
 *
 * ⚠ 특정 은행/공공기관의 공식 표준이 아님 — service default assumption.
 * 실제 체증식 대출 상품의 증가율은 상품마다 다를 수 있음.
 */
export const GRADUATED_DEFAULT_ANNUAL_RATE = 0.015; // 1.5% p.a.

// ─── 내부 유틸리티 ────────────────────────────────────────────────────────────

/** 원리금균등 월 납입액 (표준 공식) */
function calcEqualPaymentMonthly(balance: number, monthlyRate: number, months: number): number {
  if (balance <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return balance / months;
  return balance * monthlyRate * Math.pow(1 + monthlyRate, months) /
    (Math.pow(1 + monthlyRate, months) - 1);
}

/**
 * 체증식 첫 달(1년차) 월 납입액 계산 — closed-form 공식.
 *
 * 수식 (service default assumption, 블랙박스 금지):
 *   g  = 연 체증 증가율 (GRADUATED_DEFAULT_ANNUAL_RATE)
 *   r  = 월 이자율
 *   Y  = 상환 연수 (= repaymentMonths / 12)
 *   q  = (1 + g) / (1 + r)^12   — 연간 할인-증가 복합 비율
 *   A  = (1 - (1 + r)^(-12)) / r — 연 지급 현가 계수
 *
 *   M0 = P / (A × (1 - q^Y) / (1 - q))   (q ≠ 1인 일반 케이스)
 *   M0 = P / (A × Y)                      (q ≈ 1인 극한 케이스)
 *
 *   k년차(1-based) 월 납입액 = M0 × (1 + g)^(k-1)
 *
 * 전체 기간 종료 시 잔액이 0에 수렴하는 것을 보장함.
 */
function calcGraduatedFirstMonthPayment(
  balance: number,
  monthlyRate: number,
  repaymentMonths: number,
  annualIncreaseRate: number = GRADUATED_DEFAULT_ANNUAL_RATE,
): number {
  if (balance <= 0 || repaymentMonths <= 0) return 0;
  const Y = repaymentMonths / 12;
  const q = (1 + annualIncreaseRate) / Math.pow(1 + monthlyRate, 12);
  const A = monthlyRate === 0 ? 12 : (1 - Math.pow(1 + monthlyRate, -12)) / monthlyRate;
  const denominator = Math.abs(1 - q) < 1e-10
    ? A * Y                       // q ≈ 1 극한 처리
    : A * (1 - Math.pow(q, Y)) / (1 - q);
  if (denominator <= 0) return calcEqualPaymentMonthly(balance, monthlyRate, repaymentMonths);
  return balance / denominator;
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 대출 1건의 전체 월별 상환 스케줄을 생성한다.
 *
 * - 잔액·기간 중 하나라도 0이면 빈 배열 반환.
 */
export function buildMonthlyDebtSchedule(debt: DebtItem): MonthlyDebtRow[] {
  const { balance, interestRate, repaymentType, repaymentYears } = debt;

  if (balance <= 0 || repaymentYears <= 0) return [];

  const r = interestRate / 100 / 12;  // 월 이자율
  const totalMonths = Math.round(repaymentYears * 12);

  const rows: MonthlyDebtRow[] = [];
  let remaining = balance;

  // ── 원리금균등 (equal_payment) ─────────────────────────────────────────
  if (repaymentType === 'equal_payment') {
    const monthlyPayment = calcEqualPaymentMonthly(remaining, r, totalMonths);
    for (let m = 0; m < totalMonths; m++) {
      const interest = remaining * r;
      const principal = Math.min(monthlyPayment - interest, remaining);
      remaining = Math.max(remaining - principal, 0);
      rows.push({
        monthIndex: m,
        payment: interest + principal,
        principal,
        interest,
        remainingBalance: remaining,
      });
    }
    return rows;
  }

  // ── 원금균등 (equal_principal) ─────────────────────────────────────────
  if (repaymentType === 'equal_principal') {
    const monthlyPrincipal = remaining / totalMonths;
    for (let m = 0; m < totalMonths; m++) {
      const interest = remaining * r;
      const principal = Math.min(monthlyPrincipal, remaining);
      remaining = Math.max(remaining - principal, 0);
      rows.push({
        monthIndex: m,
        payment: interest + principal,
        principal,
        interest,
        remainingBalance: remaining,
      });
    }
    return rows;
  }

  // ── 체증식 (graduated_payment) ─────────────────────────────────────────
  if (repaymentType === 'graduated_payment') {
    const g = GRADUATED_DEFAULT_ANNUAL_RATE;
    const M0 = calcGraduatedFirstMonthPayment(remaining, r, totalMonths, g);
    for (let m = 0; m < totalMonths; m++) {
      const yearIndex = Math.floor(m / 12); // 0-based 연도
      const yearlyPayment = M0 * Math.pow(1 + g, yearIndex);
      const interest = remaining * r;
      // 마지막 달: 잔액 전액 상환으로 반올림 오차 제거
      const isLast = m === totalMonths - 1;
      const principal = isLast
        ? remaining
        : Math.min(yearlyPayment - interest, remaining);
      remaining = Math.max(remaining - principal, 0);
      rows.push({
        monthIndex: m,
        payment: interest + principal,
        principal,
        interest,
        remainingBalance: remaining,
      });
    }
    return rows;
  }

  // ── 만기일시상환 (balloon_payment) ────────────────────────────────────
  // 기간 내 이자만 → 마지막 달 원금 일시
  for (let m = 0; m < totalMonths; m++) {
    const interest = remaining * r;
    const isLast = m === totalMonths - 1;
    const principal = isLast ? remaining : 0;
    remaining = isLast ? 0 : remaining;
    rows.push({
      monthIndex: m,
      payment: interest + principal,
      principal,
      interest,
      remainingBalance: remaining,
    });
  }
  return rows;
}

// ─── 집계 헬퍼 ───────────────────────────────────────────────────────────────

/**
 * 특정 연도(0-based, 시뮬레이션 기준 경과 연수)의 연간 납입액 합산.
 * yearIndex=0 → 1~12번째 달, yearIndex=1 → 13~24번째 달 ...
 */
export function getAnnualPaymentFromSchedule(
  schedule: MonthlyDebtRow[],
  yearIndex: number,
): number {
  const start = yearIndex * 12;
  const end = start + 12;
  return schedule
    .filter(r => r.monthIndex >= start && r.monthIndex < end)
    .reduce((sum, r) => sum + r.payment, 0);
}

/**
 * 특정 연도말(0-based) 잔여 원금.
 * yearIndex=-1 → 상환 시작 전 원래 잔액 (시뮬레이션 초기 스냅샷용)
 * yearIndex=0  → 12번째 달 말 잔액, yearIndex=1 → 24번째 달 말 잔액 ...
 */
export function getRemainingBalanceFromSchedule(
  schedule: MonthlyDebtRow[],
  yearIndex: number,
): number {
  if (schedule.length === 0) return 0;
  // yearIndex=-1: 상환 시작 전 원래 잔액 = 첫 달 납부 전 잔액
  if (yearIndex < 0) {
    const firstRow = schedule[0];
    return firstRow.remainingBalance + firstRow.principal;
  }
  const targetMonth = (yearIndex + 1) * 12 - 1; // 해당 연도 마지막 달 index
  // 스케줄 범위 밖이면 0
  const lastRow = schedule[schedule.length - 1];
  if (targetMonth > lastRow.monthIndex) return 0;
  // 해당 월 row 찾기
  const row = schedule.find(r => r.monthIndex === targetMonth);
  return row ? row.remainingBalance : 0;
}

/**
 * 스케줄에서 유용한 요약 정보 추출
 * - 향후 결과 카드 / 설명 UI 활용 가능
 */
export interface DebtScheduleSummary {
  firstMonthPayment: number;        // 첫 달 납입액
  firstYearAnnualPayment: number;   // 첫 해 연간 납입액
  maxMonthPayment: number;          // 최고 월 납입액
  maxMonthIndex: number;            // 최고 월 납입액 발생 시점 (0-based)
  totalInterest: number;            // 총 이자
  annualPayments: number[];         // 연도별 연간 납입액 배열
}

export function summarizeDebtSchedule(schedule: MonthlyDebtRow[]): DebtScheduleSummary {
  if (schedule.length === 0) {
    return { firstMonthPayment: 0, firstYearAnnualPayment: 0, maxMonthPayment: 0, maxMonthIndex: 0, totalInterest: 0, annualPayments: [] };
  }
  const totalMonths = schedule[schedule.length - 1].monthIndex + 1;
  const totalYears = Math.ceil(totalMonths / 12);

  const firstMonthPayment = schedule[0].payment;
  const firstYearAnnualPayment = getAnnualPaymentFromSchedule(schedule, 0);
  const maxRow = schedule.reduce((max, r) => r.payment > max.payment ? r : max, schedule[0]);
  const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0);
  const annualPayments = Array.from({ length: totalYears }, (_, y) =>
    getAnnualPaymentFromSchedule(schedule, y)
  );

  return {
    firstMonthPayment,
    firstYearAnnualPayment,
    maxMonthPayment: maxRow.payment,
    maxMonthIndex: maxRow.monthIndex,
    totalInterest,
    annualPayments,
  };
}
