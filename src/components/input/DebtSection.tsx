import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannerInputs, RepaymentType } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';
import {
  DEBT_LABELS,
  MORTGAGE_REPAYMENT_TYPES,
  MORTGAGE_REPAYMENT_LABELS,
  MORTGAGE_REPAYMENT_FRIENDLY_LABELS,
  MORTGAGE_REPAYMENT_DESCRIPTIONS,
  OTHER_REPAYMENT_TYPES,
  OTHER_REPAYMENT_LABELS,
  OTHER_REPAYMENT_FRIENDLY_LABELS,
  OTHER_REPAYMENT_DESCRIPTIONS,
} from '../../utils/constants';
import { buildMonthlyDebtSchedule, summarizeDebtSchedule } from '../../engine/debtSchedule';

type DebtKey = keyof PlannerInputs['debts'];

const isMortgage = (key: DebtKey) => key === 'mortgage';

/** 상환방식 버튼 그룹 — 2행 레이아웃 (일상어 + 금융용어) */
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
              minHeight: 48,
              height: 'auto',
              borderRadius: 8,
              border: `1.5px solid ${isSelected ? 'var(--tds-blue-500)' : 'var(--tds-gray-100)'}`,
              background: isSelected ? 'var(--tds-blue-50)' : 'var(--tds-white)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              padding: '7px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={{
              fontSize: 11,
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? 'var(--tds-blue-500)' : 'var(--tds-gray-600)',
              lineHeight: 1.3,
              textAlign: 'center',
              wordBreak: 'keep-all',
            }}>
              {friendlyLabels[type]}
            </span>
            <span style={{
              fontSize: 10,
              color: isSelected ? 'var(--tds-blue-400)' : 'var(--tds-gray-400)',
              lineHeight: 1.2,
            }}>
              {termLabels[type]}
            </span>
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
          const friendlyLabels = mortgage ? MORTGAGE_REPAYMENT_FRIENDLY_LABELS : OTHER_REPAYMENT_FRIENDLY_LABELS;
          const termLabels = mortgage ? MORTGAGE_REPAYMENT_LABELS : OTHER_REPAYMENT_LABELS;
          const descriptions = mortgage ? MORTGAGE_REPAYMENT_DESCRIPTIONS : OTHER_REPAYMENT_DESCRIPTIONS;

          // 스케줄 기반 요약 (4개 지표)
          const schedule = hasBalance && debt.repaymentYears > 0
            ? buildMonthlyDebtSchedule(debt)
            : [];
          const summary = summarizeDebtSchedule(schedule);

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
                  friendlyLabels={friendlyLabels}
                  termLabels={termLabels}
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
                    원금은 나중부터 갚기 {debt.gracePeriodYears > 0 ? `(${debt.gracePeriodYears}년)` : '(선택)'}
                  </button>

                  {graceVisible && (
                    <div style={{ marginTop: 8 }}>
                      <NumberInput
                        label="원금 상환 시작까지"
                        value={debt.gracePeriodYears}
                        onChange={(v) => setDebt(key, { gracePeriodYears: v })}
                        unit="년"
                        max={10}
                      />
                      <p style={{ fontSize: 11, color: 'var(--tds-gray-400)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                        지금은 이자만 내고 원금은 나중에 갚아요. 그만큼 나중 부담이 커질 수 있어요.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 상환 미리보기 (4개 지표) */}
              {hasBalance && debt.repaymentYears > 0 && summary.firstMonthPayment > 0 && (
                <div style={{
                  marginTop: 4,
                  padding: '10px 12px',
                  background: 'var(--tds-blue-50)',
                  borderRadius: 8,
                }}>
                  <p style={{ fontSize: 11, color: 'var(--tds-blue-400)', margin: '0 0 8px 0', fontWeight: 600 }}>
                    상환 미리보기
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--tds-gray-500)', margin: '0 0 1px 0' }}>첫 달 납입액</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-blue-500)', margin: 0 }}>
                        {Math.round(summary.firstMonthPayment).toLocaleString('ko-KR')}만원
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--tds-gray-500)', margin: '0 0 1px 0' }}>첫해 납입액</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-blue-500)', margin: 0 }}>
                        {Math.round(summary.firstYearAnnualPayment).toLocaleString('ko-KR')}만원
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--tds-gray-500)', margin: '0 0 1px 0' }}>가장 많이 내는 달</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-blue-500)', margin: 0 }}>
                        {Math.round(summary.maxMonthPayment).toLocaleString('ko-KR')}만원
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--tds-gray-500)', margin: '0 0 1px 0' }}>부담 최고 시점</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-blue-500)', margin: 0 }}>
                        {Math.floor(summary.maxMonthIndex / 12) + 1}년차
                      </p>
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
