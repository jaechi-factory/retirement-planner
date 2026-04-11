import { useRef, useState } from 'react';
import { usePlannerStore, defaultVehicle } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import PillToggle from './shared/PillToggle';
import SectionCard from './shared/SectionCard';

/** 구분선 */
function Divider() {
  return (
    <div style={{ background: '#d9d9d9', height: 1, width: '100%', flexShrink: 0 }} />
  );
}

export default function VehicleSection() {
  const { inputs, setVehicle } = usePlannerStore();
  const vehicle = inputs.vehicle ?? defaultVehicle;

  const hasVehicle = vehicle.ownershipType !== 'none';
  const [hasInstallment, setHasInstallment] = useState(vehicle.loanBalance > 0);
  const cachedVehicleRef = useRef<typeof vehicle | null>(null);
  const cachedInstallmentRef = useRef<{ loanBalance: number; loanRate: number; loanMonths: number } | null>(null);

  const handleVehicleToggle = (v: boolean) => {
    if (!v) {
      cachedVehicleRef.current = { ...vehicle };
      setVehicle({ ownershipType: 'none' });
    } else {
      if (cachedVehicleRef.current) {
        setVehicle({ ...cachedVehicleRef.current, ownershipType: 'owned' });
      } else {
        setVehicle({ ownershipType: 'owned' });
      }
    }
  };

  const handleInstallmentToggle = (v: boolean) => {
    setHasInstallment(v);
    if (!v) {
      cachedInstallmentRef.current = {
        loanBalance: vehicle.loanBalance,
        loanRate: vehicle.loanRate,
        loanMonths: vehicle.loanMonths,
      };
    } else if (cachedInstallmentRef.current) {
      setVehicle(cachedInstallmentRef.current);
    }
  };

  return (
    <SectionCard title="자동차가 있나요?" itemGap={12}>
      {/* 보유 여부 pill 카드 */}
      <PillToggle
        label="보유 여부"
        value={hasVehicle}
        onChange={handleVehicleToggle}
      />

      {/* 보유 ON → 별도 흰색 expanded 카드 */}
      {hasVehicle && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '12px 16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* 할부 여부 — pill row + 구분선 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
              <span
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#191f28',
                  fontFamily: 'Pretendard, sans-serif',
                  lineHeight: 1.5,
                }}
              >
                할부 중인가요?
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[
                  { val: false, label: '아니요' },
                  { val: true, label: '네' },
                ].map(({ val, label }) => {
                  const selected = hasInstallment === val;
                  return (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => handleInstallmentToggle(val)}
                      style={{
                        width: 63, height: 32, borderRadius: 8, border: 'none',
                        padding: '7px 14px', boxSizing: 'border-box',
                        background: selected ? '#333d4b' : 'rgba(112,115,124,0.08)',
                        color: selected ? '#ffffff' : 'rgba(46,47,51,0.88)',
                        fontSize: 14, fontWeight: selected ? 600 : 400,
                        cursor: 'pointer', fontFamily: 'Pretendard, sans-serif',
                        letterSpacing: '0.2522px', whiteSpace: 'nowrap',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Divider />
          </div>

          {/* 할부 ON → 할부 관련 필드 */}
          {hasInstallment && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8 }}>
                <NumberInput
                  label="남은 할부 금액"
                  value={vehicle.loanBalance}
                  onChange={(v) => setVehicle({ loanBalance: v })}
                />
                <RateInput
                  label="이자 (연)"
                  value={vehicle.loanRate}
                  onChange={(v) => setVehicle({ loanRate: v })}
                />
              </div>
              <NumberInput
                label="남은 대출 기간"
                value={vehicle.loanMonths}
                onChange={(v) => setVehicle({ loanMonths: v })}
                unit="개월"
                max={360}
              />
            </>
          )}

          {/* 월 유지비 — 섹션 헤더 + 구분선 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <span
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#191f28',
                  fontFamily: 'Pretendard, sans-serif',
                  lineHeight: 1.5,
                }}
              >
                월 유지비는 얼마나 드나요?
              </span>
            </div>
            <Divider />
          </div>

          <NumberInput
            label="금액"
            value={vehicle.monthlyMaintenance}
            onChange={(v) => setVehicle({ monthlyMaintenance: v })}
            hint="주유, 보험 등 들어가는 비용"
          />
        </div>
      )}
    </SectionCard>
  );
}
