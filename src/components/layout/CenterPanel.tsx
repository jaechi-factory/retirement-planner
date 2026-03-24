import { usePlannerStore } from '../../store/usePlannerStore';
import VerdictBadge from '../result/VerdictBadge';
import MonthlyComparison from '../result/MonthlyComparison';
import GapIndicator from '../result/GapIndicator';

export default function CenterPanel() {
  const { inputs, result, verdict } = usePlannerStore();

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
              <p style={{ color: 'var(--tds-gray-400)', fontSize: 13, lineHeight: 1.6 }}>
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
      <div
        style={{
          background: 'var(--tds-white)',
          borderRadius: 16,
          padding: '24px 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
        }}
      >
        {/* 헤더 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--tds-gray-500)' }}>
            내 은퇴 준비 상태
          </p>
          {verdict && <VerdictBadge verdict={verdict} />}
        </div>

        <MonthlyComparison
          targetMonthly={inputs.goal.targetMonthly}
          possibleMonthly={result.possibleMonthly}
          currentAge={inputs.status.currentAge}
          retirementAge={inputs.goal.retirementAge}
          lifeExpectancy={inputs.goal.lifeExpectancy}
          housingScenarios={result.housingScenarios}
        />

        {verdict && <GapIndicator verdict={verdict} />}

        {/* 지금 바로 쓰기 쉬운 돈 카드 */}
        {result.totalAsset > 0 && (() => {
          const liquidAsset = Math.round(result.totalAsset * result.liquidRatio);
          const liquidPct = Math.round(result.liquidRatio * 100);
          const isLow = result.liquidRatio < 0.3;
          const isMid = result.liquidRatio >= 0.3 && result.liquidRatio < 0.5;

          return (
            <div style={{
              marginTop: 16,
              padding: '12px 14px',
              background: 'var(--tds-gray-50)',
              borderRadius: 10,
              border: '1px solid var(--tds-gray-100)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tds-gray-600)' }}>
                  지금 바로 쓰기 쉬운 돈
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: isLow ? 'var(--tds-orange-500, #F07A14)' : 'var(--tds-gray-700)' }}>
                  {liquidAsset.toLocaleString('ko-KR')}만원 ({liquidPct}%)
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--tds-gray-500)', margin: 0, lineHeight: 1.5 }}>
                {isLow
                  ? '자산 대부분이 부동산이에요. 생활비로 바로 쓰기 어려울 수 있어요.'
                  : isMid
                  ? '자산의 절반 이상이 부동산이에요. 실제 생활비 여력은 더 적을 수 있어요.'
                  : '대부분 현금·투자 자산이에요. 생활비로 활용하기 좋은 구조예요.'}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
