import { useState } from 'react';
import { usePlannerStore, defaultVehicle } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import PillToggle from './shared/PillToggle';
import SectionCard from './shared/SectionCard';

export default function VehicleSection() {
  const { inputs, setVehicle } = usePlannerStore();
  const vehicle = inputs.vehicle ?? defaultVehicle;

  const hasVehicle = vehicle.ownershipType !== 'none';
  // 할부 여부는 잔액이 있으면 true로 초기화
  const [hasInstallment, setHasInstallment] = useState(vehicle.loanBalance > 0);

  const handleVehicleToggle = (v: boolean) => {
    if (!v) {
      setVehicle({ ownershipType: 'none', loanBalance: 0, loanRate: 0, loanMonths: 0 });
      setHasInstallment(false);
    } else {
      setVehicle({ ownershipType: 'owned' });
    }
  };

  const handleInstallmentToggle = (v: boolean) => {
    setHasInstallment(v);
    if (!v) {
      setVehicle({ loanBalance: 0, loanRate: 0, loanMonths: 0 });
    }
  };

  return (
    <SectionCard title="자동차가 있나요?">
      {/* 상위: 보유 여부 */}
      <PillToggle
        label="보유 여부"
        value={hasVehicle}
        onChange={handleVehicleToggle}
      />

      {/* 하위: 보유 여부 ON일 때만 표시 */}
      {hasVehicle && (
        <>
          {/* 할부 여부 */}
          <PillToggle
            label="할부 중인가요?"
            value={hasInstallment}
            onChange={handleInstallmentToggle}
          />

          {/* 할부 ON일 때 대출 세부 정보 */}
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

          {/* 월 유지비 — 보유 시 항상 표시 */}
          <NumberInput
            label="월 유지비는 얼마나 드나요?"
            value={vehicle.monthlyMaintenance}
            onChange={(v) => setVehicle({ monthlyMaintenance: v })}
            hint="주유, 보험 등 들어가는 비용"
          />
        </>
      )}
    </SectionCard>
  );
}
