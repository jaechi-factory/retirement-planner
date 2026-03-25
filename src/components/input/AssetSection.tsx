import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannerInputs } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';
import { ASSET_LABELS } from '../../utils/constants';

type AssetKey = keyof PlannerInputs['assets'];

const rows: AssetKey[] = [
  'cash', 'deposit', 'stock_kr', 'stock_us', 'bond', 'crypto', 'realEstate',
];

export default function AssetSection() {
  const { inputs, setAsset, result } = usePlannerStore();

  return (
    <SectionCard title="자산 구성" subtitle="지금 모아둔 돈이 얼마나 버텨주는지 계산해요">
      {result.totalAsset > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--tds-gray-50)',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--tds-gray-600)', fontWeight: 600 }}>총자산</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tds-gray-900)' }}>
            {result.totalAsset.toLocaleString('ko-KR')}만원
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {rows.map((key) => (
          <div key={key}>
            {/* 자산 이름 */}
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: inputs.assets[key].amount > 0 ? 'var(--tds-gray-700)' : 'var(--tds-gray-400)',
                margin: '0 0 8px 0',
              }}
            >
              {ASSET_LABELS[key]}
            </p>
            {/* 입력 */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8, minWidth: 0 }}>
              <NumberInput
                label="금액"
                value={inputs.assets[key].amount}
                onChange={(v) => setAsset(key, { amount: v })}
              />
              <RateInput
                label="1년 기대 수익률"
                value={inputs.assets[key].expectedReturn}
                onChange={(v) => setAsset(key, { expectedReturn: v })}
              />
            </div>
            {key === 'realEstate' && (
              <p style={{ fontSize: 11, color: 'var(--tds-gray-400)', margin: '4px 0 0', lineHeight: 1.5 }}>
                투자·임대 부동산을 포함해요. 실거주 집 전략은 결과 화면에서 따로 확인할 수 있어요.
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
