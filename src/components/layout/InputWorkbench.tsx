import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';
import VehicleSection from '../input/VehicleSection';

interface Props {
  allDone: boolean;
  onAllDone: () => void;
}

export default function InputWorkbench({ allDone, onAllDone }: Props) {
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

  const sections = (
    <>
      <RetirementGoalSection />
      <CurrentStatusSection />
      <AssetSection />
      <DebtSection />
      <VehicleSection />
      <ChildrenSection />
      <PensionSection />
    </>
  );

  // 2컬럼 완료 상태
  if (allDone) {
    return (
      <div
        style={{
          width: 560,
          flexShrink: 0,
          height: '100vh',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          background: 'var(--fig-page-bg)',
          borderRight: '1px solid rgba(36,39,46,0.07)',
          padding: '40px 28px 80px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {sections}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* 타이틀 영역 */}
      <div
        style={{
          paddingTop: 51,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          textAlign: 'center',
          width: '100%',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 35,
            fontWeight: 700,
            color: 'var(--fig-title-color)',
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          나는 은퇴하면 한달에<br />얼마를 쓸 수 있을까?
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

      <div style={{ height: 38 }} />

      {/* 섹션 카드 전체 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          width: 866,
        }}
      >
        {sections}

        {/* 결과 보기 버튼 */}
        <button
          onClick={onAllDone}
          style={{
            width: '100%',
            height: 'var(--fig-btn-height)',
            borderRadius: 'var(--fig-btn-radius)',
            border: 'none',
            background: 'var(--fig-btn-active-bg)',
            color: 'var(--fig-btn-active-text)',
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'Pretendard, sans-serif',
            cursor: 'pointer',
            letterSpacing: '0.114px',
          }}
        >
          결과 보기
        </button>

        <div style={{ height: 80 }} />
      </div>

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
