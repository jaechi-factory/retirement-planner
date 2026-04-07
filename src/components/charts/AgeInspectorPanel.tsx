import type { AgeSnapshotData } from './assetBalanceMetrics';
import { fmtKRW } from '../../utils/format';

interface RowProps {
  label: string;
  value: number;
  indent?: boolean;
  unit?: string;
}

function Row({ label, value, indent = false, unit = '월' }: RowProps) {
  if (value === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        paddingLeft: indent ? 10 : 0,
        color: indent ? 'var(--ux-text-muted)' : 'var(--ux-text-base)',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <span>{label}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{unit} {fmtKRW(Math.round(value))}</span>
    </div>
  );
}

function TotalRow({ label, value, color, unit = '월' }: { label: string; value: number; color?: string; unit?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        fontWeight: 700,
        fontSize: 13,
        color: color ?? 'var(--ux-text-strong)',
        lineHeight: 1.6,
        paddingTop: 4,
        marginTop: 2,
        borderTop: '1px solid var(--ux-border)',
      }}
    >
      <span>{label}</span>
      <span style={{ whiteSpace: 'nowrap' }}>
        {color ? (value >= 0 ? '+' : '-') : ''}{unit} {fmtKRW(Math.round(Math.abs(value)))}
      </span>
    </div>
  );
}

function AssetRow({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        color: 'var(--ux-text-base)',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span
          style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }}
        />
        {label}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{fmtKRW(Math.round(value))}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--ux-text-subtle)',
          marginBottom: 4,
          letterSpacing: '0.03em',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

interface Props {
  data: AgeSnapshotData;
  hasRealEstate: boolean;
  hasSaleProceeds: boolean;
}

export default function AgeInspectorPanel({ data, hasRealEstate, hasSaleProceeds }: Props) {
  const netColor =
    data.monthlyNet >= 0 ? 'var(--ux-status-positive)' : 'var(--ux-status-negative)';

  return (
    <div
      style={{
        marginTop: 12,
        border: '1px solid var(--ux-border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--ux-surface)',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderBottom: '1px solid var(--ux-border)',
          background: 'var(--ux-surface-elevated, var(--ux-surface))',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ux-text-strong)' }}>
          {data.age}세
        </span>
        {data.isRetirementYear && (
          <span style={{ fontSize: 12, color: 'var(--ux-text-subtle)', fontWeight: 600 }}>
            은퇴
          </span>
        )}
        {data.pensionEvents.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--ux-status-positive)', fontWeight: 600, marginLeft: 'auto' }}>
            {data.pensionEvents.map((e) => `${e.name} 수령 시작`).join(' · ')}
          </span>
        )}
      </div>

      {/* 3열 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
        }}
      >
        {/* 수입 내역 */}
        <div style={{ padding: '10px 14px', borderRight: '1px solid var(--ux-border)' }}>
          <Section title="수입 내역">
            <Row label="근로소득" value={data.monthlySalary} />
            <Row label="연금 합계" value={data.monthlyPension} />
            <Row label="국민연금" value={data.monthlyPublicPension} indent />
            <Row label="퇴직연금" value={data.monthlyRetirementPension} indent />
            <Row label="개인연금" value={data.monthlyPrivatePension} indent />
          </Section>
          <TotalRow label="합계" value={data.monthlyIncome} />
        </div>

        {/* 지출 내역 */}
        <div style={{ padding: '10px 14px', borderRight: '1px solid var(--ux-border)' }}>
          <Section title="지출 내역">
            <Row label="생활비" value={data.monthlyLivingExpense} />
            <Row label="부채상환" value={data.monthlyDebtService} />
            <Row label="자녀비" value={data.monthlyChildExpense} />
            <Row label="주거비" value={data.monthlyRent} />
          </Section>
          <TotalRow label="합계" value={data.monthlyOutflow} />
          <TotalRow label="월 잔액" value={data.monthlyNet} color={netColor} />
        </div>

        {/* 자산 내역 (연말 잔고) */}
        <div style={{ padding: '10px 14px' }}>
          <Section title="자산 (연말)">
            <AssetRow label="현금·예금" value={data.cashLike} color="var(--ux-accent)" />
            <AssetRow label="주식·채권" value={data.financialInvestable} color="var(--ux-text-base)" />
            {hasRealEstate && (
              <AssetRow label="집 자산" value={data.propertyValue} color="var(--ux-text-subtle)" />
            )}
            {hasSaleProceeds && (
              <AssetRow label="매각대금 운용" value={data.saleProceedsEnd} color="var(--ux-status-positive)" />
            )}
          </Section>
          <TotalRow label="총 자산" value={data.totalAssets} unit="" />
        </div>
      </div>
    </div>
  );
}
