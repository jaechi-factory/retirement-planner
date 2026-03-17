import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import {
  estimatePublicPensionWithMeta,
  getRetirementPensionMeta,
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
  return <div style={{ height: 1, background: 'var(--tds-gray-100)', margin: '10px 0' }} />;
}

function TextBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, color: 'var(--tds-gray-400)',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, textDecoration: 'underline',
      }}
    >
      {children}
    </button>
  );
}

// 자동 추정 배지
function AutoBadge() {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px',
      borderRadius: 20, background: 'var(--tds-blue-50)', color: 'var(--tds-blue-500)',
    }}>
      자동 추정
    </span>
  );
}

// 직접 입력 배지
function ManualBadge() {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px',
      borderRadius: 20, background: 'var(--tds-green-50)', color: 'var(--tds-green-500)',
    }}>
      직접 입력 중
    </span>
  );
}

// ─── 국민연금 카드 ────────────────────────────────────────────────────────────

function PublicPensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [showBasis, setShowBasis] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { publicPension } = inputs.pension;
  const { status, goal } = inputs;

  const meta = estimatePublicPensionWithMeta(status.annualIncome, goal.retirementAge);
  const isAuto = publicPension.mode === 'auto';
  const displayValue = isAuto
    ? meta.base
    : (publicPension.manualMonthlyTodayValue > 0 ? publicPension.manualMonthlyTodayValue : meta.base);

  const switchToManual = () => {
    setPension({ publicPension: { ...publicPension, mode: 'manual' } });
    setShowDetail(true);
  };

  return (
    <div style={cardStyle}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>국민연금</div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>직장 납부 국민연금에서 받는 월연금</div>
        </div>
        {isAuto ? <AutoBadge /> : <ManualBadge />}
      </div>

      {/* 메인 수치 */}
      {isAuto ? (
        <>
          {/* 범위 표시 */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 2px' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-blue-500)' }}>
              월 {meta.base.toLocaleString('ko-KR')}만원
            </span>
          </div>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center', margin: '4px 0 6px',
            fontSize: 11, color: 'var(--tds-gray-400)',
          }}>
            <span>보수적 {meta.conservative.toLocaleString('ko-KR')}만원</span>
            <span style={{ color: 'var(--tds-gray-200)' }}>|</span>
            <span style={{ fontWeight: 600, color: 'var(--tds-blue-500)' }}>기준 {meta.base.toLocaleString('ko-KR')}만원</span>
            <span style={{ color: 'var(--tds-gray-200)' }}>|</span>
            <span>낙관적 {meta.optimistic.toLocaleString('ko-KR')}만원</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
            현재가치 기준 · {publicPension.startAge}세부터 수령 · 실제값은 편차가 클 수 있어요
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-green-500)', margin: '4px 0 2px' }}>
            월 {displayValue.toLocaleString('ko-KR')}만원
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
            직접 입력값 기준 · {publicPension.startAge}세부터 수령
          </div>
        </>
      )}

      {/* 인라인 CTA (자동 추정 상태일 때) */}
      {isAuto && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          background: 'var(--tds-gray-50, #F7F8FA)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--tds-gray-500)' }}>
            공단 예상월액을 알고 있나요?
          </span>
          <button
            onClick={switchToManual}
            style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px',
              background: 'var(--tds-blue-500)', color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
          >
            직접 입력
          </button>
        </div>
      )}

      {/* 하단 링크 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {isAuto && (
          <TextBtn onClick={() => setShowBasis(v => !v)}>
            {showBasis ? '추정 근거 접기 ▴' : '자동 추정 근거 보기 ▾'}
          </TextBtn>
        )}
        <TextBtn onClick={() => setShowDetail(v => !v)}>
          {showDetail ? '접기 ▴' : '설정 더보기 ▾'}
        </TextBtn>
      </div>

      {/* 추정 근거 */}
      {showBasis && isAuto && (
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: 'var(--tds-gray-50, #F7F8FA)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tds-gray-600)', marginBottom: 6 }}>
            이렇게 추정했어요
          </div>
          {meta.assumptions.map((a, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--tds-gray-500)', marginBottom: 3, lineHeight: 1.5 }}>
              · {a}
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--tds-gray-400)', marginTop: 6 }}>
            정확한 수령액은 국민연금공단 홈페이지에서 조회 가능해요
          </div>
        </div>
      )}

      {/* 상세 설정 */}
      {showDetail && (
        <>
          <Divider />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
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
                hint="국민연금공단 조회값 입력"
              />
            )}
          </Row>
        </>
      )}
    </div>
  );
}

// ─── 퇴직연금 카드 ────────────────────────────────────────────────────────────

function RetirementPensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [showBasis, setShowBasis] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { retirementPension } = inputs.pension;
  const { status, goal } = inputs;

  const isAuto = retirementPension.mode === 'auto';
  // store의 startAge를 직접 사용 (setGoal에서 은퇴나이 변경 시 자동 갱신됨)
  const startAge = retirementPension.startAge;

  const autoValue = estimateRetirementPension(retirementPension, status.annualIncome, status.currentAge, goal.retirementAge);
  const displayValue = isAuto
    ? autoValue
    : (retirementPension.manualMonthlyTodayValue > 0 ? retirementPension.manualMonthlyTodayValue : autoValue);

  const meta = getRetirementPensionMeta(retirementPension, status.annualIncome, status.currentAge, goal.retirementAge);

  const hasBalance = retirementPension.currentBalance > 0;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>퇴직연금</div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>회사가 적립한 은퇴자금을 나눠 받는 돈</div>
        </div>
        {isAuto ? <AutoBadge /> : <ManualBadge />}
      </div>

      <div style={{ fontSize: 22, fontWeight: 800, color: isAuto ? 'var(--tds-blue-500)' : 'var(--tds-green-500)', margin: '4px 0 2px' }}>
        월 {displayValue.toLocaleString('ko-KR')}만원
      </div>
      <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
        현재가치 기준 · {startAge}세부터 {retirementPension.payoutYears}년간
        {!hasBalance && isAuto && ' · 적립금 입력 시 더 정확해져요'}
      </div>

      {/* 적립금 CTA */}
      {isAuto && !hasBalance && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          background: 'var(--tds-gray-50, #F7F8FA)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--tds-gray-500)' }}>
            퇴직연금 적립금을 알고 있나요?
          </span>
          <button
            onClick={() => setShowDetail(true)}
            style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px',
              background: 'var(--tds-blue-500)', color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
          >
            입력하기
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {isAuto && (
          <TextBtn onClick={() => setShowBasis(v => !v)}>
            {showBasis ? '추정 근거 접기 ▴' : '자동 추정 근거 보기 ▾'}
          </TextBtn>
        )}
        <TextBtn onClick={() => setShowDetail(v => !v)}>
          {showDetail ? '접기 ▴' : '설정 더보기 ▾'}
        </TextBtn>
      </div>

      {/* 추정 근거 */}
      {showBasis && isAuto && (
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: 'var(--tds-gray-50, #F7F8FA)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tds-gray-600)', marginBottom: 6 }}>
            이렇게 추정했어요
          </div>
          {meta.assumptions.map((a, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--tds-gray-500)', marginBottom: 3, lineHeight: 1.5 }}>
              · {a}
            </div>
          ))}
        </div>
      )}

      {/* 상세 설정 */}
      {showDetail && (
        <>
          <Divider />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
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
                hint="모르면 0으로 두세요"
              />
              <NumberInput
                label="연금 개시 나이"
                value={startAge}
                onChange={v => setPension({ retirementPension: { ...retirementPension, startAge: v } })}
                unit="세"
                hint="최소 55세 이상"
              />
            </Row>
            <Row>
              <NumberInput
                label="수령 기간"
                value={retirementPension.payoutYears}
                onChange={v => setPension({ retirementPension: { ...retirementPension, payoutYears: v } })}
                unit="년"
              />
              <RateInput
                label="적립 수익률"
                value={retirementPension.accumulationReturnRate}
                onChange={v => setPension({ retirementPension: { ...retirementPension, accumulationReturnRate: v } })}
              />
            </Row>
            <Row>
              <RateInput
                label="수령 수익률"
                value={retirementPension.payoutReturnRate}
                onChange={v => setPension({ retirementPension: { ...retirementPension, payoutReturnRate: v } })}
              />
              {!isAuto && (
                <NumberInput
                  label="예상 월수령액 (현재가치)"
                  value={retirementPension.manualMonthlyTodayValue}
                  onChange={v => setPension({ retirementPension: { ...retirementPension, manualMonthlyTodayValue: v } })}
                  unit="만원"
                />
              )}
            </Row>
          </div>
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
  const { status } = inputs;

  const startAge = privatePension.startAge;
  const autoValue = estimatePrivatePension(privatePension, status.currentAge);
  const displayValue = privatePension.mode === 'manual' && privatePension.manualMonthlyTodayValue > 0
    ? privatePension.manualMonthlyTodayValue
    : autoValue;

  const isEnabled = privatePension.enabled;

  return (
    <div style={{ ...cardStyle, opacity: isEnabled ? 1 : 1 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>개인연금</div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>IRP · 연금저축펀드 · 연금보험 등</div>
        </div>
        {/* 활성화 토글 */}
        <div
          onClick={() => setPension({ privatePension: { ...privatePension, enabled: !isEnabled } })}
          style={{
            width: 36, height: 20, borderRadius: 10, flexShrink: 0,
            background: isEnabled ? 'var(--tds-blue-500)' : 'var(--tds-gray-200)',
            position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%', background: 'white',
            position: 'absolute', top: 2,
            left: isEnabled ? 18 : 2, transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>

      {!isEnabled ? (
        /* 미입력 상태 — 유도 문구 */
        <div style={{
          padding: '10px 12px',
          background: 'var(--tds-gray-50, #F7F8FA)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--tds-gray-600)', fontWeight: 600, marginBottom: 4 }}>
            연금저축 · IRP가 있다면 넣어보세요
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', lineHeight: 1.5 }}>
            입력하면 은퇴 후 부족분 계산이 더 정확해져요.<br />
            없거나 잘 모르면 그냥 넘어가도 괜찮아요.
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-blue-500)', margin: '4px 0 2px' }}>
            월 {displayValue.toLocaleString('ko-KR')}만원
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
            현재가치 기준 · {startAge}세부터 {privatePension.payoutYears}년간
          </div>

          <TextBtn onClick={() => setOpen(v => !v)}>
            <span style={{ marginTop: 8, display: 'inline-block' }}>
              {open ? '접기 ▴' : '상세 입력하기 ▾'}
            </span>
          </TextBtn>

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
                    label="수령 시작 나이"
                    value={startAge}
                    onChange={v => setPension({ privatePension: { ...privatePension, startAge: v } })}
                    unit="세"
                  />
                  <NumberInput
                    label="수령 기간"
                    value={privatePension.payoutYears}
                    onChange={v => setPension({ privatePension: { ...privatePension, payoutYears: v } })}
                    unit="년"
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
        모르는 값은 평균 가정으로 추정해요 · 아는 값만 넣으면 더 정확해져요
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PublicPensionCard />
        <RetirementPensionCard />
        <PrivatePensionCard />
      </div>

      <div style={{
        marginTop: 14, padding: '10px 12px',
        background: 'var(--tds-gray-50, #F7F8FA)', borderRadius: 8,
        fontSize: 11, color: 'var(--tds-gray-400)', lineHeight: 1.6,
      }}>
        ⚠️ 정확한 수령액이 아니라 평균 가정 기반 추정치예요. 실제 수령액은 가입기간·적립금·수령 시점 등에 따라 달라질 수 있어요.
      </div>
    </div>
  );
}
