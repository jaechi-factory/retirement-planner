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
      color: '#00B493',
      bgColor: '#E8FAF6',
      gap,
    };
  } else if (ratio >= 0.9) {
    return {
      level: 'good',
      label: '거의 맞췄어요',
      color: '#3182F6',
      bgColor: '#EBF3FE',
      gap,
    };
  } else if (ratio >= 0.75) {
    return {
      level: 'low',
      label: '조금 부족해요',
      color: '#FF6B00',
      bgColor: '#FFF3E8',
      gap,
    };
  } else {
    return {
      level: 'critical',
      label: '많이 부족해요',
      color: '#F04452',
      bgColor: '#FEF0F1',
      gap,
    };
  }
}
