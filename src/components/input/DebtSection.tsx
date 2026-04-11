import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { RepaymentType } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import PillToggle from './shared/PillToggle';
import SectionCard from './shared/SectionCard';
import {
  MORTGAGE_REPAYMENT_TYPES,
  MORTGAGE_REPAYMENT_LABELS,
  MORTGAGE_REPAYMENT_DESCRIPTIONS,
  OTHER_REPAYMENT_TYPES,
  OTHER_REPAYMENT_LABELS,
  OTHER_REPAYMENT_DESCRIPTIONS,
} from '../../utils/constants';
import { buildMonthlyDebtSchedule, summarizeDebtSchedule } from '../../engine/debtSchedule';

type DebtKey = 'mortgage' | 'creditLoan';

const DEBT_CONFIG: Record<DebtKey, {
  label: string;
  types: readonly string[];
  termLabels: Record<string, string>;
  descriptions: Record<string, string>;
}> = {
  mortgage: {
    label: '주택 담보 대출',
    types: MORTGAGE_REPAYMENT_TYPES,
    termLabels: MORTGAGE_REPAYMENT_LABELS,
    descriptions: MORTGAGE_REPAYMENT_DESCRIPTIONS,
  },
  creditLoan: {
    label: '신용 대출',
    types: OTHER_REPAYMENT_TYPES,
    termLabels: OTHER_REPAYMENT_LABELS,
    descriptions: OTHER_REPAYMENT_DESCRIPTIONS,
  },
};


/** 상환방식 셀렉트박스 */
function RepaymentSelect({
  value,
  onChange,
  types,
  termLabels,
  descriptions,
}: {
  value: RepaymentType;
  onChange: (t: RepaymentType) => void;
  types: readonly string[];
  termLabels: Record<string, string>;
  descriptions: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 트리거 박스 */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          height: 54,
          border: '2px solid var(--fig-input-border-filled)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          cursor: 'pointer',
          background: '#ffffff',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fig-label-color)' }}>
          {termLabels[value]}
        </span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="var(--fig-label-color)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 드롭다운 옵션 */}
      {open && (
        <div
          style={{
            border: '1px solid rgba(36,39,46,0.12)',
            borderRadius: 12,
            background: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(36,39,46,0.12)',
          }}
        >
          {types.map((type, i) => (
            <div
              key={type}
              onClick={() => {
                onChange(type as RepaymentType);
                setOpen(false);
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: value === type ? 'var(--accent-selected-bg)' : '#ffffff',
                borderBottom: i < types.length - 1 ? '1px solid rgba(36,39,46,0.06)' : 'none',
                fontSize: 14,
                fontWeight: value === type ? 600 : 400,
                color: 'var(--fig-label-color)',
              }}
            >
              {termLabels[type]}
            </div>
          ))}
        </div>
      )}

      {/* 설명 텍스트 */}
      {descriptions[value] && (
        <p style={{ margin: 0, fontSize: 13, color: '#4e5968', lineHeight: 1.6 }}>
          {descriptions[value]}
        </p>
      )}
    </div>
  );
}

/** 대출 행 카드 — PillToggle children 패턴으로 펼쳐짐 */
function LoanRow({ debtKey }: { debtKey: DebtKey }) {
  const { inputs, setDebt } = usePlannerStore();
  const config = DEBT_CONFIG[debtKey];
  const debt = inputs.debts[debtKey];
  const [hasLoan, setHasLoan] = useState(debt.balance > 0);

  const schedule =
    hasLoan && debt.balance > 0 && debt.repaymentYears > 0
      ? buildMonthlyDebtSchedule(debt)
      : [];
  const summary = summarizeDebtSchedule(schedule);

  const handleToggle = (v: boolean) => {
    setHasLoan(v);
    if (!v) {
      setDebt(debtKey, { balance: 0, repaymentYears: 0 });
    }
  };

  return (
    <PillToggle
      label={config.label}
      value={hasLoan}
      onChange={handleToggle}
      falseLabel="없어요"
      trueLabel="있어요"
    >
      {/* 대출 상세 입력 필드 */}
      <RepaymentSelect
        value={debt.repaymentType}
        onChange={(t) => setDebt(debtKey, { repaymentType: t })}
        types={config.types}
        termLabels={config.termLabels}
        descriptions={config.descriptions}
      />

      <NumberInput
        label="금액"
        value={debt.balance}
        onChange={(v) => setDebt(debtKey, { balance: v })}
      />
      <RateInput
        label="이자(연)"
        value={debt.interestRate}
        onChange={(v) => setDebt(debtKey, { interestRate: v })}
      />
      <NumberInput
        label="갚는 기간"
        value={debt.repaymentYears}
        onChange={(v) => setDebt(debtKey, { repaymentYears: v })}
        unit="년"
        max={50}
      />

      {/* 상환 미리보기 */}
      {debt.balance > 0 && debt.repaymentYears > 0 && summary.firstMonthPayment > 0 && (
        <div
          style={{
            borderRadius: 10,
            background: 'var(--surface-card-soft)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: 'var(--surface-card-inner)',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            상환 미리보기
          </div>
          <div
            style={{
              padding: '10px 12px 6px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                background: 'var(--surface-card-inner)',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>
                첫 달 상환액
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-base)' }}>
                −{Math.round(summary.firstMonthPayment).toLocaleString('ko-KR')}만원
              </div>
            </div>
            <div
              style={{
                padding: '8px 10px',
                background: 'var(--surface-card-inner)',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>
                첫해 상환액
              </div>
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
    </PillToggle>
  );
}

export default function DebtSection() {
  return (
    <SectionCard title="받은 대출이 있나요?" itemGap={12}>
      <LoanRow debtKey="creditLoan" />
      <LoanRow debtKey="mortgage" />
    </SectionCard>
  );
}
