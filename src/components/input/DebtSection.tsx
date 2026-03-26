import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannerInputs, RepaymentType } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';
import {
  DEBT_LABELS,
  MORTGAGE_REPAYMENT_TYPES,
  MORTGAGE_REPAYMENT_FRIENDLY_LABELS,
  MORTGAGE_REPAYMENT_LABELS,
  MORTGAGE_REPAYMENT_DESCRIPTIONS,
  OTHER_REPAYMENT_TYPES,
  OTHER_REPAYMENT_FRIENDLY_LABELS,
  OTHER_REPAYMENT_LABELS,
  OTHER_REPAYMENT_DESCRIPTIONS,
} from '../../utils/constants';
import { buildMonthlyDebtSchedule, summarizeDebtSchedule } from '../../engine/debtSchedule';

type DebtKey = keyof PlannerInputs['debts'];

const isMortgage = (key: DebtKey) => key === 'mortgage';

/** 상환방식 버튼 그룹 */
function RepaymentTypeSelector({
  value,
  onChange,
  types,
  friendlyLabels,
  termLabels,
}: {
  value: RepaymentType;
  onChange: (t: RepaymentType) => void;
  types: readonly string[];
  friendlyLabels: Record<string, string>;
  termLabels: Record<string, string>;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {types.map((type) => {
        const isSelected = value === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type as RepaymentType)}
            style={{
              flex: 1,
              padding: '7px 4px',
              borderRadius: 8,
              border: `1.5px solid ${isSelected ? 'var(--tds-blue-500)' : 'var(--tds-gray-100)'}`,
              background: isSelected ? 'var(--tds-blue-50)' : 'var(--tds-white)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 12,
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? 'var(--tds-blue-500)' : 'var(--tds-gray-700)',
              lineHeight: 1.3,
              whiteSpace: 'pre-wrap',
            }}>
              {friendlyLabels[type]}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 400,
              color: isSelected ? 'var(--tds-blue-400)' : 'var(--tds-gray-400)',
              marginTop: 2,
            }}>
              {termLabels[type]}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function DebtSection() {
  const { inputs, setDebt, result } = usePlannerStore();

  const rows: DebtKey[] = ['mortgage', 'creditLoan', 'otherLoan'];

  return (
    <SectionCard title="부채 구성" subtitle="갚아야 할 돈이 생활비에 얼마나 영향을 주는지 반영해요">
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
          const isMort = isMortgage(key);

          const types = isMort ? MORTGAGE_REPAYMENT_TYPES : OTHER_REPAYMENT_TYPES;
          const friendlyLabels = isMort ? MORTGAGE_REPAYMENT_FRIENDLY_LABELS : OTHER_REPAYMENT_FRIENDLY_LABELS;
          const termLabels = isMort ? MORTGAGE_REPAYMENT_LABELS : OTHER_REPAYMENT_LABELS;
          const descriptions = isMort ? MORTGAGE_REPAYMENT_DESCRIPTIONS : OTHER_REPAYMENT_DESCRIPTIONS;
          const selectedDescription = descriptions[debt.repaymentType];

          // 스케줄 기반 요약 (4개 지표)
          const schedule = hasBalance && debt.repaymentYears > 0
            ? buildMonthlyDebtSchedule(debt)
            : [];
          const summary = summarizeDebtSchedule(schedule);

          return (
            <div key={key}>
              {/* 부채 이름 */}
              <p style={{
                fontSize: 13, fontWeight: 600,
                color: hasBalance ? 'var(--tds-gray-700)' : 'var(--tds-gray-400)',
                margin: '0 0 12px 0',
              }}>
                {DEBT_LABELS[key]}
              </p>

              {/* 잔액 + 이자율 */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8, marginBottom: 12 }}>
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

              {/* 상환 기간 */}
              <div style={{ marginBottom: 12 }}>
                <NumberInput
                  label="남은 상환기간"
                  value={debt.repaymentYears}
                  onChange={(v) => setDebt(key, { repaymentYears: v })}
                  unit="년"
                  max={50}
                />
              </div>

              {/* 상환방식 선택 */}
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--tds-gray-500)', fontWeight: 500, margin: '0 0 8px 0' }}>
                  상환방식
                </p>
                <RepaymentTypeSelector
                  value={debt.repaymentType}
                  onChange={(t) => setDebt(key, { repaymentType: t })}
                  types={types}
                  friendlyLabels={friendlyLabels}
                  termLabels={termLabels}
                />
              </div>

              {/* 선택된 상환방식 설명 callout */}
              {selectedDescription && (
                <div style={{
                  marginBottom: 14,
                  padding: '10px 14px',
                  background: 'var(--tds-gray-50)',
                  borderRadius: 8,
                  borderLeft: '3px solid var(--tds-gray-200)',
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tds-gray-500)', lineHeight: 1.6 }}>
                    {selectedDescription}
                  </p>
                </div>
              )}


              {/* 상환 미리보기 */}
              {hasBalance && debt.repaymentYears > 0 && summary.firstMonthPayment > 0 && (
                <div style={{
                  marginTop: 4,
                  borderRadius: 10,
                  border: '1px solid var(--tds-gray-100)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    background: 'var(--tds-gray-50)',
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--tds-gray-500)',
                    letterSpacing: 0.2,
                  }}>
                    상환 미리보기
                  </div>
                  <div style={{
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}>
                    <div style={{ padding: '8px 10px', background: 'var(--tds-gray-50)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 3 }}>첫 달에 갚을 돈</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tds-gray-700)' }}>
                        −{Math.round(summary.firstMonthPayment).toLocaleString('ko-KR')}만원
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'var(--tds-gray-50)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 3 }}>첫해에 갚을 돈</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tds-gray-500)' }}>
                        −{Math.round(summary.firstYearAnnualPayment).toLocaleString('ko-KR')}만원
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'var(--tds-gray-50)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 3 }}>이자 총합</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tds-gray-500)' }}>
                        −{Math.round(summary.totalInterest).toLocaleString('ko-KR')}만원
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'var(--tds-gray-50)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 3 }}>가장 큰 달</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tds-gray-500)' }}>
                        −{Math.round(summary.maxMonthPayment).toLocaleString('ko-KR')}만원
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>
                        {Math.floor(summary.maxMonthIndex / 12) + 1}년차
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
