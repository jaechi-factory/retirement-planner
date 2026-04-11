import { usePlannerStore } from '../../store/usePlannerStore';
import { formatEok } from '../../utils/format';
import { HOUSING_ANNUITY_MIN_AGE } from '../../engine/housingAnnuity';

export default function CenterPanel() {
  const { inputs, result, verdict, advancedHousingEnabled, toggleHousing } = usePlannerStore();

  if (!result.isValid) {
    const isWaiting = result.errorMessage == null;
    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <div
          style={{
            background: 'var(--tds-white)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            maxWidth: 280,
          }}
        >
          {isWaiting ? (
            <>
              <p style={{ fontSize: 28, marginBottom: 12 }}>📋</p>
              <p style={{ color: 'var(--tds-gray-700)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                정보를 입력해주세요
              </p>
              <p style={{ color: 'var(--tds-gray-400)', fontSize: 14, lineHeight: 1.6 }}>
                왼쪽 패널에서 현재 나이, 은퇴 나이,<br />
                목표 생활비를 입력하면<br />
                결과가 나타나요.
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--tds-red-500, #F04452)', fontSize: 14 }}>
              {result.errorMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  const gap = result.possibleMonthly - inputs.goal.targetMonthly;
  const isOk = gap >= 0;
  const retirementYears = inputs.goal.lifeExpectancy - inputs.goal.retirementAge;

  // 핵심 경고: depletionAge(전체 소진) > financialStressAge(금융자산 부족) 순
  const warningText = result.depletionAge !== null
    ? `${result.depletionAge}세에 전체 자산이 소진돼요 — 목표 생활비 기준`
    : result.financialStressAge !== null
    ? `${result.financialStressAge}세부터 현금·투자자산이 부족해질 수 있어요`
    : null;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        height: '100vh',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
    >
      {/* ── Hero 카드 ── */}
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '20px 20px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
        }}
      >
        {/* 상단: 라벨 + 상태 뱃지 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tds-gray-500)', letterSpacing: 0.3 }}>
            평생 가능한 월생활비
          </span>
          {verdict && (
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 100,
              background: verdict.bgColor,
              color: verdict.color,
              whiteSpace: 'nowrap',
            }}>
              {verdict.label}
            </span>
          )}
        </div>

        {/* 메인 숫자 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-1.5px',
            color: isOk ? 'var(--tds-gray-900)' : 'var(--tds-orange-500)',
            lineHeight: 1.1,
          }}>
            월 {result.possibleMonthly.toLocaleString('ko-KR')}만원
          </div>
          <div style={{ fontSize: 14, color: 'var(--tds-gray-400)', marginTop: 5 }}>
            금융자산 기준 · 연금 포함 · 은퇴 후 {inputs.goal.lifeExpectancy}세까지 {retirementYears}년간
          </div>
        </div>

        {/* 목표 대비 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 12px',
          borderRadius: 10,
          background: isOk ? 'var(--tds-blue-50)' : 'var(--tds-orange-50)',
          marginBottom: warningText ? 8 : 0,
        }}>
          <span style={{ fontSize: 14, color: 'var(--tds-gray-500)' }}>
            목표 월 {inputs.goal.targetMonthly.toLocaleString('ko-KR')}만원 대비
          </span>
          {gap === 0 ? (
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tds-blue-500)' }}>딱 맞아요</span>
          ) : (
            <span style={{
              fontSize: 14,
              fontWeight: 800,
              color: isOk ? 'var(--tds-blue-600, #1D4ED8)' : 'var(--tds-red-500)',
            }}>
              {isOk ? '+' : ''}{gap.toLocaleString('ko-KR')}만원
            </span>
          )}
        </div>

        {/* 핵심 경고 — 있을 때만 */}
        {warningText && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            background: result.depletionAge !== null ? 'var(--tds-red-50)' : 'var(--tds-orange-50)',
          }}>
            <span style={{ fontSize: 14, lineHeight: 1.2, flexShrink: 0 }}>⚠️</span>
            <span style={{
              fontSize: 14,
              color: result.depletionAge !== null ? 'var(--tds-red-600, #B91C1C)' : 'var(--tds-orange-600, #B45309)',
              lineHeight: 1.5,
            }}>
              {warningText}
            </span>
          </div>
        )}

        {/* 집 활용 전략 섹션 */}
        {result.totalAsset > 0 && inputs.assets.realEstate.amount > 0 && (
          <div style={{ marginTop: 12 }}>
            <button
              onClick={toggleHousing}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: advancedHousingEnabled ? 'var(--tds-blue-50)' : 'var(--tds-gray-50)',
                border: `1px solid ${advancedHousingEnabled ? 'var(--tds-blue-200, #BFD7FF)' : 'var(--tds-gray-100)'}`,
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: advancedHousingEnabled ? 'var(--tds-blue-600)' : 'var(--tds-gray-600)',
              }}
            >
              <span>보유 부동산 활용 전략 보기</span>
              <span style={{ fontSize: 14 }}>{advancedHousingEnabled ? '▲ 접기' : '▼'}</span>
            </button>

            {advancedHousingEnabled && result.housingScenarios && (() => {
              const hs = result.housingScenarios;
              // 주택연금 자격 체크
              const retirementAge = inputs.goal.retirementAge;
              // 주택연금 최소 가입 나이(55세) 이전에 은퇴하면 일정 기간 수령 불가
              const annuityEligibleAtRetirement = retirementAge >= HOUSING_ANNUITY_MIN_AGE;
              // 실물자산 12억 초과 시 초과분 미반영 (상한 적용)
              const ANNUITY_PRICE_CAP_EOK = 12; // 억 단위 표시용
              const housingEok = inputs.assets.realEstate.amount / 10000;
              const isCapped = housingEok > ANNUITY_PRICE_CAP_EOK;

              const rows: Array<{ label: string; policy: 'keep' | 'annuity' | 'liquidate' }> = [
                { label: '집 그대로 유지', policy: 'keep' },
                { label: '주택연금 활용', policy: 'annuity' },
                { label: '집 매각 후 임대', policy: 'liquidate' },
              ];
              return (
                <div style={{
                  marginTop: 6,
                  borderRadius: 10,
                  border: '1px solid var(--tds-gray-100)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    background: 'var(--tds-gray-50)',
                    padding: '8px 12px',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--tds-gray-500)',
                  }}>
                    전략별 가능한 월생활비 비교
                  </div>
                  {rows.map(({ label, policy }, idx) => {
                    const scenario = hs[policy];
                    const scenarioGap = scenario.possibleMonthly - inputs.goal.targetMonthly;
                    const isRecommended = hs.recommendedScenario === policy;
                    const isLast = idx === rows.length - 1;

                    // 주택연금 자격 안내 (annuity 행에만)
                    const annuityNote = policy === 'annuity' && !annuityEligibleAtRetirement
                      ? `은퇴 나이 ${retirementAge}세 → ${HOUSING_ANNUITY_MIN_AGE}세 이후부터 수령 시작`
                      : policy === 'annuity' && isCapped
                      ? `${ANNUITY_PRICE_CAP_EOK}억 초과분은 상한 적용`
                      : null;

                    return (
                      <div
                        key={policy}
                        style={{
                          padding: '10px 12px',
                          borderBottom: isLast ? 'none' : '1px solid var(--tds-gray-50)',
                          background: isRecommended ? 'var(--tds-blue-50)' : 'white',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: 14,
                              color: 'var(--tds-gray-700)',
                              fontWeight: isRecommended ? 700 : 400,
                            }}>
                              {label}
                            </span>
                            {isRecommended && (
                              <span style={{
                                fontSize: 14,
                                background: 'var(--tds-blue-500)',
                                color: 'white',
                                borderRadius: 4,
                                padding: '1px 6px',
                              }}>
                                추천
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: scenarioGap >= 0 ? 'var(--tds-blue-500)' : 'var(--tds-orange-500)',
                            }}>
                              월 {scenario.possibleMonthly.toLocaleString('ko-KR')}만원
                            </div>
                            {scenarioGap !== 0 && (
                              <div style={{
                                fontSize: 14,
                                color: scenarioGap >= 0 ? 'var(--tds-blue-400)' : 'var(--tds-red-400)',
                              }}>
                                목표와 차이 {scenarioGap >= 0 ? '+' : ''}{scenarioGap.toLocaleString('ko-KR')}만
                              </div>
                            )}
                          </div>
                        </div>
                        {annuityNote && (
                          <div style={{
                            marginTop: 4,
                            fontSize: 14,
                            color: 'var(--tds-gray-400)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            <span>ℹ</span>
                            <span>{annuityNote}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{
                    padding: '8px 12px',
                    fontSize: 14,
                    color: 'var(--tds-gray-400)',
                    borderTop: '1px solid var(--tds-gray-50)',
                  }}>
                    {hs.recommendationReason} · 보유 부동산 {formatEok(inputs.assets.realEstate.amount)} 기준
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 바로 쓸 수 있는 자산 */}
        {result.totalAsset > 0 && (() => {
          const liquidAsset = Math.round(result.totalAsset * result.liquidRatio);
          const liquidPct = Math.round(result.liquidRatio * 100);
          const isLow = result.liquidRatio < 0.3;
          const isMid = result.liquidRatio >= 0.3 && result.liquidRatio < 0.5;

          return (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'var(--tds-gray-50)',
              borderRadius: 10,
              border: '1px solid var(--tds-gray-100)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tds-gray-600)' }}>
                  바로 쓸 수 있는 자산
                </span>
                <p style={{ fontSize: 14, color: 'var(--tds-gray-400)', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {isLow
                    ? '자산 대부분이 부동산이에요'
                    : isMid
                    ? '자산의 절반 이상이 부동산이에요'
                    : '현금·투자 자산 비중이 높아요'}
                </p>
              </div>
              <span style={{
                fontSize: 14,
                fontWeight: 800,
                color: isLow ? 'var(--tds-orange-500)' : 'var(--tds-gray-700)',
                whiteSpace: 'nowrap',
              }}>
                {liquidAsset.toLocaleString('ko-KR')}만원
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tds-gray-400)', marginLeft: 4 }}>
                  ({liquidPct}%)
                </span>
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
