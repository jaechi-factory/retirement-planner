import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import PillToggle from './shared/PillToggle';
import SectionCard from './shared/SectionCard';

export default function ChildrenSection() {
  const { inputs, setChildren } = usePlannerStore();
  const { children } = inputs;

  return (
    <SectionCard title="아이가 있나요?" itemGap={12}>
      {/* 자녀 여부 pill 카드 */}
      <PillToggle
        label="자녀 여부"
        value={children.hasChildren}
        falseLabel="없어요"
        trueLabel="있어요"
        onChange={(v) => setChildren({ hasChildren: v })}
      />

      {/* 자녀 있음 → 별도 흰색 카드에 확장 필드 */}
      {children.hasChildren && (
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
          <NumberInput
            label="자녀 수"
            value={children.count}
            onChange={(v) => setChildren({ count: v })}
            unit="명"
            min={1}
            max={10}
          />
          <NumberInput
            label="자녀 1인당 월 지출"
            value={children.monthlyPerChild}
            onChange={(v) => setChildren({ monthlyPerChild: v })}
          />
          <NumberInput
            label="자녀 독립 시 내 나이"
            value={children.independenceAge}
            onChange={(v) => setChildren({ independenceAge: v })}
            unit="세"
            min={inputs.status.currentAge}
            max={100}
            hint="이 나이 이후에는 자녀에게 드는 돈이 없는 것으로 계산해요."
          />
        </div>
      )}
    </SectionCard>
  );
}
