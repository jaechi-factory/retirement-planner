
interface Props {
  targetMonthly: number;
  possibleMonthly: number;
  currentAge: number;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 목표 생활비 */}
      <div style={{ padding: '14px 0', borderBottom: '1px solid var(--tds-gray-100)' }}>
        <span style={{ fontSize: 13, color: 'var(--tds-gray-500)' }}>
          목표 생활비 <span style={{ fontSize: 11 }}>(현재 가치 기준)</span>
        </span>
        <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--tds-gray-900)', letterSpacing: '-0.5px' }}>
          월 {targetMonthly.toLocaleString('ko-KR')}만원
        </p>
      </div>

      {/* 가능한 생활비 — 핵심 */}
      <div style={{ padding: '14px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--tds-gray-500)' }}>
          현재 기준으로 실제 가능한 생활비 <span style={{ fontSize: 11 }}>(현재 가치 기준)</span>
        </span>
        <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 800, color: 'var(--tds-blue-500)', letterSpacing: '-0.5px' }}>
          월 {possibleMonthly.toLocaleString('ko-KR')}만원
        </p>
        <span style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>
          은퇴 후 {lifeExpectancy}세까지 {retirementYears}년간 지속 가능
        </span>
      </div>
    </div>
  );
}
