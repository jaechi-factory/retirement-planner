import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannerInputs, RepaymentType } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';
import { DEBT_LABELS, MORTGAGE_REPAYMENT_TYPES, MORTGAGE_REPAYMENT_LABELS, MORTGAGE_REPAYMENT_DESCRIPTIONS, OTHER_REPAYMENT_TYPES, OTHER_REPAYMENT_LABELS, OTHER_REPAYMENT_DESCRIPTIONS } from '../../utils/constants';
import { buildMonthlyDebtSchedule, getAnnualPaymentFromSchedule } from '../../engine/debtSchedule';

type DebtKey = keyof PlannerInputs['debts'];

const isMortgage = (key: DebtKey) => key === 'mortgage';

/** 상환방식 버튼 그룹 */
function RepaymentTypeSelector({
  value,
  onChange,
  types,
  labels,
}: {
  value: RepaymentType;
  onChange: (t: RepaymentType) => void;
  types: readonly string[];
  labels: Record<string, string>;
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
              height: 36,
              borderRadius: 8,
              border: `1.5px solid ${isSelected ? 'var(--tds-blue-500)' : 'var(--tds-gray-100)'}`,
              background: isSelected ? 'var(--tds-blue-50)' : 'var(--tds-white)',
              color: isSelected ? 'var(--tds-blue-500)' : 'var(--tds-gray-500)',
              fontSize: 12,
              fontWeight: isSelected ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {labels[type]}
          </button>
        );
      })}
    </div>
  );
}

export default function DebtSection() {
  const { inputs, setDebt, result } = usePlannerStore();
  const [graceExpanded, setGraceExpanded] = useState<Record<string, boolean>>({});

  const rows: DebtKey[] = ['mortgage', 'creditLoan', 'otherLoan'];

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
          const mortgage = isMortgage(key);

          const types = mortgage ? MORTGAGE_REPAYMENT_TYPES : OTHER_REPAYMENT_TYPES;
          const labels = mortgage ? MORTGAGE_REPAYMENT_LABELS : OTHER_REPAYMENT_LABELS;
          const descriptions = mortgage ? MORTGAGE_REPAYMENT_DESCRIPTIONS : OTHER_REPAYMENT_DESCRIPTIONS;

          // 연간 납입액 미리보기 (스케줄 기반, 첫 해 기준)
          const schedule = hasBalance && debt.repaymentYears > 0
            ? buildMonthlyDebtSchedule(debt)
            : [];
          const annualPayment = getAnnualPaymentFromSchedule(schedule, 0);

          const graceVisible = mortgage && graceExpanded[key];

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

              {/* 상환 기간 */}
              <div style={{ marginBottom: 10 }}>
                <NumberInput
                  label="남은 상환기간"
                  value={debt.repaymentYears}
                  onChange={(v) => setDebt(key, { repaymentYears: v })}
                  unit="년"
                  max={50}
                />
              </div>

              {/* 상환방식 선택 */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--tds-gray-500)', fontWeight: 500, margin: '0 0 6px 0' }}>
                  상환방식
                </p>
                <RepaymentTypeSelector
                  value={debt.repaymentType}
                  onChange={(t) => setDebt(key, { repaymentType: t })}
                  types={types}
                  labels={labels}
                />
              </div>

              {/* 인라인 설명 */}
              {descriptions[debt.repaymentType] && (
                <p style={{
                  fontSize: 11,
                  color: debt.repaymentType === 'graduated_payment'
                    ? 'var(--tds-orange-500, #F07A14)'
                    : 'var(--tds-gray-400)',
                  margin: '4px 0 8px 0',
                  lineHeight: 1.5,
                }}>
                  {descriptions[debt.repaymentType]}
                </p>
              )}

              {/* 거치기간 (주담대 전용, balloon_payment 제외) */}
              {mortgage && debt.repaymentType !== 'balloon_payment' && (
                <div style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setGraceExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--tds-gray-400)',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{graceVisible ? '▲' : '▼'}</span>
                    거치기간 설정 {debt.gracePeriodYears > 0 ? `(${debt.gracePeriodYears}년)` : '(선택)'}
                  </button>

                  {graceVisible && (
                    <div style={{ marginTop: 8 }}>
                      <NumberInput
                        label="거치기간"
                        value={debt.gracePeriodYears}
                        onChange={(v) => setDebt(key, { gracePeriodYears: v })}
                        unit="년"
                        max={10}
                      />
                      <p style={{ fontSize: 11, color: 'var(--tds-gray-400)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                        거치기간 동안은 이자만 내고, 이후 월 상환액은 더 커질 수 있어요.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 연간 납입액 미리보기 (첫 해 기준) */}
              {hasBalance && debt.repaymentYears > 0 && (
                <div style={{
                  marginTop: 4,
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
