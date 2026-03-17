import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannerInputs, RepaymentType } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';
import { DEBT_LABELS } from '../../utils/constants';
import { calcDebtAnnualPayment } from '../../engine/assetWeighting';

type DebtKey = keyof PlannerInputs['debts'];
const rows: DebtKey[] = ['mortgage', 'creditLoan', 'otherLoan'];

const REPAYMENT_LABELS: Record<RepaymentType, string> = {
  equal_payment: '원리금균등',
  equal_principal: '원금균등',
  interest_only: '이자만 납부',
};

export default function DebtSection() {
  const { inputs, setDebt, result } = usePlannerStore();

  return (
    <SectionCard title="부채 구성">
      {result.totalDebt > 0 && (
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
          <span style={{ fontSize: 13, color: 'var(--tds-gray-500)', fontWeight: 600 }}>총부채</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tds-red-500, #F04452)' }}>
            {result.totalDebt.toLocaleString('ko-KR')}만원
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {rows.map((key) => {
          const debt = inputs.debts[key];
          const hasBalance = debt.balance > 0;
          const annualPayment = hasBalance ? calcDebtAnnualPayment(debt) : 0;

          return (
            <div key={key}>
              {/* 부채 이름 */}
              <p style={{
                fontSize: 13, fontWeight: 600,
                color: hasBalance ? 'var(--tds-gray-700)' : 'var(--tds-gray-400)',
                margin: '0 0 10px 0',
              }}>
                {DEBT_LABELS[key]}
              </p>

              {/* 잔액 + 이자율 */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8, marginBottom: 10 }}>
                <NumberInput
                  label="잔액"
                  value={debt.balance}
                  onChange={(v) => setDebt(key, { balance: v })}
                />
                <RateInput
                  label="이자율 (연)"
                  value={debt.interestRate}
                  onChange={(v) => setDebt(key, { interestRate: v })}
                />
              </div>

              {/* 상환 방식 선택 */}
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--tds-gray-500)', fontWeight: 500, margin: '0 0 6px 0' }}>
                  상환 방식
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(Object.keys(REPAYMENT_LABELS) as RepaymentType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setDebt(key, { repaymentType: type })}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        border: `1.5px solid ${debt.repaymentType === type ? 'var(--tds-blue-500)' : 'var(--tds-gray-100)'}`,
                        background: debt.repaymentType === type ? 'var(--tds-blue-50)' : 'var(--tds-white)',
                        color: debt.repaymentType === type ? 'var(--tds-blue-500)' : 'var(--tds-gray-500)',
                        fontSize: 12,
                        fontWeight: debt.repaymentType === type ? 700 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {REPAYMENT_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 상환 기간 */}
              <NumberInput
                label={debt.repaymentType === 'interest_only' ? '이자 납부 기간 후 일시 상환' : '상환 기간'}
                value={debt.repaymentYears}
                onChange={(v) => setDebt(key, { repaymentYears: v })}
                unit="년"
                max={50}
              />

              {/* 계산된 연간 납입액 미리보기 */}
              {hasBalance && debt.repaymentYears > 0 && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: 'var(--tds-blue-50)',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--tds-blue-500)' }}>
                    연간 납입액 (첫해 기준)
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-blue-500)' }}>
                    {Math.round(annualPayment).toLocaleString('ko-KR')}만원
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
