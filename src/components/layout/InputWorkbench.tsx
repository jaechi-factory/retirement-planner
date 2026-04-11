import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';
import VehicleSection from '../input/VehicleSection';

export default function InputWorkbench() {
  const resetAll = usePlannerStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleResetClick() {
    if (confirmReset) {
      resetAll();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  }

  return (
    <div
      style={{
        width: 333,
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        overscrollBehavior: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        paddingBottom: 80,
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

      {/* 초기화 버튼 */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 100 }}>
        <button
          onClick={handleResetClick}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: confirmReset ? '#FFFDFE' : 'var(--text-muted)',
            background: confirmReset ? '#C0392B' : 'rgba(36,39,46,0.12)',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            letterSpacing: '0.01em',
          }}
        >
          {confirmReset ? '정말 초기화?' : '초기화'}
        </button>
      </div>
    </div>
  );
}
