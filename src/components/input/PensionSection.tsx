import { usePlannerStore } from '../../store/usePlannerStore';
import { fmtKRW } from '../../utils/format';
import PublicPensionCard from './pension/PublicPensionCard';
import RetirementPensionCard from './pension/RetirementPensionCard';
import PrivatePensionCard from './pension/PrivatePensionCard';
import SectionCard from './shared/SectionCard';

interface Props {
  onComplete?: () => void;
  isLast?: boolean;
}

export default function PensionSection({ onComplete, isLast }: Props) {
  const { inputs, result } = usePlannerStore();
  const totalPension = result.totalMonthlyPensionTodayValue ?? 0;
  const targetMonthly = inputs.goal.targetMonthly;
  const coveragePct = targetMonthly > 0 ? Math.round((totalPension / targetMonthly) * 100) : 0;

  return (
    <SectionCard
      title="연금"
      canComplete={true}
      onComplete={onComplete}
      isLast={isLast}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PublicPensionCard />
        <RetirementPensionCard />
        <PrivatePensionCard />
      </div>

      {totalPension > 0 && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--surface-card-soft)', borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>
              현재 가치 기준 예상 연금
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>
              월 {fmtKRW(totalPension)}이 생활비에 들어와요
            </div>
          </div>
          {coveragePct > 0 && (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>
              {coveragePct}%
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
        평균값으로 계산한 추정치예요 · 실제 수령액과 다를 수 있어요
      </div>
    </SectionCard>
  );
}
