interface Props {
  targetMonthly: number;
  possibleMonthly: number;
  retirementAge: number;
  lifeExpectancy: number;
}

export default function MonthlyComparison({
  targetMonthly,
  possibleMonthly,
  retirementAge,
  lifeExpectancy,
}: Props) {
  const retirementYears = lifeExpectancy - retirementAge;
  const gap = possibleMonthly - targetMonthly;
  const isOk = gap >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 목표 생활비 */}
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--tds-gray-100)' }}>
        <span style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>목표 생활비 (지금 기준)</span>
        <p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--tds-gray-900)', letterSpacing: '-0.5px' }}>
          월 {targetMonthly.toLocaleString('ko-KR')}만원
        </p>
      </div>

      {/* 퇴직 후 가능한 월생활비 */}
      <div style={{ padding: '12px 0' }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>퇴직 후 가능한 월생활비</span>
          <span style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginLeft: 6 }}>금융자산 · 연금 기준</span>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: isOk ? 'var(--tds-blue-500)' : 'var(--tds-orange-500)', letterSpacing: '-0.5px' }}>
          월 {possibleMonthly.toLocaleString('ko-KR')}만원
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>
            은퇴 후 {lifeExpectancy}세까지 {retirementYears}년간
          </span>
          {gap !== 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: isOk ? 'var(--tds-blue-500)' : 'var(--tds-red-500)' }}>
              {isOk ? `목표 대비 +${gap.toLocaleString('ko-KR')}만` : `목표 대비 ${gap.toLocaleString('ko-KR')}만`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
