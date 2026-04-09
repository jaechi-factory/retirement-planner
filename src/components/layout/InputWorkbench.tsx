import { useState } from 'react';
import { Button } from '@wanteddev/wds';
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
        width: 460,
        flexShrink: 0,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '24px 20px',
        scrollbarWidth: 'thin',
        background: 'var(--surface-page)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 18, right: 20, zIndex: 10 }}>
        <Button
          variant="solid"
          color="assistive"
          size="small"
          onClick={handleResetClick}
          style={
            confirmReset
              ? { background: '#C0392B', borderColor: '#C0392B', color: '#fff' }
              : { background: 'var(--palette-ink)', borderColor: 'var(--palette-ink)', color: 'var(--palette-card)' }
          }
        >
          {confirmReset ? '정말 초기화할까요?' : '전체 초기화'}
        </Button>
      </div>
      <div style={{ height: 40 }} />
      <RetirementGoalSection />
      <CurrentStatusSection />
      <AssetSection />
      <DebtSection />
      <VehicleSection />
      <ChildrenSection />
      <PensionSection />
      <div style={{ height: 40 }} />
    </div>
  );
}
