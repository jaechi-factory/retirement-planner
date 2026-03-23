import { usePlannerStore } from '../../store/usePlannerStore';
import StatCard from '../analysis/StatCard';
import AssetProjectionChart from '../analysis/AssetProjectionChart';
import InsightSentences from '../analysis/InsightSentences';
import { formatEok, formatPercent } from '../../utils/format';
import { getPensionBreakdown, getPensionTimeline } from '../../engine/pensionEstimation';

export default function RightPanel() {
  const { inputs, result, verdict } = usePlannerStore();

  if (!result.isValid || !verdict) return null;

  const netWorthColor =
    result.netWorth < 0 ? 'var(--tds-red-500)' : 'var(--tds-gray-900)';
  const savingsColor =
    result.annualNetSavings < 0 ? 'var(--tds-red-500)' : 'var(--tds-gray-900)';

  const pensionBreakdown = getPensionBreakdown(
    inputs.pension,
    inputs.status.currentAge,
    inputs.goal.retirementAge,
    inputs.status.annualIncome,
    inputs.goal.inflationRate,
  );
  const coveragePct = Math.round(result.pensionCoverageRate * 100);

  const timeline = getPensionTimeline(
    inputs.pension,
    inputs.status.currentAge,
    inputs.goal.retirementAge,
    inputs.status.annualIncome,
    inputs.goal.targetMonthly,
    inputs.goal.inflationRate,
  );

  return (
    <div
      style={{
        width: 430,
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
    >
      {/* 자산 소진 경고 (목표 달성 불가 시) */}
      {result.depletionAge !== null && (
        <div style={{
          background: verdict.level === 'critical' ? 'var(--tds-red-50)' : 'var(--tds-orange-50)',
          border: `1.5px solid ${verdict.level === 'critical' ? 'var(--tds-red-200, #FFBDBD)' : 'var(--tds-orange-200, #FFDBB5)'}`,
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: verdict.level === 'critical' ? 'var(--tds-red-500)' : 'var(--tds-orange-500)',
              marginBottom: 3,
            }}>
              목표 생활비로 살면 {result.depletionAge}세에 자산이 소진돼요
            </div>
            <div style={{ fontSize: 12, color: 'var(--tds-gray-500)', lineHeight: 1.5 }}>
              지금 계획대로면 기대수명 {inputs.goal.lifeExpectancy}세까지 {inputs.goal.lifeExpectancy - result.depletionAge}년이 부족해요.
              월 목표를 낮추거나 저축을 늘려보세요.
            </div>
          </div>
        </div>
      )}

      {/* 자산 요약 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StatCard
          label="순자산"
          value={formatEok(result.netWorth)}
          sub={`총자산 ${formatEok(result.totalAsset)}`}
          valueColor={netWorthColor}
        />
        <StatCard
          label="총부채"
          value={formatEok(result.totalDebt)}
          valueColor={result.totalDebt > 0 ? 'var(--tds-red-500)' : undefined}
        />
        <StatCard
          label="전체 기대수익률"
          value={formatPercent(result.weightedReturn)}
          sub="가중평균"
        />
        <StatCard
          label="올해 기준 여유자금"
          value={formatEok(result.annualNetSavings)}
          sub="현재 입력 기준 · 해마다 달라짐"
          valueColor={savingsColor}
        />
      </div>

      {/* 자녀 지출 (있는 경우만) */}
      {inputs.children.hasChildren && (
        <div style={{ marginBottom: 12 }}>
          <StatCard
            label="자녀 관련 연 지출"
            value={formatEok(result.annualChildExpense)}
            sub={`${inputs.children.independenceAge}세까지 계속`}
          />
        </div>
      )}

      {/* 연금 결과 카드 */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '20px 16px',
          border: '1px solid var(--tds-gray-100)',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)', marginBottom: 4 }}>
          연금이 생활비를 메워주는 비율
        </div>
        <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginBottom: 14 }}>
          추정값 · 지금 기준
        </div>

        {/* 커버율 — 대표 숫자 */}
        <div style={{
          padding: '16px 16px',
          borderRadius: 12,
          background: coveragePct >= 50 ? 'var(--tds-blue-50)' : 'var(--tds-orange-50)',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 36, fontWeight: 800, letterSpacing: '-1px',
            color: coveragePct >= 50 ? 'var(--tds-blue-500)' : 'var(--tds-orange-500)',
            marginBottom: 4,
          }}>
            {coveragePct}%
          </div>
          <div style={{ fontSize: 13, color: 'var(--tds-gray-600)' }}>
            생활비 목표의 {coveragePct}%를 메워줘요
          </div>
          <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 2 }}>
            전체 연금 합산 월 {result.totalMonthlyPensionTodayValue.toLocaleString('ko-KR')}만원
          </div>
        </div>

        {/* 은퇴 직후 / 모든 연금 개시 후 — 보조 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ padding: '10px 12px', background: 'var(--tds-gray-50)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', fontWeight: 600, marginBottom: 4 }}>
              은퇴 직후
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tds-gray-700)' }}>
              월 {result.monthlyPensionAtRetirementStart.toLocaleString('ko-KR')}만원
            </div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--tds-gray-50)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', fontWeight: 600, marginBottom: 4 }}>
              모든 연금 개시 후
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tds-gray-700)' }}>
              월 {result.totalMonthlyPensionTodayValue.toLocaleString('ko-KR')}만원
            </div>
          </div>
        </div>

        {/* 항목별 분해 */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tds-gray-500)', marginBottom: 8 }}>
          연금별 상세
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {[
            { label: '국민연금', value: pensionBreakdown.publicMonthly, enabled: inputs.pension.publicPension.enabled, startAge: inputs.pension.publicPension.startAge },
            { label: '퇴직연금', value: pensionBreakdown.retirementMonthly, enabled: inputs.pension.retirementPension.enabled, startAge: inputs.pension.retirementPension.startAge },
            { label: '개인연금', value: pensionBreakdown.privateMonthly, enabled: inputs.pension.privatePension.enabled, startAge: inputs.pension.privatePension.startAge },
          ].map(({ label, value, enabled, startAge }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--tds-gray-500)' }}>
                {label}
                {enabled && <span style={{ fontSize: 12, color: 'var(--tds-gray-300)', marginLeft: 4 }}>({startAge}세~)</span>}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: enabled ? 'var(--tds-gray-900)' : 'var(--tds-gray-300)' }}>
                {enabled ? `월 ${value.toLocaleString('ko-KR')}만원` : '미반영'}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--tds-gray-300)', margin: 0 }}>
          평균 가정 기반 추정치 · 직접 입력값이 있으면 우선 적용
        </p>
      </div>

      {/* 연금 개시 타임라인 */}
      {timeline.length > 0 && (
        <div
          style={{
            background: 'var(--tds-white)',
            borderRadius: 16,
            padding: '20px 16px',
            border: '1px solid var(--tds-gray-100)',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)', marginBottom: 4 }}>
            연금 개시 타임라인
          </div>
          <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginBottom: 14 }}>
            연금이 시작되면 부족한 생활비를 일부 메워줘요
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((ev, i) => {
              const beforePct = Math.round(ev.coverageRateBefore * 100);
              const afterPct = Math.round(ev.coverageRateAfter * 100);
              const isLast = i === timeline.length - 1;

              return (
                <div key={`${ev.age}-${ev.pensionType}`} style={{ display: 'flex', gap: 12 }}>
                  {/* 타임라인 라인 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', marginTop: 3,
                      background: 'var(--tds-blue-500)', flexShrink: 0,
                    }} />
                    {!isLast && (
                      <div style={{ width: 2, flex: 1, background: 'var(--tds-gray-100)', minHeight: 20, marginTop: 2 }} />
                    )}
                  </div>

                  {/* 내용 */}
                  <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>
                        {ev.age}세
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                        background: 'var(--tds-blue-50)', color: 'var(--tds-blue-500)',
                      }}>
                        {ev.pensionType}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tds-gray-700)', marginTop: 2 }}>
                      +월 {ev.monthlyTodayValue.toLocaleString('ko-KR')}만원 시작
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 1 }}>
                      목표 커버율 {beforePct}%
                      <span style={{ color: 'var(--tds-blue-500)', fontWeight: 700 }}> → {afterPct}%</span>
                      {afterPct > beforePct && (
                        <span style={{ color: 'var(--tds-blue-500)', marginLeft: 4 }}>
                          (+{afterPct - beforePct}%p)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 차트 */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '20px 16px',
          border: '1px solid var(--tds-gray-100)',
          marginBottom: 12,
        }}
      >
        <AssetProjectionChart
          snapshots={result.targetYearlySnapshots}
          retirementAge={inputs.goal.retirementAge}
          pensionStartAges={{
            nps: inputs.pension.publicPension.enabled ? inputs.pension.publicPension.startAge : undefined,
            retirement: inputs.pension.retirementPension.enabled ? inputs.pension.retirementPension.startAge : undefined,
            private: inputs.pension.privatePension.enabled ? inputs.pension.privatePension.startAge : undefined,
          }}
        />
      </div>

      {/* 해석 문장 */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '20px 16px',
          border: '1px solid var(--tds-gray-100)',
        }}
      >
        <InsightSentences result={result} inputs={inputs} verdict={verdict} />
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
