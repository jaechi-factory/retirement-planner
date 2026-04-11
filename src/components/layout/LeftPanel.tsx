import { usePlannerStore } from '../../store/usePlannerStore';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';

export default function LeftPanel() {
  const resetAll = usePlannerStore((s) => s.resetAll);

  return (
    <div
      style={{
        width: 430,
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        padding: '24px 16px',
        scrollbarWidth: 'thin',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={resetAll}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            background: 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
          }}
        >
          전체 초기화
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
