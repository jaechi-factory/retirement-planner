import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';
import VehicleSection from '../input/VehicleSection';

// 섹션 순서 고정
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

export default function InputWorkbench({ allDone, onAllDone }: Props) {
  const resetAll = usePlannerStore((s) => s.resetAll);

  // UI 전용 상태 — store와 완전 분리
  const [visibleSections, setVisibleSections] = useState<SectionId[]>(['retirementGoal']);
  const [completedSections, setCompletedSections] = useState<SectionId[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleComplete(sectionId: SectionId) {
    // 이미 완료된 섹션이면 무시
    if (completedSections.includes(sectionId)) return;

    const newCompleted = [...completedSections, sectionId];
    setCompletedSections(newCompleted);

    // 다음 섹션 인덱스 계산
    const currentIdx = SECTION_ORDER.indexOf(sectionId);
    const nextIdx = currentIdx + 1;

    if (nextIdx < SECTION_ORDER.length) {
      const nextSection = SECTION_ORDER[nextIdx];
      if (!visibleSections.includes(nextSection)) {
        setVisibleSections((prev) => [...prev, nextSection]);
      }
    } else {
      // 마지막 섹션 완료 → 2컬럼 전환
      onAllDone();
    }
  }

  function handleResetClick() {
    if (confirmReset) {
      resetAll();
      setVisibleSections(['retirementGoal']);
      setCompletedSections([]);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  }

  // 2컬럼 완료 상태: 좁은 폭으로 표시
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
        {/* 완료 후: 입력 섹션들을 작은 버전으로 모두 표시 */}
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

  // 입력 단계: 단일 컬럼, 중앙 정렬
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
      {/* max-width 1400px 컨테이너 */}
      <div
        style={{
          width: '100%',
          maxWidth: 1400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* 타이틀 영역 */}
        <div
          style={{
            paddingTop: 80,
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
              fontSize: 58,
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

        {/* 타이틀 ↔ 첫 카드 간격 60px */}
        <div style={{ height: 60 }} />

        {/* 섹션 카드 누적 영역 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
            paddingBottom: 120,
          }}
        >
          {visibleSections.includes('retirementGoal') && (
            <RetirementGoalSection
              onComplete={() => handleComplete('retirementGoal')}
            />
          )}
          {visibleSections.includes('currentStatus') && (
            <CurrentStatusSection
              onComplete={() => handleComplete('currentStatus')}
            />
          )}
          {visibleSections.includes('asset') && (
            <AssetSection
              onComplete={() => handleComplete('asset')}
            />
          )}
          {visibleSections.includes('debt') && (
            <DebtSection
              onComplete={() => handleComplete('debt')}
            />
          )}
          {visibleSections.includes('vehicle') && (
            <VehicleSection
              onComplete={() => handleComplete('vehicle')}
            />
          )}
          {visibleSections.includes('children') && (
            <ChildrenSection
              onComplete={() => handleComplete('children')}
            />
          )}
          {visibleSections.includes('pension') && (
            <PensionSection
              onComplete={() => handleComplete('pension')}
              isLast={true}
            />
          )}
        </div>

        {/* 초기화 버튼 */}
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 24,
            zIndex: 100,
          }}
        >
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
    </div>
  );
}
