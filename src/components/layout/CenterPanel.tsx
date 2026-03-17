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
        />

        {verdict && <GapIndicator verdict={verdict} />}
      </div>
    </div>
  );
}
