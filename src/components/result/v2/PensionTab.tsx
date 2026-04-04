import type { CalculationResult } from '../../../types/calculation';
import type { PlannerInputs } from '../../../types/inputs';
import { getPensionTimeline } from '../../../engine/pensionEstimation';
import { fmtKRW } from '../../../utils/format';

interface Props {
  result: CalculationResult;
  inputs: PlannerInputs;
}

export default function PensionTab({ result, inputs }: Props) {
  const { goal, status, pension } = inputs;

  const timeline = getPensionTimeline(
    pension,
    status.currentAge,
    goal.retirementAge,
    status.annualIncome,
    goal.targetMonthly,
    goal.inflationRate,
  );

  const coveragePct = Math.round(result.pensionCoverageRate * 100);

  // 공백기 계산
  const gapYears = timeline.length > 0 ? timeline[0].age - goal.retirementAge : 0;
  const firstPensionAge = timeline.length > 0 ? timeline[0].age : null;

  // 커버율 평가 텍스트
  const coverageColor = coveragePct >= 50 ? '#1A5DC2' : '#E65100';
  let coverageEvalText = '';
  if (coveragePct >= 80) {
    coverageEvalText = '연금만으로 생활비 대부분 해결돼요';
  } else if (coveragePct >= 50) {
    coverageEvalText = '절반 이상은 연금으로 커버돼요';
  } else {
    coverageEvalText = '절반도 안 돼요. 금융자산 의존도가 높아요';
  }

  // 미반영 연금 목록
  const unreflectedPensions: string[] = [];
  if (!pension.privatePension.enabled) unreflectedPensions.push('개인연금');

  return (
    <div>
      {/* 공백기 배너 — 최상단 */}
      {gapYears > 0 && (
        <div
          style={{
            background: '#FFF8EC',
            border: '1px solid #FFE0B2',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8B4A00', marginBottom: 4 }}>
            은퇴 후 {gapYears}년간 연금이 없어요
          </div>
          {firstPensionAge !== null && (
            <div style={{ fontSize: 12, color: '#8B4A00', opacity: 0.8 }}>
              {goal.retirementAge + gapYears}세에 퇴직연금이 시작돼요
            </div>
          )}
        </div>
      )}

      {/* 커버율 요약 */}
      <div
        style={{
          borderRadius: 12,
          background: coveragePct >= 50 ? '#EEF4FF' : '#FFF4EC',
          padding: '16px',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 6 }}>
          연금이 생활비를 메워주는 비율
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: coverageColor,
            marginBottom: 4,
          }}
        >
          {coveragePct}%
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: coverageColor, marginTop: 4 }}>
          {coverageEvalText}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tds-gray-600)', marginTop: 6 }}>
          나머지 {100 - coveragePct}%는 금융자산으로 충당해야 해요
        </div>
      </div>

      {/* 공백기 = 0일 때 안내 */}
      {gapYears === 0 && timeline.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--tds-gray-500)', marginBottom: 14 }}>
          은퇴 시점부터 연금이 바로 시작돼요
        </div>
      )}

      {/* 연금 공백기 월 수령액 / 모든 연금 개시 후 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--tds-gray-50)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 4 }}>
            연금 공백기 월 수령액
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tds-gray-500)' }}>
            {result.monthlyPensionAtRetirementStart === 0
              ? '연금 없음'
              : `월 ${fmtKRW(result.monthlyPensionAtRetirementStart)}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-300)', marginTop: 2 }}>
            지금 기준
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--tds-gray-50)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 4 }}>
            모든 연금 개시 후
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tds-gray-800)' }}>
            월 {fmtKRW(result.totalMonthlyPensionTodayValue)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>
            지금 기준
          </div>
        </div>
      </div>

      {/* 연금 개시 타임라인 */}
      {timeline.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tds-gray-600)', marginBottom: 10 }}>
            연금 개시 타임라인
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* 은퇴 시점 고정 노드 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 20,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    marginTop: 3,
                    background: 'var(--tds-gray-400)',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    background: 'var(--tds-gray-100)',
                    minHeight: 20,
                    marginTop: 2,
                  }}
                />
              </div>
              <div style={{ paddingBottom: 14, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-600)' }}>
                    {goal.retirementAge}세
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: 20,
                      background: 'var(--tds-gray-100)',
                      color: 'var(--tds-gray-500)',
                    }}
                  >
                    은퇴
                  </span>
                </div>
              </div>
            </div>
            {timeline.map((ev, i) => {
              const beforePct = Math.round(ev.coverageRateBefore * 100);
              const afterPct = Math.round(ev.coverageRateAfter * 100);
              const isLast = i === timeline.length - 1;

              return (
                <div key={`${ev.age}-${ev.pensionType}`} style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: 20,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        marginTop: 3,
                        background: 'var(--tds-blue-500)',
                        flexShrink: 0,
                      }}
                    />
                    {!isLast && (
                      <div
                        style={{
                          width: 2,
                          flex: 1,
                          background: 'var(--tds-gray-100)',
                          minHeight: 20,
                          marginTop: 2,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: isLast ? 0 : 14, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>
                        {ev.age}세
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: 20,
                          background: '#EEF4FF',
                          color: '#1A5DC2',
                        }}
                      >
                        {ev.pensionType}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tds-gray-700)', marginTop: 2 }}>
                      +월 {fmtKRW(ev.monthlyTodayValue)} 시작
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 1 }}>
                      커버율 {beforePct}%
                      <span style={{ color: '#1A5DC2', fontWeight: 700 }}> → {afterPct}%</span>
                      {afterPct > beforePct && (
                        <span style={{ color: '#1A5DC2', marginLeft: 4 }}>
                          (+{afterPct - beforePct}%p)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 미반영 연금 안내 */}
          {unreflectedPensions.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 12 }}>
              {unreflectedPensions.join(', ')} 미반영 — 추후 입력 가능해요
            </div>
          )}
        </>
      )}

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: 'var(--tds-gray-300)',
          lineHeight: 1.5,
        }}
      >
        * 평균 가정 기반 추정치예요. 직접 입력값이 있으면 우선 적용돼요.
      </div>
    </div>
  );
}
