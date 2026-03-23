import type { Verdict } from '../../types/calculation';

interface Props {
  verdict: Verdict;
}

export default function GapIndicator({ verdict }: Props) {
  const { gap, color, bgColor } = verdict;
  const isShort = gap < 0;
  const absGap = Math.abs(Math.round(gap));

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 12,
        padding: '14px 16px',
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 20 }}>{isShort ? '⚠️' : '✅'}</span>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color }}>
          {isShort
            ? `목표보다 매달 ${absGap.toLocaleString('ko-KR')}만원 더 필요해요`
            : gap === 0
            ? '목표와 딱 맞아요'
            : `목표보다 매달 ${absGap.toLocaleString('ko-KR')}만원 여유가 있어요`}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--tds-gray-500)' }}>
          {isShort
            ? '저축을 늘리거나, 지출을 줄이거나, 은퇴 시기를 늦추면 가까워져요'
            : '지금 흐름대로 유지하면 충분해요'}
        </p>
      </div>
    </div>
  );
}
