import type { Verdict } from '../types/calculation';

/**
 * 목표 vs 가능 생활비 비교 → 판정
 */
export function judgeVerdict(
  targetMonthly: number,
  possibleMonthly: number
): Verdict {
  const gap = possibleMonthly - targetMonthly;
  const ratio = targetMonthly > 0 ? possibleMonthly / targetMonthly : 0;

  if (ratio >= 1.1) {
    return {
      level: 'great',
      label: '잘하고 있어요',
      color: 'var(--tds-green-500)',
      bgColor: 'var(--tds-green-50)',
      gap,
    };
  } else if (ratio >= 0.9) {
    return {
      level: 'good',
      label: '거의 맞췄어요',
      color: 'var(--tds-blue-500)',
      bgColor: 'var(--tds-blue-50)',
      gap,
    };
  } else if (ratio >= 0.75) {
    return {
      level: 'low',
      label: '조금 부족해요',
      color: 'var(--tds-orange-500)',
      bgColor: 'var(--tds-orange-50)',
      gap,
    };
  } else {
    return {
      level: 'critical',
      label: '많이 부족해요',
      color: 'var(--tds-red-500)',
      bgColor: 'var(--tds-red-50)',
      gap,
    };
  }
}
