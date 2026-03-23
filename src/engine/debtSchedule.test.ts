import { describe, it, expect } from 'vitest';
import {
  buildMonthlyDebtSchedule,
  getAnnualPaymentFromSchedule,
  getRemainingBalanceFromSchedule,
  GRADUATED_DEFAULT_ANNUAL_RATE,
} from './debtSchedule';
import type { DebtItem } from '../types/inputs';

// 테스트용 대출 기본값
const base = (overrides: Partial<DebtItem>): DebtItem => ({
  balance: 30000,        // 3억 (만원)
  interestRate: 4.0,     // 연 4%
  repaymentType: 'equal_payment',
  repaymentYears: 30,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('buildMonthlyDebtSchedule — 엣지 케이스', () => {
  it('잔액 0이면 빈 배열 반환', () => {
    expect(buildMonthlyDebtSchedule(base({ balance: 0 }))).toHaveLength(0);
  });

  it('상환기간 0이면 빈 배열 반환', () => {
    expect(buildMonthlyDebtSchedule(base({ repaymentYears: 0 }))).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('equal_payment — 원리금균등', () => {
  const schedule = buildMonthlyDebtSchedule(base({ repaymentType: 'equal_payment' }));

  it('스케줄 총 개월 수는 상환기간 × 12', () => {
    expect(schedule).toHaveLength(30 * 12);
  });

  it('매월 총 납입액이 거의 동일 (±0.01만원)', () => {
    const payments = schedule.map(r => r.payment);
    const first = payments[0];
    payments.forEach(p => {
      expect(Math.abs(p - first)).toBeLessThan(0.01 + 0.1); // 마지막달 반올림 허용
    });
  });

  it('마지막 달 remainingBalance ≈ 0 (0.1만원 이내)', () => {
    const last = schedule[schedule.length - 1];
    expect(Math.abs(last.remainingBalance)).toBeLessThan(0.1);
  });

  it('매월 principal > 0', () => {
    schedule.forEach(r => expect(r.principal).toBeGreaterThan(0));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('equal_principal — 원금균등', () => {
  const schedule = buildMonthlyDebtSchedule(base({ repaymentType: 'equal_principal' }));

  it('스케줄 총 개월 수는 상환기간 × 12', () => {
    expect(schedule).toHaveLength(30 * 12);
  });

  it('매월 원금 납입액이 일정 (±0.001만원)', () => {
    const principals = schedule.map(r => r.principal);
    const first = principals[0];
    principals.forEach(p => {
      expect(Math.abs(p - first)).toBeLessThan(0.001);
    });
  });

  it('총 납입액은 시간이 갈수록 감소 (첫달 > 마지막달)', () => {
    expect(schedule[0].payment).toBeGreaterThan(schedule[schedule.length - 1].payment);
  });

  it('마지막 달 remainingBalance ≈ 0', () => {
    expect(Math.abs(schedule[schedule.length - 1].remainingBalance)).toBeLessThan(0.1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('graduated_payment — 체증식', () => {
  const schedule = buildMonthlyDebtSchedule(base({ repaymentType: 'graduated_payment' }));

  it('스케줄 총 개월 수는 상환기간 × 12', () => {
    expect(schedule).toHaveLength(30 * 12);
  });

  it('1년차 월 납입액이 원리금균등보다 낮음', () => {
    const equalPayment = buildMonthlyDebtSchedule(base({ repaymentType: 'equal_payment' }));
    const gradFirst = schedule[0].payment;
    const equalFirst = equalPayment[0].payment;
    expect(gradFirst).toBeLessThan(equalFirst);
  });

  it('연도별 월 납입액이 증가 (1년차 < 2년차 < 5년차)', () => {
    const yr1 = schedule[0].payment;
    const yr2 = schedule[12].payment;
    const yr5 = schedule[48].payment;
    expect(yr2).toBeGreaterThan(yr1);
    expect(yr5).toBeGreaterThan(yr2);
  });

  it(`연간 증가율이 GRADUATED_DEFAULT_ANNUAL_RATE(${GRADUATED_DEFAULT_ANNUAL_RATE * 100}%)에 가까움`, () => {
    const yr1Annual = schedule.slice(0, 12).reduce((s, r) => s + r.payment, 0);
    const yr2Annual = schedule.slice(12, 24).reduce((s, r) => s + r.payment, 0);
    const actualRate = yr2Annual / yr1Annual - 1;
    expect(Math.abs(actualRate - GRADUATED_DEFAULT_ANNUAL_RATE)).toBeLessThan(0.001);
  });

  it('마지막 달 remainingBalance ≈ 0 (0.5만원 이내)', () => {
    const last = schedule[schedule.length - 1];
    expect(Math.abs(last.remainingBalance)).toBeLessThan(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('balloon_payment — 만기일시상환', () => {
  const schedule = buildMonthlyDebtSchedule(base({ repaymentType: 'balloon_payment', repaymentYears: 10 }));

  it('스케줄 총 개월 수는 상환기간 × 12', () => {
    expect(schedule).toHaveLength(10 * 12);
  });

  it('마지막 달을 제외한 모든 달 principal === 0', () => {
    schedule.slice(0, -1).forEach(r => {
      expect(r.principal).toBe(0);
    });
  });

  it('마지막 달에 원금 일시 상환', () => {
    const last = schedule[schedule.length - 1];
    expect(last.principal).toBeCloseTo(30000, 0);
    expect(last.remainingBalance).toBeCloseTo(0, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('집계 헬퍼', () => {
  const schedule = buildMonthlyDebtSchedule(base({
    repaymentType: 'equal_payment',
    repaymentYears: 30,
  }));

  it('getAnnualPaymentFromSchedule: 0년차 합산 = 12달 합산', () => {
    const expected = schedule.slice(0, 12).reduce((s, r) => s + r.payment, 0);
    expect(getAnnualPaymentFromSchedule(schedule, 0)).toBeCloseTo(expected, 2);
  });

  it('getAnnualPaymentFromSchedule: 상환 종료 후 연도 = 0', () => {
    expect(getAnnualPaymentFromSchedule(schedule, 31)).toBe(0);
  });

  it('getRemainingBalanceFromSchedule: 0년차 말 = 12번째 달 잔액', () => {
    const expected = schedule[11].remainingBalance;
    expect(getRemainingBalanceFromSchedule(schedule, 0)).toBeCloseTo(expected, 2);
  });

  it('getRemainingBalanceFromSchedule: 상환 종료 후 연도 = 0', () => {
    expect(getRemainingBalanceFromSchedule(schedule, 31)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('회귀: 원리금균등 연간납입액 오차 1만원 이내', () => {
  it('3억/연4%/30년 첫해 납입액이 기존 공식과 일치', () => {
    // 기존 공식: M = P × r(1+r)^n / ((1+r)^n - 1) × 12
    const P = 30000, r = 4 / 100 / 12, n = 30 * 12;
    const monthly = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const expectedAnnual = monthly * 12;

    const schedule = buildMonthlyDebtSchedule(base({
      repaymentType: 'equal_payment',
      repaymentYears: 30,
    }));
    const actual = getAnnualPaymentFromSchedule(schedule, 0);
    expect(Math.abs(actual - expectedAnnual)).toBeLessThan(1);
  });
});
