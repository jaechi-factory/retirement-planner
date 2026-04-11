import { useEffect, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannerInputs } from '../../types/inputs';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';
import VehicleSection from '../input/VehicleSection';

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

export default function InputWorkbench() {
  const [scrolled, setScrolled] = useState(false);
  const inputs = usePlannerStore((s) => s.inputs);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const showReset = hasAnyInput(inputs);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      style={{
        width: 333 + 48,
        flexShrink: 0,
        position: 'sticky',
        top: scrolled ? 24 : 0,
        transition: 'top 0.2s ease',
        maxHeight: '100vh',
        overflowY: 'auto',
        overflowX: 'visible',
        scrollbarWidth: 'none',
        overscrollBehavior: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '0 24px 80px',
        boxSizing: 'border-box',
      }}
    >
      <RetirementGoalSection />
      <CurrentStatusSection />
      <AssetSection />
      <DebtSection />
      <VehicleSection />
      <ChildrenSection />
      <PensionSection />

      {showReset && (
        <button
          onClick={resetAll}
          style={{
            width: '100%',
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
            flexShrink: 0,
          }}
        >
          처음부터 입력하기
        </button>
      )}
    </div>
  );
}
