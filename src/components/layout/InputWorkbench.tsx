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
        width: 460,
        flexShrink: 0,
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        background: 'var(--surface-page)',
        borderRight: '1px solid rgba(36,39,46,0.07)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 패널 헤더 */}
      <div
        style={{
          padding: '20px 24px 0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-strong)',
                letterSpacing: '-0.1px',
              }}
            >
              내 정보 입력
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-faint)',
                fontWeight: 400,
                marginTop: 2,
              }}
            >
              모든 금액은 만원 단위
            </div>
          </div>

          <button
            onClick={handleResetClick}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: confirmReset ? '#FFFDFE' : 'var(--text-muted)',
              background: confirmReset ? '#C0392B' : 'rgba(36,39,46,0.07)',
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

        {/* 구분선 */}
        <div style={{ height: 1, background: 'rgba(36,39,46,0.07)', marginBottom: 18 }} />
      </div>

      {/* 입력 섹션들 */}
      <div style={{ padding: '0 24px', flex: 1 }}>
        <RetirementGoalSection />
        <CurrentStatusSection />
        <AssetSection />
        <DebtSection />
        <VehicleSection />
        <ChildrenSection />
        <PensionSection />
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
