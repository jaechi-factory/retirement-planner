import { useState } from 'react';
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

/** 없어요 / 있어요 토글 */
function HasDebtToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const options = [
    { value: false, label: '없어요' },
    { value: true,  label: '있어요' },
  ];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              height: 54,
              borderRadius: 16,
              border: `2px solid ${selected ? 'var(--fig-input-border-filled)' : 'var(--fig-input-border-empty)'}`,
              background: '#ffffff',
              color: selected ? 'var(--fig-label-color)' : 'var(--fig-placeholder-color)',
              fontSize: 16,
              fontWeight: selected ? 600 : 400,
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
              fontFamily: 'Pretendard, sans-serif',
              letterSpacing: '0.0798px',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

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
              border: isSelected
                ? `2px solid var(--fig-input-border-filled)`
                : `1.5px solid var(--fig-input-border-empty)`,
              background: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 12,
              fontWeight: isSelected ? 700 : 600,
              color: isSelected ? 'var(--fig-label-color)' : 'var(--text-base)',
              lineHeight: 1.3,
              whiteSpace: 'pre-wrap',
            }}>
              {friendlyLabels[type]}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 400,
              color: isSelected ? 'var(--text-muted)' : 'var(--text-faint)',
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
  const [hasDebt, setHasDebt] = useState(false);

  const rows: DebtKey[] = ['mortgage', 'creditLoan', 'otherLoan'];

  return (
    <SectionCard title="부채가 있나요?">
      <HasDebtToggle value={hasDebt} onChange={setHasDebt} />

      {hasDebt && (
        <>
          {result.totalDebt > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface-card-inner)',
                borderRadius: 10,
                padding: '10px 14px',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>총부채</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--status-shortage-text)' }}>
                {result.totalDebt.toLocaleString('ko-KR')}만원
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {rows.map((key) => {
              const debt = inputs.debts[key];
              const hasBalance = debt.balance > 0;
              const isMort = isMortgage(key);

              const types = isMort ? MORTGAGE_REPAYMENT_TYPES : OTHER_REPAYMENT_TYPES;
              const friendlyLabels = isMort ? MORTGAGE_REPAYMENT_FRIENDLY_LABELS : OTHER_REPAYMENT_FRIENDLY_LABELS;
              const termLabels = isMort ? MORTGAGE_REPAYMENT_LABELS : OTHER_REPAYMENT_LABELS;
              const descriptions = isMort ? MORTGAGE_REPAYMENT_DESCRIPTIONS : OTHER_REPAYMENT_DESCRIPTIONS;
              const selectedDescription = descriptions[debt.repaymentType];

              const schedule = hasBalance && debt.repaymentYears > 0
                ? buildMonthlyDebtSchedule(debt)
                : [];
              const summary = summarizeDebtSchedule(schedule);

              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* 부채 이름 */}
                  <p style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--fig-label-color)',
                    letterSpacing: '0.12px',
                  }}>
                    {DEBT_LABELS[key]}
                  </p>

                  {/* 잔액 + 이자율 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 8 }}>
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
                  <NumberInput
                    label="남은 상환기간"
                    value={debt.repaymentYears}
                    onChange={(v) => setDebt(key, { repaymentYears: v })}
                    unit="년"
                    max={50}
                  />

                  {/* 상환방식 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--fig-label-color)',
                      letterSpacing: '0.12px',
                    }}>
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

                  {/* 상환방식 설명 */}
                  {selectedDescription && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--surface-card-soft)',
                      borderRadius: 8,
                    }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {selectedDescription}
                      </p>
                    </div>
                  )}

                  {/* 상환 미리보기 */}
                  {hasBalance && debt.repaymentYears > 0 && summary.firstMonthPayment > 0 && (
                    <div style={{
                      borderRadius: 10,
                      background: 'var(--surface-card-soft)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        background: 'var(--surface-card-inner)',
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                      }}>
                        상환 미리보기
                      </div>
                      <div style={{ padding: '10px 12px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ padding: '8px 10px', background: 'var(--surface-card-inner)', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>첫 달 상환액</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-base)' }}>
                            −{Math.round(summary.firstMonthPayment).toLocaleString('ko-KR')}만원
                          </div>
                        </div>
                        <div style={{ padding: '8px 10px', background: 'var(--surface-card-inner)', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>첫해 상환액</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-base)' }}>
                            −{Math.round(summary.firstYearAnnualPayment).toLocaleString('ko-KR')}만원
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '2px 12px 10px', display: 'flex', gap: 14 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          총이자{' '}
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                            −{Math.round(summary.totalInterest).toLocaleString('ko-KR')}만원
                          </span>
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          최대 월 상환액{' '}
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                            −{Math.round(summary.maxMonthPayment).toLocaleString('ko-KR')}만원
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </SectionCard>
  );
}
