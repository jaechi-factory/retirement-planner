import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import RateInput from './shared/RateInput';
import type { PrivatePensionProduct } from '../../types/pension';
import {
  estimatePublicPensionWithMeta,
  getRetirementPensionMeta,
  estimateRetirementPension,
  estimatePrivatePension,
  estimatePrivatePensionProducts,
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

// 상한 적용 배지
function CappedBadge() {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 7px',
      borderRadius: 20, background: 'var(--tds-orange-50, #FFF4EC)', color: 'var(--tds-orange-500)',
    }}>
      상한 적용됨
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

  const meta = estimatePublicPensionWithMeta(status.annualIncome, status.currentAge, goal.retirementAge);
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
          {meta.cappedByIncomeCeiling ? (
            /* 소득 상한 도달 시: 단일 수치 */
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 8, margin: '6px 0 8px',
              background: 'var(--tds-blue-50)',
            }}>
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tds-blue-500)' }}>
                  월 {meta.base.toLocaleString('ko-KR')}만원
                </span>
                <div style={{ fontSize: 10, color: 'var(--tds-blue-400)', marginTop: 2 }}>
                  소득 상한({meta.pensionableMonthly.toLocaleString('ko-KR')}만원) 기준
                </div>
              </div>
              <CappedBadge />
            </div>
          ) : (
            /* 소득 상한 미도달 시: 보수적/중립적/낙관적 범위 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '6px 0 8px' }}>
              {[
                { label: '보수적', value: meta.conservative, isMain: false },
                { label: '중립적', value: meta.base, isMain: true },
                { label: '낙관적', value: meta.optimistic, isMain: false },
              ].map(({ label, value, isMain }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 8,
                  background: isMain ? 'var(--tds-blue-50)' : 'transparent',
                }}>
                  <span style={{
                    fontSize: 12, fontWeight: isMain ? 700 : 500,
                    color: isMain ? 'var(--tds-blue-500)' : 'var(--tds-gray-400)',
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: isMain ? 18 : 14, fontWeight: isMain ? 800 : 600,
                    color: isMain ? 'var(--tds-blue-500)' : 'var(--tds-gray-500)',
                  }}>
                    월 {value.toLocaleString('ko-KR')}만원
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
            {publicPension.startAge}세부터 수령 · 실제값은 편차가 클 수 있어요
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-green-500)', margin: '4px 0 2px' }}>
            월 {displayValue.toLocaleString('ko-KR')}만원
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
            {publicPension.startAge}세부터 수령
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
            {showBasis ? '접기 ▴' : '왜 이렇게 계산됐나요? ▾'}
          </TextBtn>
        )}
        <TextBtn onClick={() => setShowDetail(v => !v)}>
          {showDetail ? '접기 ▴' : '더 정확하게 계산하기 ▾'}
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
            * 연소득은 세후 입력값을 세전 기준으로 역산해 추정해요<br />
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
                label="예상 월수령액"
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
        {startAge}세부터 {retirementPension.payoutYears}년간 수령
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
            {showBasis ? '접기 ▴' : '왜 이렇게 계산됐나요? ▾'}
          </TextBtn>
        )}
        <TextBtn onClick={() => setShowDetail(v => !v)}>
          {showDetail ? '접기 ▴' : '더 정확하게 계산하기 ▾'}
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
                  label="예상 월수령액"
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

// ─── 개인연금 상품 카드 (상세 모드) ──────────────────────────────────────────

function PrivatePensionProductCard({
  product,
  onUpdate,
  onDelete,
}: {
  product: PrivatePensionProduct;
  onUpdate: (updated: PrivatePensionProduct) => void;
  onDelete: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (fields: Partial<PrivatePensionProduct>) => onUpdate({ ...product, ...fields });
  const setRate = (v: number) => onUpdate({
    ...product,
    expectedReturnRate: v,
    accumulationReturnRate: v,
    payoutReturnRate: v,
  });

  return (
    <div style={{
      border: '1.5px solid var(--tds-gray-100)',
      borderRadius: 10,
      padding: '12px 14px',
      background: 'var(--tds-white)',
    }}>
      {/* 상품 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>{product.label}</span>
        <button
          onClick={onDelete}
          style={{
            fontSize: 11, color: 'var(--tds-gray-400)', background: 'none',
            border: '1px solid var(--tds-gray-200)', borderRadius: 6, cursor: 'pointer', padding: '2px 8px',
          }}
        >
          삭제
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row>
          <NumberInput
            label="현재 적립금"
            value={product.currentBalance}
            onChange={v => set({ currentBalance: v })}
            unit="만원"
            hint="모르면 0"
          />
          <NumberInput
            label="월 납입액"
            value={product.monthlyContribution}
            onChange={v => set({ monthlyContribution: v })}
            unit="만원"
          />
        </Row>
        <Row>
          <NumberInput
            label="수령 시작 나이"
            value={product.startAge}
            onChange={v => set({ startAge: v })}
            unit="세"
          />
          <NumberInput
            label="수령 기간"
            value={product.payoutYears}
            onChange={v => set({ payoutYears: v })}
            unit="년"
          />
        </Row>
        <RateInput
          label="예상 수익률"
          value={product.expectedReturnRate}
          onChange={setRate}
          hint="모르면 기본값 그대로"
        />

        <TextBtn onClick={() => setShowAdvanced(v => !v)}>
          {showAdvanced ? '고급 설정 접기 ▴' : '고급 설정 보기 ▾'}
        </TextBtn>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
              더 자세히 계산하고 싶을 때만 따로 설정해 주세요.
            </div>
            <Row>
              <RateInput
                label="모으는 동안 수익률"
                value={product.accumulationReturnRate}
                onChange={v => set({ accumulationReturnRate: v })}
              />
              <RateInput
                label="받는 동안 수익률"
                value={product.payoutReturnRate}
                onChange={v => set({ payoutReturnRate: v })}
              />
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 개인연금 카드 ────────────────────────────────────────────────────────────

const PRODUCT_LABELS = ['IRP', '연금저축펀드', '연금보험', '기타'] as const;

function makeProduct(label: string, base: { startAge: number; payoutYears: number; expectedReturnRate: number; accumulationReturnRate: number; payoutReturnRate: number }): PrivatePensionProduct {
  return {
    id: `${Date.now()}-${Math.random()}`,
    label,
    currentBalance: 0,
    monthlyContribution: 0,
    startAge: base.startAge,
    payoutYears: base.payoutYears,
    expectedReturnRate: base.expectedReturnRate,
    accumulationReturnRate: base.accumulationReturnRate,
    payoutReturnRate: base.payoutReturnRate,
  };
}

function PrivatePensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [showAdvancedRate, setShowAdvancedRate] = useState(false);
  const { privatePension } = inputs.pension;
  const { status } = inputs;

  const isEnabled = privatePension.enabled;
  const isDetailMode = privatePension.detailMode;

  // 표시값 계산
  const autoValue = isDetailMode && privatePension.products.length > 0
    ? estimatePrivatePensionProducts(privatePension.products, status.currentAge)
    : estimatePrivatePension(privatePension, status.currentAge);
  const displayValue = privatePension.mode === 'manual' && privatePension.manualMonthlyTodayValue > 0
    ? privatePension.manualMonthlyTodayValue
    : autoValue;

  const upd = (fields: Partial<typeof privatePension>) =>
    setPension({ privatePension: { ...privatePension, ...fields } });

  const setBasicRate = (v: number) => upd({
    expectedReturnRate: v,
    accumulationReturnRate: v,
    payoutReturnRate: v,
  });

  const enterDetailMode = () => {
    const initialProducts = privatePension.products.length > 0
      ? privatePension.products
      : [makeProduct('개인연금', privatePension)];
    upd({ detailMode: true, products: initialProducts });
  };

  const exitDetailMode = () => upd({ detailMode: false });

  const addProduct = (label: string) =>
    upd({ products: [...privatePension.products, makeProduct(label, privatePension)] });

  const updateProduct = (id: string, updated: PrivatePensionProduct) =>
    upd({ products: privatePension.products.map(p => p.id === id ? updated : p) });

  const deleteProduct = (id: string) =>
    upd({ products: privatePension.products.filter(p => p.id !== id) });

  // ── 공통 헤더 (토글 포함) ─────────────────────────────────────────────────
  const Header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: isEnabled ? 'var(--tds-gray-900)' : 'var(--tds-gray-400)' }}>
          개인연금
        </div>
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 2 }}>IRP · 연금저축펀드 · 연금보험 등</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: isEnabled ? 'var(--tds-blue-500)' : 'var(--tds-gray-400)' }}>
          {isEnabled ? '켜짐' : '꺼짐'}
        </span>
        <div
          onClick={() => upd({ enabled: !isEnabled })}
          style={{
            width: 40, height: 22, borderRadius: 11, flexShrink: 0,
            background: isEnabled ? 'var(--tds-blue-500)' : 'var(--tds-gray-300)',
            position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            boxShadow: isEnabled ? '0 0 0 2px var(--tds-blue-50)' : 'none',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: 'white',
            position: 'absolute', top: 2,
            left: isEnabled ? 20 : 2, transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ ...cardStyle, background: isEnabled ? 'var(--tds-white)' : 'var(--tds-gray-50, #F7F8FA)' }}>
      {Header}

      {!isEnabled ? (
        // ── Off 상태 ────────────────────────────────────────────────────────
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', lineHeight: 1.7 }}>
          IRP · 연금저축이 있으면 위 토글을 켜서 입력해보세요.<br />
          없거나 모르면 그냥 넘어가도 돼요.
        </div>

      ) : isDetailMode ? (
        // ── 상세 모드 (다중 상품) ─────────────────────────────────────────
        <>
          {/* 총합 표시 + 되돌아가기 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tds-blue-500)' }}>
              합계 월 {displayValue.toLocaleString('ko-KR')}만원
            </div>
            <button
              onClick={exitDetailMode}
              style={{
                fontSize: 11, fontWeight: 600, color: 'var(--tds-gray-500)',
                background: 'none', border: '1px solid var(--tds-gray-200)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
              }}
            >
              총합 입력으로
            </button>
          </div>

          {/* 상품 카드 목록 */}
          {privatePension.products.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginBottom: 12 }}>
              아래에서 상품을 추가해 주세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {privatePension.products.map(product => (
                <PrivatePensionProductCard
                  key={product.id}
                  product={product}
                  onUpdate={updated => updateProduct(product.id, updated)}
                  onDelete={() => deleteProduct(product.id)}
                />
              ))}
            </div>
          )}

          {/* 상품 추가 버튼 */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tds-gray-500)', marginBottom: 6 }}>
            상품 추가
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRODUCT_LABELS.map(label => (
              <button
                key={label}
                onClick={() => addProduct(label)}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 12px',
                  border: '1.5px solid var(--tds-gray-200)', borderRadius: 20,
                  background: 'var(--tds-white)', color: 'var(--tds-gray-700)', cursor: 'pointer',
                }}
              >
                + {label}
              </button>
            ))}
          </div>
        </>

      ) : (
        // ── 기본 모드 (총합 1개 입력) ────────────────────────────────────
        <>
          {/* 예상 연금액 */}
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tds-blue-500)', margin: '4px 0 2px' }}>
            월 {displayValue.toLocaleString('ko-KR')}만원
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginBottom: 12 }}>
            {privatePension.startAge}세부터 {privatePension.payoutYears}년간 수령
          </div>

          {/* 기본 입력 필드 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row>
              <NumberInput
                label="현재 적립금"
                value={privatePension.currentBalance}
                onChange={v => upd({ currentBalance: v })}
                unit="만원"
                hint="모르면 0"
              />
              <NumberInput
                label="월 납입액"
                value={privatePension.monthlyContribution}
                onChange={v => upd({ monthlyContribution: v })}
                unit="만원"
              />
            </Row>
            <Row>
              <NumberInput
                label="수령 시작 나이"
                value={privatePension.startAge}
                onChange={v => upd({ startAge: v })}
                unit="세"
              />
              <NumberInput
                label="수령 기간"
                value={privatePension.payoutYears}
                onChange={v => upd({ payoutYears: v })}
                unit="년"
              />
            </Row>
            <RateInput
              label="예상 수익률"
              value={privatePension.expectedReturnRate}
              onChange={setBasicRate}
              hint="모르면 기본값 그대로"
            />
          </div>

          {/* 고급 설정 (수익률 2개) */}
          <div style={{ marginTop: 8 }}>
            <TextBtn onClick={() => setShowAdvancedRate(v => !v)}>
              {showAdvancedRate ? '고급 설정 접기 ▴' : '고급 설정 보기 ▾'}
            </TextBtn>
            {showAdvancedRate && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--tds-gray-400)' }}>
                  더 자세히 계산하고 싶을 때만 따로 설정해 주세요.
                </div>
                <Row>
                  <RateInput
                    label="모으는 동안 수익률"
                    value={privatePension.accumulationReturnRate}
                    onChange={v => upd({ accumulationReturnRate: v })}
                  />
                  <RateInput
                    label="받는 동안 수익률"
                    value={privatePension.payoutReturnRate}
                    onChange={v => upd({ payoutReturnRate: v })}
                  />
                </Row>
              </div>
            )}
          </div>

          {/* 상세 모드 진입 CTA */}
          <button
            onClick={enterDetailMode}
            style={{
              marginTop: 12, width: '100%', fontSize: 12, fontWeight: 600,
              color: 'var(--tds-blue-500)', background: 'var(--tds-blue-50)',
              border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer',
            }}
          >
            여러 상품으로 나눠 입력하기 →
          </button>
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
