import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import NumberInput from './shared/NumberInput';
import PillToggle from './shared/PillToggle';
import SectionCard from './shared/SectionCard';
import type { PrivatePensionProduct } from '../../types/pension';

// ── 고정 3개 연금 상품 ────────────────────────────────────────
const PENSION_PRODUCTS = [
  { id: 'irp', label: 'IRP' },
  { id: 'pension-savings', label: '연금 저축' },
  { id: 'pension-insurance', label: '연금 보험' },
] as const;

function makeDefaultProduct(id: string, label: string): PrivatePensionProduct {
  return {
    id,
    label,
    currentBalance: 0,
    monthlyContribution: 0,
    startAge: 60,
    payoutYears: 20,
    expectedReturnRate: 3.5,
    accumulationReturnRate: 3.5,
    payoutReturnRate: 3.5,
  };
}

// ── 개별 연금 행 ─────────────────────────────────────────────
function PensionRow({ productId, label }: { productId: string; label: string }) {
  const { inputs, setPension } = usePlannerStore();
  const { privatePension } = inputs.pension;

  const product = privatePension.products.find((p) => p.id === productId)
    ?? makeDefaultProduct(productId, label);

  const hasData = product.currentBalance > 0 || product.monthlyContribution > 0;
  const [hasProduct, setHasProduct] = useState(hasData);

  const saveProducts = (newProducts: PrivatePensionProduct[]) => {
    const anyEnabled = newProducts.some(
      (p) => p.currentBalance > 0 || p.monthlyContribution > 0,
    );
    setPension({
      privatePension: {
        ...privatePension,
        enabled: anyEnabled,
        detailMode: true,
        products: newProducts,
      },
    });
  };

  const updateProduct = (fields: Partial<PrivatePensionProduct>) => {
    const updated = { ...product, ...fields };
    const others = privatePension.products.filter((p) => p.id !== productId);
    saveProducts([...others, updated]);
  };

  const handleToggle = (v: boolean) => {
    setHasProduct(v);
    if (!v) {
      // 제거
      const others = privatePension.products.filter((p) => p.id !== productId);
      const anyEnabled = others.some(
        (p) => p.currentBalance > 0 || p.monthlyContribution > 0,
      );
      setPension({
        privatePension: {
          ...privatePension,
          enabled: anyEnabled,
          products: others,
        },
      });
    } else {
      // 기본값으로 추가
      const fresh = makeDefaultProduct(productId, label);
      const others = privatePension.products.filter((p) => p.id !== productId);
      saveProducts([...others, fresh]);
    }
  };

  // "몇 살까지 받나요?" = startAge + payoutYears
  const endAge = product.startAge + product.payoutYears;

  return (
    <PillToggle
      label={label}
      value={hasProduct}
      onChange={handleToggle}
      falseLabel="없어요"
      trueLabel="있어요"
    >
      <NumberInput
        label="지금까지 쌓인 돈"
        value={product.currentBalance}
        onChange={(v) => updateProduct({ currentBalance: v })}
      />
      <NumberInput
        label="한 달에 얼마나 넣나요?"
        value={product.monthlyContribution}
        onChange={(v) => updateProduct({ monthlyContribution: v })}
      />
      <NumberInput
        label="언제 받기 시작하나요?"
        value={product.startAge}
        onChange={(v) => {
          const newEnd = Math.max(v + 1, endAge);
          updateProduct({ startAge: v, payoutYears: newEnd - v });
        }}
        unit="세"
        min={50}
        max={80}
      />
      <NumberInput
        label="몇 살까지 받나요?"
        value={endAge}
        onChange={(v) => {
          const newPayoutYears = Math.max(1, v - product.startAge);
          updateProduct({ payoutYears: newPayoutYears });
        }}
        unit="세"
        min={product.startAge + 1}
        max={100}
      />
    </PillToggle>
  );
}

// ── 메인 섹션 ─────────────────────────────────────────────────
export default function PensionSection() {
  return (
    <SectionCard
      title="연금"
      subtitle="IRP, 연금저축펀드, 연금보험 정보를 입력해 주세요."
      itemGap={24}
    >
      {PENSION_PRODUCTS.map(({ id, label }) => (
        <PensionRow key={id} productId={id} label={label} />
      ))}
    </SectionCard>
  );
}
