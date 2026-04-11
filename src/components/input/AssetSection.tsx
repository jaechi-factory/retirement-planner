import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannerInputs } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';
import { ASSET_LABELS } from '../../utils/constants';

type AssetKey = keyof PlannerInputs['assets'];

// 피그마 순서: 현금 → 예금·적금 → 국내주식 → 해외주식 → 부동산 → 채권 → 암호화폐
const rows: AssetKey[] = [
  'cash', 'deposit', 'stock_kr', 'stock_us', 'realEstate', 'bond', 'crypto',
];

export default function AssetSection() {
  const { inputs, setAsset } = usePlannerStore();

  return (
    <SectionCard title="모은 자산을 알려주세요">
      {rows.map((key) => (
        <div
          key={key}
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            minWidth: 0,
          }}
        >
          <div style={{ flex: '143 0 0', minWidth: 0 }}>
            <NumberInput
              label={ASSET_LABELS[key]}
              value={inputs.assets[key].amount}
              onChange={(v) => setAsset(key, { amount: v })}
            />
          </div>
          <div style={{ flex: '110 0 0', minWidth: 0 }}>
            <RateInput
              label="예상 수익률(연)"
              value={inputs.assets[key].expectedReturn}
              onChange={(v) => setAsset(key, { expectedReturn: v })}
            />
          </div>
        </div>
      ))}
    </SectionCard>
  );
}
