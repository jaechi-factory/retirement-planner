import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import SectionCard from './shared/SectionCard';

interface Props {
  onComplete?: () => void;
}

export default function ChildrenSection({ onComplete }: Props) {
  const { inputs, setChildren } = usePlannerStore();
  const { children } = inputs;

  // 완료 조건: hasChildren이 명시적으로 선택됨 (true/false 모두 유효)
  // hasChildren은 boolean이므로 항상 선택된 상태
  const canComplete = true;

  return (
    <SectionCard
      title="자녀 정보"
      canComplete={canComplete}
      onComplete={onComplete}
    >
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
              border: children.hasChildren === value ? '2px solid var(--accent-selected)' : '1.5px solid var(--border-soft)',
              background: children.hasChildren === value ? 'var(--accent-selected-bg)' : 'var(--surface-card)',
              color: children.hasChildren === value ? 'var(--text-strong)' : 'var(--text-muted)',
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
            hint="이 나이 이후에는 자녀에게 드는 돈이 없는 것으로 계산해요."
          />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>자녀비 증가 방식</div>
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
                      border: isActive ? '2px solid var(--accent-selected)' : '1.5px solid var(--border-soft)',
                      background: isActive ? 'var(--accent-selected-bg)' : 'var(--surface-card)',
                      color: isActive ? 'var(--text-strong)' : 'var(--text-muted)',
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
