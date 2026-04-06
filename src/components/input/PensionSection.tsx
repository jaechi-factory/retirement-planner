import { usePlannerStore } from '../../store/usePlannerStore';
import { fmtKRW } from '../../utils/format';
import PublicPensionCard from './pension/PublicPensionCard';
import RetirementPensionCard from './pension/RetirementPensionCard';
import PrivatePensionCard from './pension/PrivatePensionCard';

export default function PensionSection() {
  const { inputs, result } = usePlannerStore();
  const totalPension = result.totalMonthlyPensionTodayValue ?? 0;
  const targetMonthly = inputs.goal.targetMonthly;
  const coveragePct = targetMonthly > 0 ? Math.round((totalPension / targetMonthly) * 100) : 0;

  return (
    <div
      style={{
        background: 'var(--tds-white)',
        borderRadius: 16,
        padding: '20px 20px 24px',
        marginBottom: 12,
        border: '1px solid var(--tds-gray-100)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 3px 0', fontSize: 15, fontWeight: 700, color: 'var(--tds-gray-900)' }}>
          연금
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tds-gray-400)' }}>
          은퇴 후 매달 들어오는 돈을 입력해요
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PublicPensionCard />
        <RetirementPensionCard />
        <PrivatePensionCard />
      </div>

      {totalPension > 0 && (
        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: 'var(--tds-gray-50)', borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 2 }}>
              추정값 · 지금 기준
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tds-gray-600)' }}>
              월 {fmtKRW(totalPension)}이 생활비에 들어와요
            </div>
          </div>
          {coveragePct > 0 && (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tds-gray-500)' }}>
              {coveragePct}%
            </div>
          )}
        </div>
      )}

      <div style={{
        marginTop: 10,
        fontSize: 12, color: 'var(--tds-gray-400)', lineHeight: 1.6,
      }}>
        평균값으로 계산한 추정치예요 · 실제 수령액과 다를 수 있어요
      </div>
    </div>
  );
}
