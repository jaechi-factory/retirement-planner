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

interface Props {
  onComplete?: () => void;
}

export default function AssetSection({ onComplete }: Props) {
  const { inputs, setAsset, result } = usePlannerStore();

  // 완료 조건: "다음" 클릭 시 완료 (자산 0도 유효)
  const canComplete = true;

  return (
    <SectionCard
      title="모은 자산을 알려주세요"
      canComplete={canComplete}
      onComplete={onComplete}
    >
      {result.totalAsset > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-card-soft)',
          borderRadius: 10,
          padding: '10px 14px',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-base)', fontWeight: 600 }}>총자산</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-strong)' }}>
            {result.totalAsset.toLocaleString('ko-KR')}만원
          </span>
        </div>
      )}

      {rows.map((key) => (
        <div key={key}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: inputs.assets[key].amount > 0 ? 'var(--text-base)' : 'var(--text-faint)',
            margin: '0 0 8px 0',
          }}>
            {ASSET_LABELS[key]}
          </p>
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
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0', lineHeight: 1.5 }}>
              실거주 집을 포함한 전체 부동산 가치를 입력해 주세요. 집을 그대로 둘지, 담보로
              대출받을지, 팔지에 따라 결과가 달라져요.
            </p>
          )}
        </div>
      ))}
    </SectionCard>
  );
}
