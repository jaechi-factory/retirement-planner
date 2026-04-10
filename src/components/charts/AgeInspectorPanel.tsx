import type { AgeSnapshotData } from './assetBalanceMetrics';
import { fmtKRW } from '../../utils/format';

// ── 공통 행 컴포넌트 ─────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  indent = false,
  unit = '월',
}: {
  label: string;
  value: number;
  indent?: boolean;
  unit?: string;
}) {
  const isEmpty = value === 0;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        paddingLeft: indent ? 10 : 0,
        color: isEmpty
          ? 'var(--ux-text-disabled, #bbb)'
          : indent
          ? 'var(--ux-text-subtle)'
          : 'var(--ux-text-base)',
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      <span>{label}</span>
      <span style={{ whiteSpace: 'nowrap' }}>
        {unit} {fmtKRW(Math.round(value))}
      </span>
    </div>
  );
}

function AssetRow({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: number;
  dotColor: string;
}) {
  const isEmpty = value === 0;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        color: isEmpty ? 'var(--ux-text-disabled, #bbb)' : 'var(--ux-text-base)',
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isEmpty ? 'var(--ux-text-disabled, #bbb)' : dotColor,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        {label}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{fmtKRW(Math.round(value))}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--ux-text-subtle)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

// ── 상단 요약 셀 ─────────────────────────────────────────────────────────────

function SummaryCell({
  label,
  value,
  color,
  prefix = '',
  unit = '월 ',
}: {
  label: string;
  value: number;
  color?: string;
  prefix?: string;
  unit?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '8px 12px',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--ux-text-subtle)', fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: color ?? 'var(--ux-text-strong)',
          whiteSpace: 'nowrap',
        }}
      >
        {prefix}{unit}{fmtKRW(Math.round(Math.abs(value)))}
      </span>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface Props {
  data: AgeSnapshotData;
  hasRealEstate: boolean;
  hasSaleProceeds: boolean;
}

export default function AgeInspectorPanel({ data, hasRealEstate, hasSaleProceeds }: Props) {
  const netColor =
    data.monthlyNet >= 0 ? 'var(--ux-status-positive)' : 'var(--ux-status-negative)';
  const netPrefix = data.monthlyNet >= 0 ? '+' : '-';

  return (
    <div
      style={{
        marginTop: 12,
        border: '1px solid var(--ux-border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--ux-surface)',
        fontSize: 13,
      }}
    >
      {/* ── 헤더: 나이 + 이벤트 ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 14px',
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
          <span
            style={{
              fontSize: 12,
              color: 'var(--ux-status-positive)',
              fontWeight: 600,
              marginLeft: 'auto',
            }}
          >
            {data.pensionEvents.map((e) => `${e.name} 수령 시작`).join(' · ')}
          </span>
        )}
      </div>

      {/* ── 상단 요약 4칸 ── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--ux-border)',
        }}
      >
        <SummaryCell label="수입" value={data.monthlyIncome} />
        <div style={{ width: 1, background: 'var(--ux-border)' }} />
        <SummaryCell label="지출" value={data.monthlyOutflow} />
        <div style={{ width: 1, background: 'var(--ux-border)' }} />
        <SummaryCell
          label="월 잔액"
          value={data.monthlyNet}
          color={netColor}
          prefix={netPrefix}
        />
        <div style={{ width: 1, background: 'var(--ux-border)' }} />
        <SummaryCell label="총 자산" value={data.totalAssets} unit="" />
      </div>

      {/* ── 하단 2열 상세 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

        {/* 왼쪽: 수입 내역 + 지출 내역 */}
        <div style={{ padding: '10px 14px', borderRight: '1px solid var(--ux-border)' }}>
          <SectionTitle>수입 내역</SectionTitle>
          <div style={{ fontSize: 11, color: 'var(--ux-text-subtle)', marginBottom: 4 }}>
            연금은 해당 나이 기준 명목금액과 오늘 가치 환산을 함께 보여줘요
          </div>
          <DetailRow label="근로소득" value={data.monthlySalary} />
          <DetailRow label="연금 합계 (명목)" value={data.monthlyPension} />
          <DetailRow label="국민연금 (명목)" value={data.monthlyPublicPension} indent />
          <DetailRow label="국민연금 (오늘 가치)" value={data.monthlyPublicPensionRealTodayValue} indent />
          <DetailRow label="퇴직연금 (명목)" value={data.monthlyRetirementPension} indent />
          <DetailRow label="퇴직연금 (오늘 가치)" value={data.monthlyRetirementPensionRealTodayValue} indent />
          <DetailRow label="개인연금 (명목)" value={data.monthlyPrivatePension} indent />
          <DetailRow label="개인연금 (오늘 가치)" value={data.monthlyPrivatePensionRealTodayValue} indent />

          <div style={{ marginTop: 12 }}>
            <SectionTitle>지출 내역</SectionTitle>
            <DetailRow label="생활비" value={data.monthlyLivingExpense} />
            <DetailRow label="부채상환" value={data.monthlyDebtService} />
            <DetailRow label="자녀비" value={data.monthlyChildExpense} />
            <DetailRow label="주거비" value={data.monthlyRent} />
          </div>
        </div>

        {/* 오른쪽: 자산 내역 + 연금 이벤트 */}
        <div style={{ padding: '10px 14px' }}>
          <SectionTitle>자산 (연말 잔고)</SectionTitle>
          <AssetRow label="현금·예금" value={data.cashLike} dotColor="var(--ux-accent)" />
          <AssetRow label="주식·채권" value={data.financialInvestable} dotColor="var(--ux-text-base)" />
          {hasRealEstate && (
            <AssetRow label="집 자산" value={data.propertyValue} dotColor="var(--ux-text-subtle)" />
          )}
          {hasSaleProceeds && (
            <AssetRow
              label="매각대금 운용"
              value={data.saleProceedsEnd}
              dotColor="var(--ux-status-positive)"
            />
          )}

          {data.pensionEvents.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <SectionTitle>이벤트</SectionTitle>
              {data.pensionEvents.map((e, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13,
                    color: 'var(--ux-status-positive)',
                    fontWeight: 600,
                    lineHeight: 1.7,
                  }}
                >
                  {e.name} 수령 시작 · 월 {fmtKRW(e.monthly)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
