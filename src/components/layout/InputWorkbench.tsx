import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';
import VehicleSection from '../input/VehicleSection';

const SECTION_ORDER = [
  'retirementGoal',
  'currentStatus',
  'asset',
  'debt',
  'vehicle',
  'children',
  'pension',
] as const;

type SectionId = typeof SECTION_ORDER[number];

interface Props {
  allDone: boolean;
  onAllDone: () => void;
}

function SectionComponent({
  sectionId,
  onComplete,
  isLast,
}: {
  sectionId: SectionId;
  onComplete?: () => void;
  isLast?: boolean;
}) {
  switch (sectionId) {
    case 'retirementGoal':
      return <RetirementGoalSection onComplete={onComplete} />;
    case 'currentStatus':
      return <CurrentStatusSection onComplete={onComplete} />;
    case 'asset':
      return <AssetSection onComplete={onComplete} />;
    case 'debt':
      return <DebtSection onComplete={onComplete} />;
    case 'vehicle':
      return <VehicleSection onComplete={onComplete} />;
    case 'children':
      return <ChildrenSection onComplete={onComplete} />;
    case 'pension':
      return <PensionSection onComplete={onComplete} isLast={isLast} />;
  }
}

export default function InputWorkbench({ allDone, onAllDone }: Props) {
  const resetAll = usePlannerStore((s) => s.resetAll);

  // visibleSections: [active(index 0), ...completed(oldest last)]
  // 새 섹션이 생기면 앞에 추가 → 활성 섹션이 항상 맨 위
  const [visibleSections, setVisibleSections] = useState<SectionId[]>(['retirementGoal']);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleComplete(sectionId: SectionId) {
    const currentIdx = SECTION_ORDER.indexOf(sectionId);
    const nextIdx = currentIdx + 1;

    if (nextIdx < SECTION_ORDER.length) {
      const nextSection = SECTION_ORDER[nextIdx];
      // 새 섹션을 맨 앞에 추가 (활성 섹션 = index 0)
      setVisibleSections((prev) => [nextSection, ...prev]);
    } else {
      // 마지막 섹션 완료 → 2컬럼 전환
      onAllDone();
    }
  }

  function handleResetClick() {
    if (confirmReset) {
      resetAll();
      setVisibleSections(['retirementGoal']);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  }

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
          gap: 40,
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

  // 활성 섹션: visibleSections[0] (맨 위)
  // 완료 섹션: visibleSections.slice(1) (아래로 쌓임)
  const activeSectionId = visibleSections[0];
  const completedSectionIds = visibleSections.slice(1);

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
          paddingTop: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          textAlign: 'center',
          width: '100%',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 44,
            fontWeight: 500,
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
            fontSize: 24,
            fontWeight: 500,
            color: 'var(--fig-subtitle-color)',
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          내 정보를 입력하면, 은퇴 후 생활비를 예상해 볼 수 있어요.
        </p>
      </div>

      {/* 타이틀 ↔ 첫 카드 간격 48px */}
      <div style={{ height: 48 }} />

      {/* 섹션 카드 영역: 활성 카드(위) + 완료된 카드(아래) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
          paddingBottom: 200,
          width: '100%',
        }}
      >
        {/* 활성 섹션 — 버튼 있음 */}
        <div style={{ width: 1044 }}>
          <SectionComponent
            sectionId={activeSectionId}
            onComplete={() => handleComplete(activeSectionId)}
            isLast={activeSectionId === 'pension'}
          />
        </div>

        {/* 완료된 섹션들 — 버튼 없음 */}
        {completedSectionIds.map((sectionId) => (
          <div key={sectionId} style={{ width: 1044 }}>
            <SectionComponent sectionId={sectionId} />
          </div>
        ))}
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
