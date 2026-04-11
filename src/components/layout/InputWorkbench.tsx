import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';
import VehicleSection from '../input/VehicleSection';

export default function InputWorkbench() {
  return (
    <div
      style={{
        width: 333,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: 'calc(100vh / 0.85)',
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
    </div>
  );
}
