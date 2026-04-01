import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';

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
        width: 460,
        flexShrink: 0,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '24px 20px',
        scrollbarWidth: 'thin',
        borderRight: '1px solid var(--tds-gray-100)',
        background: 'var(--tds-white)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={handleResetClick}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'white',
            background: confirmReset ? '#C0392B' : 'var(--tds-gray-500)',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {confirmReset ? '정말 초기화할까요?' : '전체 초기화'}
        </button>
      </div>
      <RetirementGoalSection />
      <CurrentStatusSection />
      <AssetSection />
      <DebtSection />
      <ChildrenSection />
      <PensionSection />
      <div style={{ height: 40 }} />
    </div>
  );
}
