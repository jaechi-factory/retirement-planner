import { useEffect, useRef, useState, useCallback } from 'react';
import RetirementGoalSection from '../input/RetirementGoalSection';
import CurrentStatusSection from '../input/CurrentStatusSection';
import AssetSection from '../input/AssetSection';
import DebtSection from '../input/DebtSection';
import ChildrenSection from '../input/ChildrenSection';
import PensionSection from '../input/PensionSection';
import VehicleSection from '../input/VehicleSection';

export default function InputWorkbench() {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [maxH, setMaxH] = useState<string>('100vh');

  const updateHeight = useCallback(() => {
    if (!ref.current) return;
    const top = ref.current.getBoundingClientRect().top;
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const viewportCss = window.innerHeight / zoom;
    setMaxH(`${viewportCss - Math.max(0, top)}px`);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 0);
      updateHeight();
    };
    updateHeight();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateHeight, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateHeight);
    };
  }, [updateHeight]);

  return (
    <div
      ref={ref}
      style={{
        width: 333 + 48,
        flexShrink: 0,
        position: 'sticky',
        top: scrolled ? 24 : 0,
        transition: 'top 0.2s ease',
        maxHeight: maxH,
        overflowY: 'auto',
        overflowX: 'visible',
        scrollbarWidth: 'none',
        overscrollBehavior: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '0 24px 80px',
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
