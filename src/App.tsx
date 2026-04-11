import './index.css';
import { usePlannerStore } from './store/usePlannerStore';
import type { PlannerInputs } from './types/inputs';
import InputWorkbench from './components/layout/InputWorkbench';
import ResultWorkbench from './components/layout/ResultWorkbench';

function hasAnyInput(inputs: PlannerInputs): boolean {
  const { goal, status, assets, debts } = inputs;
  return (
    goal.retirementAge > 0 ||
    goal.lifeExpectancy > 0 ||
    goal.targetMonthly > 0 ||
    status.currentAge > 0 ||
    status.annualIncome > 0 ||
    status.annualExpense > 0 ||
    assets.cash.amount > 0 ||
    assets.deposit.amount > 0 ||
    assets.stock_kr.amount > 0 ||
    assets.stock_us.amount > 0 ||
    assets.bond.amount > 0 ||
    assets.crypto.amount > 0 ||
    assets.realEstate.amount > 0 ||
    debts.mortgage.balance > 0 ||
    debts.creditLoan.balance > 0
  );
}

export default function App() {
  const inputs = usePlannerStore((s) => s.inputs);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const showReset = hasAnyInput(inputs);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--fig-page-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 헤더 — 피그마 264:1463 gap-40, 288:2341 gap-16 */}
      <div
        style={{
          paddingTop: 80,
          paddingBottom: 40,
          paddingLeft: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 40,
          textAlign: 'left',
          width: 1100,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* 타이틀 + 설명 그룹 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 40,
              fontWeight: 700,
              color: 'var(--fig-title-color)',
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            은퇴하면 한달에 얼마를 쓸 수 있을까?
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--fig-subtitle-color)',
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            내 정보를 입력하면, 은퇴 후 생활비를 예상해 볼 수 있어요.
          </p>
        </div>
        {showReset && (
          <button
            onClick={resetAll}
            style={{
              padding: '14px 18px',
              background: '#2f7ceb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.6,
              cursor: 'pointer',
            }}
          >
            처음부터 입력하기
          </button>
        )}
      </div>

      {/* 2컬럼 레이아웃 */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          width: 1100,
          alignItems: 'flex-start',
          paddingBottom: 120,
          boxSizing: 'border-box',
        }}
      >
        <InputWorkbench />
        <ResultWorkbench />
      </div>
    </div>
  );
}
