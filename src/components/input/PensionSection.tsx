import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import {
  estimatePublicPension,
  estimateRetirementPension,
  estimatePrivatePension,
} from '../../engine/pensionEstimation';

// ─── 공통 스타일 ─────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1.5px solid var(--tds-gray-100)',
  borderRadius: 12,
  padding: '14px 16px',
  background: 'var(--tds-white)',
};

const badgeStyle = (isAuto: boolean): React.CSSProperties => ({
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 20,
  background: isAuto ? 'var(--tds-blue-50)' : 'var(--tds-green-50)',
  color: isAuto ? 'var(--tds-blue-500)' : 'var(--tds-green-500)',
});

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 12px',
  borderRadius: 20,
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  background: active ? 'var(--tds-gray-900)' : 'var(--tds-gray-100)',
  color: active ? 'var(--tds-white)' : 'var(--tds-gray-500)',
  transition: 'all 0.15s',
});

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '12px 0' }} />;
}

// ─── 국민연금 카드 ────────────────────────────────────────────────────────────

function PublicPensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [open, setOpen] = useState(false);
  const { publicPension } = inputs.pension;
  const { status, goal } = inputs;

  const autoValue = estimatePublicPension(status.annualIncome, status.currentAge, goal.retirementAge);
  const displayValue = publicPension.mode === 'manual' && publicPension.manualMonthlyTodayValue > 0
    ? publicPension.manualMonthlyTodayValue
    : autoValue;

  const isAuto = publicPension.mode === 'auto';

  return (
    <div style={cardStyle}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>국민연금</div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>직장 납부 국민연금에서 받는 월연금</div>
        </div>
        <span style={badgeStyle(isAuto)}>{isAuto ? '자동 추정' : '직접 입력'}</span>
      </div>

      {/* 추정 월액 */}
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-blue-500)', margin: '4px 0 2px' }}>
        월 {displayValue.toLocaleString('ko-KR')}만원
      </div>
      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
        현재가치 기준 · {publicPension.startAge}세부터 수령
      </div>

      {/* 펼치기 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          marginTop: 10, fontSize: 12, color: 'var(--tds-gray-500)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
        }}
      >
        {open ? '접기' : '더 정확하게 입력하기 ▾'}
      </button>

      {/* 상세 설정 */}
      {open && (
        <>
          <Divider />

          {/* auto / manual 토글 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button style={toggleBtnStyle(isAuto)} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'auto' } })}>
              자동 추정
            </button>
            <button style={toggleBtnStyle(!isAuto)} onClick={() => setPension({ publicPension: { ...publicPension, mode: 'manual' } })}>
              직접 입력
            </button>
          </div>

          <Row>
            <NumberInput
              label="수령 시작 나이"
              value={publicPension.startAge}
              onChange={v => setPension({ publicPension: { ...publicPension, startAge: v } })}
              unit="세"
            />
            {!isAuto && (
              <NumberInput
                label="예상 월수령액 (현재가치)"
                value={publicPension.manualMonthlyTodayValue}
                onChange={v => setPension({ publicPension: { ...publicPension, manualMonthlyTodayValue: v } })}
                unit="만원"
              />
            )}
          </Row>

          <p style={{ fontSize: 11, color: 'var(--tds-gray-400)', margin: '10px 0 0' }}>
            * 세후 소득 기반 평균 가정 추정 · 공식 예상월액은 국민연금공단 홈페이지에서 확인 가능
          </p>
        </>
      )}
    </div>
  );
}

// ─── 퇴직연금 카드 ────────────────────────────────────────────────────────────

function RetirementPensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [open, setOpen] = useState(false);
  const { retirementPension } = inputs.pension;
  const { status, goal } = inputs;

  // 퇴직연금 개시 나이는 max(55, retirementAge) 기준
  const effectiveStartAge = Math.max(55, goal.retirementAge || 60);
  const p = { ...retirementPension, startAge: effectiveStartAge };

  const autoValue = estimateRetirementPension(p, status.annualIncome, status.currentAge, goal.retirementAge);
  const displayValue = retirementPension.mode === 'manual' && retirementPension.manualMonthlyTodayValue > 0
    ? retirementPension.manualMonthlyTodayValue
    : autoValue;

  const isAuto = retirementPension.mode === 'auto';

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>퇴직연금</div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>회사가 적립한 은퇴자금을 나눠 받는 돈</div>
        </div>
        <span style={badgeStyle(isAuto)}>{isAuto ? '자동 추정' : '직접 입력'}</span>
      </div>

      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-blue-500)', margin: '4px 0 2px' }}>
        월 {displayValue.toLocaleString('ko-KR')}만원
      </div>
      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
        현재가치 기준 · {effectiveStartAge}세부터 {retirementPension.payoutYears}년간
      </div>

      <button
        onClick={() => setOpen(v => !v)}
        style={{
          marginTop: 10, fontSize: 12, color: 'var(--tds-gray-500)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
        }}
      >
        {open ? '접기' : '더 정확하게 입력하기 ▾'}
      </button>

      {open && (
        <>
          <Divider />

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button style={toggleBtnStyle(isAuto)} onClick={() => setPension({ retirementPension: { ...retirementPension, mode: 'auto' } })}>
              자동 추정
            </button>
            <button style={toggleBtnStyle(!isAuto)} onClick={() => setPension({ retirementPension: { ...retirementPension, mode: 'manual' } })}>
              직접 입력
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row>
              <NumberInput
                label="현재 퇴직연금 적립금"
                value={retirementPension.currentBalance}
                onChange={v => setPension({ retirementPension: { ...retirementPension, currentBalance: v } })}
                unit="만원"
              />
              <NumberInput
                label="수령 기간"
                value={retirementPension.payoutYears}
                onChange={v => setPension({ retirementPension: { ...retirementPension, payoutYears: v } })}
                unit="년"
              />
            </Row>
            <Row>
              <RateInput
                label="적립 수익률"
                value={retirementPension.accumulationReturnRate}
                onChange={v => setPension({ retirementPension: { ...retirementPension, accumulationReturnRate: v } })}
              />
              <RateInput
                label="수령 수익률"
                value={retirementPension.payoutReturnRate}
                onChange={v => setPension({ retirementPension: { ...retirementPension, payoutReturnRate: v } })}
              />
            </Row>
            {!isAuto && (
              <NumberInput
                label="예상 월수령액 (현재가치)"
                value={retirementPension.manualMonthlyTodayValue}
                onChange={v => setPension({ retirementPension: { ...retirementPension, manualMonthlyTodayValue: v } })}
                unit="만원"
              />
            )}
          </div>

          <p style={{ fontSize: 11, color: 'var(--tds-gray-400)', margin: '10px 0 0' }}>
            * 현재 소득과 적립 가정 기준 추정 · 적립금 입력 시 정확도 상승
          </p>
        </>
      )}
    </div>
  );
}

// ─── 개인연금 카드 ────────────────────────────────────────────────────────────

function PrivatePensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [open, setOpen] = useState(false);
  const { privatePension } = inputs.pension;
  const { status, goal } = inputs;

  const effectiveStartAge = Math.max(55, goal.retirementAge || 60);
  const p = { ...privatePension, startAge: effectiveStartAge };

  const autoValue = estimatePrivatePension(p, status.currentAge);
  const displayValue = privatePension.mode === 'manual' && privatePension.manualMonthlyTodayValue > 0
    ? privatePension.manualMonthlyTodayValue
    : autoValue;

  const isEnabled = privatePension.enabled;

  return (
    <div style={{ ...cardStyle, opacity: isEnabled ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>개인연금</div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>내가 따로 준비한 연금 (IRP·연금저축 등)</div>
        </div>
        {/* 활성화 토글 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <span style={{ fontSize: 11, color: 'var(--tds-gray-500)' }}>{isEnabled ? '반영 중' : '미반영'}</span>
          <div
            onClick={() => setPension({ privatePension: { ...privatePension, enabled: !isEnabled } })}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: isEnabled ? 'var(--tds-blue-500)' : 'var(--tds-gray-200)',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 2,
              left: isEnabled ? 18 : 2,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </label>
      </div>

      {isEnabled ? (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-blue-500)', margin: '4px 0 2px' }}>
            월 {displayValue.toLocaleString('ko-KR')}만원
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
            현재가치 기준 · {effectiveStartAge}세부터 {privatePension.payoutYears}년간
          </div>

          <button
            onClick={() => setOpen(v => !v)}
            style={{
              marginTop: 10, fontSize: 12, color: 'var(--tds-gray-500)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
            }}
          >
            {open ? '접기' : '상세 입력하기 ▾'}
          </button>

          {open && (
            <>
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Row>
                  <NumberInput
                    label="현재 적립금"
                    value={privatePension.currentBalance}
                    onChange={v => setPension({ privatePension: { ...privatePension, currentBalance: v } })}
                    unit="만원"
                  />
                  <NumberInput
                    label="월 납입액"
                    value={privatePension.monthlyContribution}
                    onChange={v => setPension({ privatePension: { ...privatePension, monthlyContribution: v } })}
                    unit="만원"
                  />
                </Row>
                <Row>
                  <NumberInput
                    label="수령 기간"
                    value={privatePension.payoutYears}
                    onChange={v => setPension({ privatePension: { ...privatePension, payoutYears: v } })}
                    unit="년"
                  />
                  <NumberInput
                    label="수령 시작 나이"
                    value={effectiveStartAge}
                    onChange={v => setPension({ privatePension: { ...privatePension, startAge: v } })}
                    unit="세"
                  />
                </Row>
                <Row>
                  <RateInput
                    label="적립 수익률"
                    value={privatePension.accumulationReturnRate}
                    onChange={v => setPension({ privatePension: { ...privatePension, accumulationReturnRate: v } })}
                  />
                  <RateInput
                    label="수령 수익률"
                    value={privatePension.payoutReturnRate}
                    onChange={v => setPension({ privatePension: { ...privatePension, payoutReturnRate: v } })}
                  />
                </Row>
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--tds-gray-400)', marginTop: 4 }}>
          개인연금이 있다면 켜서 입력해보세요 — 결과가 더 정확해져요
        </div>
      )}
    </div>
  );
}

// ─── 섹션 전체 ────────────────────────────────────────────────────────────────

export default function PensionSection() {
  return (
    <div
      style={{
        background: 'var(--tds-white)',
        borderRadius: 16,
        padding: '20px 20px 24px',
        marginBottom: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: 'var(--tds-gray-900)' }}>
        은퇴 후 연금 수입
      </h3>
      <p style={{ fontSize: 12, color: 'var(--tds-gray-400)', margin: '0 0 14px' }}>
        모르는 값은 평균 가정으로 계산해드려요 · 아는 값만 넣으면 더 정확해져요
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PublicPensionCard />
        <RetirementPensionCard />
        <PrivatePensionCard />
      </div>

      {/* 공통 디스클레이머 */}
      <div style={{
        marginTop: 14,
        padding: '10px 12px',
        background: 'var(--tds-gray-50, #F7F8FA)',
        borderRadius: 8,
        fontSize: 11,
        color: 'var(--tds-gray-400)',
        lineHeight: 1.6,
      }}>
        ⚠️ 정확한 수령액이 아니라 평균 가정 기반 추정치예요. 실제 수령액은 가입기간·적립금·수령 시점 등에 따라 달라질 수 있어요.
      </div>
    </div>
  );
}
