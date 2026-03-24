import type { HousingScenarioSet } from '../../types/calculation';

interface Props {
  targetMonthly: number;
  possibleMonthly: number;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  housingScenarios: HousingScenarioSet | null;
}

const SCENARIO_LABELS: Record<string, string> = {
  keep: '집 그대로',
  annuity: '주택연금',
  liquidate: '집 매각',
};

const SCENARIO_ICONS: Record<string, string> = {
  keep: '🏦',
  annuity: '🏠',
  liquidate: '🔑',
};

function ScenarioPathLine({
  scenario,
  result,
  isRecommended,
  targetMonthly,
}: {
  scenario: 'keep' | 'annuity' | 'liquidate';
  result: HousingScenarioSet['keep'];
  isRecommended: boolean;
  targetMonthly: number;
}) {
  const gap = result.possibleMonthly - targetMonthly;
  const isOk = gap >= 0;

  // 경로 설명 한 줄
  let pathDesc = '';
  if (scenario === 'keep') {
    pathDesc = '금융자산만으로 생활비 충당';
  } else if (scenario === 'annuity' && result.housingAnnuityStartAge !== null) {
    pathDesc = `${result.housingAnnuityStartAge}세부터 주택연금 월 ${Math.round(result.housingAnnuityMonthlyTodayValue).toLocaleString('ko-KR')}만원 추가`;
  } else if (scenario === 'annuity') {
    pathDesc = '주택연금 활용 (조건 충족 시)';
  } else if (scenario === 'liquidate' && result.housingLiquidationAge !== null) {
    pathDesc = `${result.housingLiquidationAge}세에 매각 → 임대 전환`;
  } else {
    pathDesc = '집 매각 후 임대 전환';
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 10,
      background: isRecommended ? 'var(--tds-blue-50)' : 'var(--tds-gray-50)',
      border: isRecommended ? '1.5px solid var(--tds-blue-200, #B3D4FF)' : '1px solid transparent',
    }}>
      <span style={{ fontSize: 16 }}>{SCENARIO_ICONS[scenario]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isRecommended ? 'var(--tds-blue-500)' : 'var(--tds-gray-700)' }}>
            {SCENARIO_LABELS[scenario]}
          </span>
          {isRecommended && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--tds-blue-500)',
              background: 'var(--tds-blue-100, #D6E8FF)',
              padding: '1px 5px', borderRadius: 8,
            }}>추천</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pathDesc}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: isOk ? 'var(--tds-blue-500)' : 'var(--tds-gray-500)', letterSpacing: '-0.3px' }}>
          월 {result.possibleMonthly.toLocaleString('ko-KR')}만
        </div>
        {gap !== 0 && (
          <div style={{ fontSize: 11, color: isOk ? 'var(--tds-blue-400)' : 'var(--tds-orange-500)', fontWeight: 600 }}>
            {isOk ? `+${gap.toLocaleString('ko-KR')}` : gap.toLocaleString('ko-KR')}만
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonthlyComparison({
  targetMonthly,
  possibleMonthly,
  retirementAge,
  lifeExpectancy,
  housingScenarios,
}: Props) {
  const retirementYears = lifeExpectancy - retirementAge;
  const recommended = housingScenarios?.recommendedScenario ?? 'keep';
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

      {/* 추천 시나리오 대표 결과 */}
      <div style={{ padding: '12px 0', borderBottom: housingScenarios ? '1px solid var(--tds-gray-100)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>실제 가능한 생활비</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tds-gray-400)', background: 'var(--tds-gray-100)', padding: '1px 6px', borderRadius: 8 }}>
            {SCENARIO_LABELS[recommended]}
          </span>
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

      {/* 시나리오 비교 (부동산 있는 경우만) */}
      {housingScenarios && (
        <div style={{ paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tds-gray-500)', marginBottom: 8 }}>
            주택 활용 방식별 비교
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['keep', 'annuity', 'liquidate'] as const).map(s => (
              <ScenarioPathLine
                key={s}
                scenario={s}
                result={housingScenarios[s]}
                isRecommended={s === recommended}
                targetMonthly={targetMonthly}
              />
            ))}
          </div>
          {housingScenarios.recommendationReason && (
            <p style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
              {housingScenarios.recommendationReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
