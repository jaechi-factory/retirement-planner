import { fmtKRW } from '../../utils/format';

interface TransitionSectionProps {
  financialExhaustionAge: number | null;
  failureAge: number | null;
  lifeExpectancy: number;
  hasRealEstate: boolean;
  pensionCoverageRate: number;
  targetMonthly: number;
}

/**
 * TransitionSection — 금융자산 소진 이후 경로 분기를 설명하는 핵심 섹션.
 * WhyPath 다음, ScenarioSection 전에 렌더.
 *
 * 케이스 A: 금융자산 소진 + 집 없음
 * 케이스 B: 금융자산 소진 + 집 있음
 * 케이스 C: 금융자산 소진 없음 (간결하게, 항상 렌더)
 */
export default function TransitionSection({
  financialExhaustionAge,
  failureAge,
  lifeExpectancy,
  hasRealEstate,
  pensionCoverageRate,
  targetMonthly,
}: TransitionSectionProps) {
  const pensionPct = Math.round(pensionCoverageRate * 100);
  const monthlyShortfall = targetMonthly > 0
    ? Math.round(targetMonthly * (1 - pensionCoverageRate))
    : null;

  // ── Case C: 소진 없음 ──────────────────────────────────────────────────────
  if (financialExhaustionAge === null) {
    return (
      <div
        style={{
          borderRadius: 14,
          border: '1px solid #D4EDDA',
          background: '#F6FBF7',
          padding: '18px 20px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1B7F3A',
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          현재 설정이면 금융자산이 기대수명까지 유지돼요
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <BulletLine text={`${lifeExpectancy}세까지 현금·투자자산으로 생활비를 감당할 수 있어요`} />
          <BulletLine
            text={`물가나 예상 밖 지출에 따라 달라질 수 있으니, 아래에서 연도별 흐름을 확인해보세요`}
            muted
          />
        </div>
      </div>
    );
  }

  // ── Case A: 소진 있음 + 집 없음 ───────────────────────────────────────────
  if (!hasRealEstate) {
    return (
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--tds-gray-100)',
          background: 'var(--tds-white)',
          padding: '18px 20px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--tds-gray-900)',
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          {financialExhaustionAge}세 이후에는 연금 중심으로 생활하게 돼요
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <BulletLine text={`현금과 투자자산은 ${financialExhaustionAge}세에 거의 다 떨어져요`} />
          <BulletLine text="이후 수입은 연금만 남아요" />
          {pensionPct > 0 && (
            <BulletLine
              text={
                monthlyShortfall !== null && monthlyShortfall > 0
                  ? `연금이 목표 생활비의 ${pensionPct}%를 채워요 — 매월 ${fmtKRW(monthlyShortfall)}이 부족해요`
                  : `연금이 목표 생활비의 ${pensionPct}%를 채워요`
              }
            />
          )}
          {failureAge && (
            <BulletLine
              text={`${failureAge}세부터 자금이 부족해요`}
              warning
            />
          )}
        </div>
      </div>
    );
  }

  // ── Case B: 소진 있음 + 집 있음 ───────────────────────────────────────────
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--tds-gray-100)',
        background: 'var(--tds-white)',
        padding: '18px 20px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--tds-gray-900)',
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        {financialExhaustionAge}세 이후에는 집 활용 여부가 결과를 바꿔요
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <BulletLine text={`현금과 투자자산은 ${financialExhaustionAge}세에 거의 다 떨어져요`} />
        <BulletLine text="주택 자산이 남아 있어 이후 경로를 선택할 수 있어요" />
        <BulletLine text="집을 어떻게 활용하느냐에 따라 이후 생활비 흐름이 달라져요" />
      </div>

      {/* Case B 연결: 아래 ScenarioSection으로 자연스럽게 이어지도록 */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--tds-gray-100)',
          fontSize: 12,
          color: 'var(--tds-gray-400)',
          lineHeight: 1.65,
        }}
      >
        아래에서 방식별로 비교해볼 수 있어요.
      </div>
    </div>
  );
}

// ── 내부 불릿 라인 헬퍼 ────────────────────────────────────────────────────────
function BulletLine({
  text,
  muted = false,
  warning = false,
}: {
  text: string;
  muted?: boolean;
  warning?: boolean;
}) {
  const color = warning ? '#C0392B' : muted ? 'var(--tds-gray-400)' : 'var(--tds-gray-600)';
  const dot = warning ? '·' : muted ? '·' : '·';
  return (
    <div
      style={{
        fontSize: 13,
        lineHeight: 1.65,
        color,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <span style={{ color: warning ? '#C0392B' : 'var(--tds-gray-300)', flexShrink: 0, marginTop: 2 }}>
        {dot}
      </span>
      {text}
    </div>
  );
}
