import { useState } from 'react';
import { Button } from '@wanteddev/wds';
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
    <aside
      style={{
        width: 480,
        flexShrink: 0,
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--white)',
        borderRight: '1px solid var(--neutral-150)',
      }}
    >
      {/* Section header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--white)',
          borderBottom: '1px solid var(--neutral-100)',
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--neutral-900)',
              letterSpacing: '-0.01em',
            }}
          >
            입력 정보
          </h2>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 12,
              color: 'var(--neutral-400)',
            }}
          >
            현재 상황을 입력하면 은퇴 시뮬레이션 결과를 볼 수 있어요
          </p>
        </div>
        <Button
          variant={confirmReset ? 'solid' : 'outlined'}
          color={confirmReset ? 'primary' : 'assistive'}
          size="small"
          onClick={handleResetClick}
          style={
            confirmReset
              ? { background: 'var(--brand-danger)', borderColor: 'var(--brand-danger)', fontSize: 12 }
              : { fontSize: 12, color: 'var(--neutral-500)' }
          }
        >
          {confirmReset ? '초기화 확인' : '초기화'}
        </Button>
      </div>

      {/* Input sections */}
      <div style={{ padding: '20px 24px 48px' }}>
        <RetirementGoalSection />
        <CurrentStatusSection />
        <AssetSection />
        <DebtSection />
        <ChildrenSection />
        <PensionSection />
      </div>
    </aside>
  );
}
