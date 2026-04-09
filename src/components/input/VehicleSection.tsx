import { Typography } from '@wanteddev/wds';
import { usePlannerStore, defaultVehicle } from '../../store/usePlannerStore';
import type { VehicleOwnershipType } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';

const OWNERSHIP_OPTIONS: { value: VehicleOwnershipType; label: string; desc: string }[] = [
  { value: 'none',   label: '없음',       desc: '차량 없음' },
  { value: 'owned',  label: '이미 보유',  desc: '지금 갖고 있음' },
];

/** 유형 선택 버튼 */
function OwnershipSelector({
  value,
  onChange,
}: {
  value: VehicleOwnershipType;
  onChange: (v: VehicleOwnershipType) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
      {OWNERSHIP_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '9px 4px',
              borderRadius: 10,
              border: selected
                ? '2px solid var(--accent-selected)'
                : '1.5px solid var(--border-soft)',
              background: selected ? 'var(--accent-selected-bg)' : 'var(--surface-card)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 12,
              fontWeight: selected ? 700 : 600,
              color: selected ? 'var(--text-strong)' : 'var(--text-base)',
              lineHeight: 1.3,
            }}>
              {opt.label}
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 400,
              color: selected ? 'var(--text-muted)' : 'var(--text-faint)',
              marginTop: 2,
            }}>
              {opt.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** 연소비 포함 여부 선택 */
function InclusionSelector({
  value,
  onChange,
}: {
  value: 'included' | 'separate';
  onChange: (v: 'included' | 'separate') => void;
}) {
  const options: { value: 'included' | 'separate'; label: string; desc: string }[] = [
    { value: 'included', label: '연소비에 포함됨', desc: '이미 반영된 비용' },
    { value: 'separate', label: '별도로 계산',     desc: '추가로 빠져나감' },
  ];

  return (
    <div>
      <Typography variant="label2" weight="medium" color="semantic.label.alternative"
        style={{ display: 'block', marginBottom: 8 }}>
        이 비용이 위에서 입력한 연소비에 포함되어 있나요?
      </Typography>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                padding: '10px 8px',
                borderRadius: 10,
                border: selected
                  ? '2px solid var(--accent-selected)'
                  : '1.5px solid var(--border-soft)',
                background: selected ? 'var(--accent-selected-bg)' : 'var(--surface-card)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: 12,
                fontWeight: selected ? 700 : 600,
                color: selected ? 'var(--text-strong)' : 'var(--text-base)',
                lineHeight: 1.3,
              }}>
                {opt.label}
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 400,
                color: selected ? 'var(--text-muted)' : 'var(--text-faint)',
                marginTop: 2,
              }}>
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function VehicleSection() {
  const { inputs, setVehicle } = usePlannerStore();
  const vehicle = inputs.vehicle ?? defaultVehicle;
  const type = vehicle.ownershipType;
  const hasVehicle = type !== 'none';

  return (
    <SectionCard
      title="자동차"
      subtitle="차량 비용이 노후 생활비에 얼마나 영향을 주는지 계산해요"
    >
      {/* 유형 선택 */}
      <OwnershipSelector
        value={type}
        onChange={(v) => setVehicle({ ownershipType: v })}
      />

      {/* 차량 있을 때만 나머지 입력 표시 */}
      {hasVehicle && (
        <>
          {/* 연소비 포함 여부 — 반드시 선택 */}
          <InclusionSelector
            value={vehicle.costIncludedInExpense}
            onChange={(v) => setVehicle({ costIncludedInExpense: v })}
          />

          {/* ── 이미 보유 ──────────────────────────────────────── */}
          {type === 'owned' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8 }}>
                <NumberInput
                  label="남은 대출 잔액"
                  value={vehicle.loanBalance}
                  onChange={(v) => setVehicle({ loanBalance: v })}
                />
                <RateInput
                  label="이율 (연)"
                  value={vehicle.loanRate}
                  onChange={(v) => setVehicle({ loanRate: v })}
                />
              </div>
              <NumberInput
                label="남은 상환 기간"
                value={vehicle.loanMonths}
                onChange={(v) => setVehicle({ loanMonths: v })}
                unit="개월"
                max={360}
              />
            </>
          )}

          {/* ── 공통 ───────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            <NumberInput
              label="월 유지비"
              value={vehicle.monthlyMaintenance}
              onChange={(v) => setVehicle({ monthlyMaintenance: v })}
              hint="보험·주유·수리 등"
            />
          </div>

          {/* 포함 여부 안내 callout */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--surface-card-soft)',
            borderRadius: 8,
          }}>
            <Typography variant="caption1" color="semantic.label.alternative"
              style={{ margin: 0, lineHeight: 1.6 }}>
              {vehicle.costIncludedInExpense === 'included'
                ? '연소비에 이미 포함된 비용이에요. 결과 화면에서 "차 없을 때 생활비"가 얼마나 늘어나는지 확인할 수 있어요.'
                : '연소비와 별도로 계산돼요. 결과 화면에서 차 때문에 줄어드는 월 생활비를 확인할 수 있어요.'}
            </Typography>
          </div>
        </>
      )}
    </SectionCard>
  );
}
