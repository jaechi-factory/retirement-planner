import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import SectionCard from './shared/SectionCard';

export default function ChildrenSection() {
  const { inputs, setChildren } = usePlannerStore();
  const { children } = inputs;

  return (
    <SectionCard title="자녀 정보">
      {/* 라디오 버튼 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { value: false, label: '자녀 없음' },
          { value: true, label: '자녀 있음' },
        ].map(({ value, label }) => (
          <button
            key={String(value)}
            onClick={() => setChildren({ hasChildren: value })}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: `1.5px solid ${children.hasChildren === value ? 'var(--tds-blue-500)' : 'var(--tds-gray-100)'}`,
              background: children.hasChildren === value ? 'var(--tds-blue-50)' : 'var(--tds-white)',
              color: children.hasChildren === value ? 'var(--tds-blue-500)' : 'var(--tds-gray-500)',
              fontSize: 14,
              fontWeight: children.hasChildren === value ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {children.hasChildren && (
        <>
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
            hint="이 나이 이후로 자녀 지출이 사라져요"
          />
        </>
      )}
    </SectionCard>
  );
}
