import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';

export default function LeftPanel() {
  return (
    <div
      style={{
        width: 380,
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        padding: '24px 16px',
        scrollbarWidth: 'thin',
      }}
    >
      <RetirementGoalSection />
      <CurrentStatusSection />
      <AssetSection />
      <DebtSection />
      <ChildrenSection />
      <div style={{ height: 40 }} />
    </div>
  );
}
