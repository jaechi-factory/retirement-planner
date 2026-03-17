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
            ? `목표 대비 월 ${absGap.toLocaleString('ko-KR')}만원 부족`
            : gap === 0
            ? '목표와 딱 맞아요'
            : `목표 대비 월 ${absGap.toLocaleString('ko-KR')}만원 여유`}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--tds-gray-500)' }}>
          {isShort
            ? '저축 또는 투자수익률을 높이거나 은퇴 시기를 조정해보세요'
            : '현재 재무 구조를 잘 유지하고 있어요'}
        </p>
      </div>
    </div>
  );
}
