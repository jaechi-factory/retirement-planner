import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import SectionCard from './shared/SectionCard';

export default function ChildrenSection() {
  const { inputs, setChildren } = usePlannerStore();
  const { children } = inputs;

  return (
    <SectionCard title="자녀 정보" subtitle="자녀 관련 지출이 언제까지 드는지 넣어요">
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
            hint="이 나이부터 자녀 지출을 0원으로 계산해요"
          />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--tds-gray-500)' }}>자녀비 증가 방식</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(
                [
                  { value: 'inflation', label: '물가연동' },
                  { value: 'fixed', label: '고정금액' },
                  { value: 'custom', label: '직접설정' },
                ] as { value: 'inflation' | 'fixed' | 'custom'; label: string }[]
              ).map((mode) => {
                const isActive = (children.costGrowthMode ?? 'inflation') === mode.value;
                return (
                  <button
                    key={mode.value}
                    onClick={() => setChildren({ costGrowthMode: mode.value })}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      border: `1.5px solid ${isActive ? 'var(--tds-blue-500)' : 'var(--tds-gray-100)'}`,
                      background: isActive ? 'var(--tds-blue-50)' : 'var(--tds-white)',
                      color: isActive ? 'var(--tds-blue-500)' : 'var(--tds-gray-500)',
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
          {(children.costGrowthMode ?? 'inflation') === 'custom' && (
            <NumberInput
              label="자녀비 연 증가율"
              value={children.customGrowthRate ?? 0}
              onChange={(v) => setChildren({ customGrowthRate: v })}
              unit="%"
              min={0}
              max={30}
              hint="물가와 별개로 자녀비에만 적용돼요"
            />
          )}
        </>
      )}
    </SectionCard>
  );
}
