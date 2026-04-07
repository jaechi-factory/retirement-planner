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
    <SectionCard title="자산 구성" subtitle="지금 가진 자산을 입력하면, 은퇴 후 얼마나 버틸 수 있는지 계산해요">
      {/* Total asset summary */}
      {result.totalAsset > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--neutral-50)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            border: '1px solid var(--neutral-100)',
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: 'var(--neutral-500)',
              fontWeight: 600,
            }}
          >
            총자산
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--neutral-900)',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {result.totalAsset.toLocaleString('ko-KR')}만원
          </span>
        </div>
      )}

      {/* Asset rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {rows.map((key) => (
          <div key={key}>
            {/* Asset name */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: inputs.assets[key].amount > 0 ? 'var(--neutral-700)' : 'var(--neutral-400)',
                margin: '0 0 10px 0',
                letterSpacing: '-0.01em',
              }}
            >
              {ASSET_LABELS[key]}
            </p>

            {/* Input fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, minWidth: 0 }}>
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

            {/* Real estate hint */}
            {key === 'realEstate' && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--neutral-400)',
                  margin: '8px 0 0',
                  lineHeight: 1.55,
                }}
              >
                실거주 집을 포함한 전체 부동산 가치를 입력해 주세요. 집을 그대로 둘지, 담보로
                대출받을지, 팔지에 따라 결과가 달라져요.
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
