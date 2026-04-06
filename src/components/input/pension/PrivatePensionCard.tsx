import { useState } from 'react';
import { usePlannerStore } from '../../../store/usePlannerStore';
import NumberInput from '../shared/NumberInput';
import RateInput from '../shared/RateInput';
import type { PrivatePensionProduct } from '../../../types/pension';
import {
  estimatePrivatePension,
  estimatePrivatePensionProducts,
} from '../../../engine/pensionEstimation';
import { fmtKRW } from '../../../utils/format';
import { cardStyle } from './shared';
import { Row, TextBtn } from './shared-components';

// ── 상품 카드 (상세 모드) ──────────────────────────────────────────────────────

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-900)' }}>{product.label}</span>
        <button
          onClick={onDelete}
          style={{
            fontSize: 12, color: 'var(--tds-gray-400)', background: 'none',
            border: '1px solid var(--tds-gray-200)', borderRadius: 6, cursor: 'pointer', padding: '2px 8px',
          }}
        >
          삭제
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row>
          <NumberInput label="지금까지 모은 돈" value={product.currentBalance} onChange={v => set({ currentBalance: v })} unit="만원" hint="모르면 0" />
          <NumberInput label="한 달에 넣는 돈" value={product.monthlyContribution} onChange={v => set({ monthlyContribution: v })} unit="만원" />
        </Row>
        <Row>
          <NumberInput label="받기 시작할 나이" value={product.startAge} onChange={v => set({ startAge: v })} unit="세" />
          <NumberInput label="몇 년 동안 받을지" value={product.payoutYears} onChange={v => set({ payoutYears: v })} unit="년" />
        </Row>
        <RateInput label="1년 기대 수익률" value={product.expectedReturnRate} onChange={setRate} hint="모르면 기본값 그대로" />

        <TextBtn onClick={() => setShowAdvanced(v => !v)}>
          {showAdvanced ? '고급 설정 접기 ▴' : '고급 설정 보기 ▾'}
        </TextBtn>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>
              더 자세히 계산하고 싶을 때만 따로 설정해 주세요.
            </div>
            <Row>
              <RateInput label="모으는 동안 수익률" value={product.accumulationReturnRate} onChange={v => set({ accumulationReturnRate: v })} />
              <RateInput label="받는 동안 수익률" value={product.payoutReturnRate} onChange={v => set({ payoutReturnRate: v })} />
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 개인연금 카드 ──────────────────────────────────────────────────────────────

const PRODUCT_LABELS = ['IRP', '연금저축펀드', '연금보험', '기타'] as const;

function makeProduct(
  label: string,
  base: { startAge: number; payoutYears: number; expectedReturnRate: number; accumulationReturnRate: number; payoutReturnRate: number },
): PrivatePensionProduct {
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

export default function PrivatePensionCard() {
  const { inputs, setPension } = usePlannerStore();
  const [showAdvancedRate, setShowAdvancedRate] = useState(false);
  const { privatePension } = inputs.pension;
  const { status } = inputs;

  const isEnabled = privatePension.enabled;
  const isDetailMode = privatePension.detailMode;

  const autoValue = isDetailMode && privatePension.products.length > 0
    ? estimatePrivatePensionProducts(privatePension.products, status.currentAge)
    : estimatePrivatePension(privatePension, status.currentAge);
  const displayValue = privatePension.mode === 'manual' && privatePension.manualMonthlyTodayValue > 0
    ? privatePension.manualMonthlyTodayValue
    : autoValue;

  const upd = (fields: Partial<typeof privatePension>) =>
    setPension({ privatePension: { ...privatePension, ...fields } });

  const setBasicRate = (v: number) => upd({ expectedReturnRate: v, accumulationReturnRate: v, payoutReturnRate: v });
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

  const Header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: isEnabled ? 'var(--tds-gray-900)' : 'var(--tds-gray-400)' }}>
          개인연금
        </div>
        <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginTop: 2 }}>IRP · 연금저축펀드 · 연금보험 등</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: isEnabled ? 'var(--tds-blue-500)' : 'var(--tds-gray-400)' }}>
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
        <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', lineHeight: 1.7 }}>
          개인연금이 있으면 위 토글을 켜서 입력해요.<br />
          없으면 넘어가도 괜찮아요.
        </div>

      ) : isDetailMode ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tds-gray-700)' }}>
              합계 월 {fmtKRW(displayValue)}
            </div>
            <button
              onClick={exitDetailMode}
              style={{
                fontSize: 12, fontWeight: 600, color: 'var(--tds-gray-500)',
                background: 'none', border: '1px solid var(--tds-gray-200)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
              }}
            >
              총합 입력으로
            </button>
          </div>

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

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tds-gray-500)', marginBottom: 6 }}>상품 추가</div>
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
        <>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tds-gray-700)', margin: '4px 0 2px' }}>
            월 {fmtKRW(displayValue)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--tds-gray-400)', marginBottom: 12 }}>
            {privatePension.startAge}세부터 {privatePension.payoutYears}년간 받아요
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row>
              <NumberInput label="지금까지 모은 돈" value={privatePension.currentBalance} onChange={v => upd({ currentBalance: v })} unit="만원" hint="모르면 0" />
              <NumberInput label="한 달에 넣는 돈" value={privatePension.monthlyContribution} onChange={v => upd({ monthlyContribution: v })} unit="만원" />
            </Row>
            <Row>
              <NumberInput label="받기 시작할 나이" value={privatePension.startAge} onChange={v => upd({ startAge: v })} unit="세" />
              <NumberInput label="몇 년 동안 받을지" value={privatePension.payoutYears} onChange={v => upd({ payoutYears: v })} unit="년" />
            </Row>
            <RateInput label="1년 기대 수익률" value={privatePension.expectedReturnRate} onChange={setBasicRate} hint="모르면 기본값 그대로" />
          </div>

          <div style={{ marginTop: 8 }}>
            <TextBtn onClick={() => setShowAdvancedRate(v => !v)}>
              {showAdvancedRate ? '고급 설정 접기 ▴' : '고급 설정 보기 ▾'}
            </TextBtn>
            {showAdvancedRate && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>
                  더 자세히 계산하고 싶을 때만 따로 설정해 주세요.
                </div>
                <Row>
                  <RateInput label="모으는 동안 수익률" value={privatePension.accumulationReturnRate} onChange={v => upd({ accumulationReturnRate: v })} />
                  <RateInput label="받는 동안 수익률" value={privatePension.payoutReturnRate} onChange={v => upd({ payoutReturnRate: v })} />
                </Row>
              </div>
            )}
          </div>

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
