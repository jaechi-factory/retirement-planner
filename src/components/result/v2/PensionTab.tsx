import type { CalculationResult } from '../../../types/calculation';
import type { PlannerInputs } from '../../../types/inputs';
import { getPensionBreakdown, getPensionTimeline } from '../../../engine/pensionEstimation';
import { fmtKRW } from '../../../utils/format';

interface Props {
  result: CalculationResult;
  inputs: PlannerInputs;
}

export default function PensionTab({ result, inputs }: Props) {
  const { goal, status, pension } = inputs;

  const pensionBreakdown = getPensionBreakdown(
    pension,
    status.currentAge,
    goal.retirementAge,
    status.annualIncome,
    goal.inflationRate,
  );

  const timeline = getPensionTimeline(
    pension,
    status.currentAge,
    goal.retirementAge,
    status.annualIncome,
    goal.targetMonthly,
    goal.inflationRate,
  );

  const coveragePct = Math.round(result.pensionCoverageRate * 100);

  return (
    <div>
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
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: coveragePct >= 50 ? '#1A5DC2' : '#E65100',
            marginBottom: 4,
          }}
        >
          {coveragePct}%
        </div>
        <div style={{ fontSize: 12, color: 'var(--tds-gray-600)' }}>
          나머지 {100 - coveragePct}%는 금융자산으로 충당해야 해요
        </div>
      </div>

      {/* 은퇴 직후 / 모든 연금 개시 후 */}
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
            은퇴 직후
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tds-gray-500)' }}>
            월 {fmtKRW(result.monthlyPensionAtRetirementStart)}
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

      {/* 연금별 상세 */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tds-gray-600)', marginBottom: 8 }}>
        연금별 상세
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {[
          {
            label: '국민연금',
            value: pensionBreakdown.publicMonthly,
            enabled: pension.publicPension.enabled,
            startAge: pension.publicPension.startAge,
          },
          {
            label: '퇴직연금',
            value: pensionBreakdown.retirementMonthly,
            enabled: pension.retirementPension.enabled,
            startAge: pension.retirementPension.startAge,
          },
          {
            label: '개인연금',
            value: pensionBreakdown.privateMonthly,
            enabled: pension.privatePension.enabled,
            startAge: pension.privatePension.startAge,
          },
        ].map(({ label, value, enabled, startAge }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: 'var(--tds-gray-50)',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--tds-gray-600)' }}>
              {label}
              {enabled && (
                <span style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginLeft: 4 }}>
                  ({startAge}세부터)
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: enabled ? 'var(--tds-gray-800)' : 'var(--tds-gray-300)',
              }}
            >
              {enabled ? `월 ${fmtKRW(value)}` : '미반영'}
            </span>
          </div>
        ))}
      </div>

      {/* 연금 개시 타임라인 */}
      {timeline.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tds-gray-600)', marginBottom: 10 }}>
            연금 개시 타임라인
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
