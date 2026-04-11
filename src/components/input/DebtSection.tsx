import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { RepaymentType } from '../../types/inputs';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import SectionCard from './shared/SectionCard';
import {
  MORTGAGE_REPAYMENT_TYPES,
  MORTGAGE_REPAYMENT_FRIENDLY_LABELS,
  MORTGAGE_REPAYMENT_DESCRIPTIONS,
  OTHER_REPAYMENT_TYPES,
  OTHER_REPAYMENT_FRIENDLY_LABELS,
  OTHER_REPAYMENT_DESCRIPTIONS,
} from '../../utils/constants';
import { buildMonthlyDebtSchedule, summarizeDebtSchedule } from '../../engine/debtSchedule';

type DebtKey = 'mortgage' | 'creditLoan';

const DEBT_CONFIG: Record<DebtKey, {
  label: string;
  types: readonly string[];
  friendlyLabels: Record<string, string>;
  descriptions: Record<string, string>;
}> = {
  mortgage: {
    label: '주택담보대출',
    types: MORTGAGE_REPAYMENT_TYPES,
    friendlyLabels: MORTGAGE_REPAYMENT_FRIENDLY_LABELS,
    descriptions: MORTGAGE_REPAYMENT_DESCRIPTIONS,
  },
  creditLoan: {
    label: '신용대출',
    types: OTHER_REPAYMENT_TYPES,
    friendlyLabels: OTHER_REPAYMENT_FRIENDLY_LABELS,
    descriptions: OTHER_REPAYMENT_DESCRIPTIONS,
  },
};

/** 행별 없어요/있어요 pill */
function LoanPillToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const pills = [
    { value: false, label: '없어요' },
    { value: true, label: '있어요' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {pills.map((pill) => {
        const selected = value === pill.value;
        return (
          <button
            key={String(pill.value)}
            onClick={() => onChange(pill.value)}
            style={{
              width: 63,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: selected ? '#333d4b' : 'rgba(112,115,124,0.08)',
              color: selected ? '#ffffff' : 'rgba(46,47,51,0.88)',
              fontSize: 14,
              fontWeight: selected ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'Pretendard, sans-serif',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}

/** 상환방식 셀렉트박스 */
function RepaymentSelect({
  value,
  onChange,
  types,
  friendlyLabels,
  descriptions,
}: {
  value: RepaymentType;
  onChange: (t: RepaymentType) => void;
  types: readonly string[];
  friendlyLabels: Record<string, string>;
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
          border: '2px solid #191f28',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          cursor: 'pointer',
          background: '#ffffff',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: '#191f28' }}>
          {friendlyLabels[value]}
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
            stroke="#191f28"
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
                background: value === type ? 'rgba(248,205,51,0.12)' : '#ffffff',
                borderBottom: i < types.length - 1 ? '1px solid rgba(36,39,46,0.06)' : 'none',
                fontSize: 14,
                fontWeight: value === type ? 600 : 400,
                color: '#191f28',
              }}
            >
              {friendlyLabels[type]}
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

/** 대출 행 카드 */
function LoanRow({ debtKey }: { debtKey: DebtKey }) {
  const { inputs, setDebt } = usePlannerStore();
  const [hasLoan, setHasLoan] = useState(false);

  const config = DEBT_CONFIG[debtKey];
  const debt = inputs.debts[debtKey];

  const schedule =
    hasLoan && debt.balance > 0 && debt.repaymentYears > 0
      ? buildMonthlyDebtSchedule(debt)
      : [];
  const summary = summarizeDebtSchedule(schedule);

  const handleToggle = (v: boolean) => {
    setHasLoan(v);
    // 없어요로 바꾸면 잔액 초기화 (계산에서 제외)
    if (!v) {
      setDebt(debtKey, { balance: 0, repaymentYears: 0 });
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 헤더 행 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#191f28' }}>{config.label}</span>
        <LoanPillToggle value={hasLoan} onChange={handleToggle} />
      </div>

      {/* 펼쳐진 컨텐츠 */}
      {hasLoan && (
        <>
          {/* 구분선 */}
          <div style={{ height: 1, background: '#d9d9d9', margin: '12px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 상환방식 셀렉트 */}
            <RepaymentSelect
              value={debt.repaymentType}
              onChange={(t) => setDebt(debtKey, { repaymentType: t })}
              types={config.types}
              friendlyLabels={config.friendlyLabels}
              descriptions={config.descriptions}
            />

            {/* 금액 */}
            <NumberInput
              label="금액"
              value={debt.balance}
              onChange={(v) => setDebt(debtKey, { balance: v })}
            />

            {/* 이자(연) */}
            <RateInput
              label="이자(연)"
              value={debt.interestRate}
              onChange={(v) => setDebt(debtKey, { interestRate: v })}
            />

            {/* 갚는 기간 */}
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
          </div>
        </>
      )}
    </div>
  );
}

export default function DebtSection() {
  return (
    <SectionCard title="받은 대출이 있나요?">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <LoanRow debtKey="mortgage" />
        <LoanRow debtKey="creditLoan" />
      </div>
    </SectionCard>
  );
}
