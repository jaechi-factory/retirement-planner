import type { AgeSnapshotData } from './assetBalanceMetrics';
import { fmtKRW } from '../../utils/format';

// ── 행 컴포넌트 ─────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  unit = '월',
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        color: 'var(--ux-text-base)',
        fontSize: 14,
        lineHeight: 1.7,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--ux-text-subtle)',
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        {label}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>
        {unit} {fmtKRW(Math.round(value))}
      </span>
    </div>
  );
}

function SubDetailRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        color: 'var(--ux-text-subtle)',
        fontSize: 13,
        lineHeight: 1.6,
        paddingLeft: 16,
      }}
    >
      <span>{label}</span>
      <span style={{ whiteSpace: 'nowrap' }}>월 {fmtKRW(Math.round(value))}</span>
    </div>
  );
}

function AssetRow({
  label,
  value,
  dotColor,
  note,
}: {
  label: string;
  value: number;
  dotColor: string;
  note?: string;
}) {
  return (
    <div style={{ marginBottom: note ? 1 : 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          color: 'var(--ux-text-base)',
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          {label}
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>{fmtKRW(Math.round(value))}</span>
      </div>
      {note && (
        <div style={{ fontSize: 14, color: 'var(--ux-text-subtle)', paddingLeft: 11, lineHeight: 1.5, marginBottom: 2 }}>
          {note}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#191f28',
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
        padding: '8px 32px',
      }}
    >
      <span style={{ fontSize: 14, color: 'var(--ux-text-subtle)', fontWeight: 500 }}>{label}</span>
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

  // 금융자산 = 주식·채권 + 집을 판 뒤 굴리는 돈

  return (
    <div
      style={{
        marginTop: 0,
        borderTop: '1px solid var(--ux-border)',
        borderRadius: 0,
        overflow: 'hidden',
        background: 'var(--ux-surface)',
        fontSize: 14,
      }}
    >
      {/* ── 헤더: 나이 + 이벤트 배지 ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 32px',
          borderBottom: '1px solid var(--ux-border)',
          background: 'var(--ux-surface-elevated, var(--ux-surface))',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ux-text-strong)' }}>
          {data.age}세
        </span>
        {data.isRetirementYear && (
          <span style={{ fontSize: 14, color: 'var(--ux-text-subtle)', fontWeight: 600 }}>
            은퇴
          </span>
        )}
        {data.pensionEvents.length > 0 && (
          <span
            style={{
              fontSize: 14,
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

      {/* ── 하단 3묶음 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

        {/* 왼쪽: 수입 구성 + 지출 구성 */}
        <div style={{ padding: '10px 32px', borderRight: '1px solid var(--ux-border)' }}>

          <SectionTitle>수입 구성</SectionTitle>
          {(data.monthlySalary > 0 || data.monthlyPublicPensionRealTodayValue > 0 || data.monthlyRetirementPensionRealTodayValue > 0 || data.monthlyPrivatePensionRealTodayValue > 0 || data.monthlyAssetIncomeRealTodayValue > 0) && (
            <div style={{ fontSize: 13, color: 'var(--ux-text-subtle)', marginBottom: 4, lineHeight: 1.4 }}>
              현재 가치 기준으로 보여줘요
            </div>
          )}
          {data.monthlySalary > 0 && (
            <DetailRow label="근로소득" value={data.monthlySalary} />
          )}
          {data.monthlyPublicPensionRealTodayValue > 0 && (
            <DetailRow label="국민연금" value={data.monthlyPublicPensionRealTodayValue} />
          )}
          {data.monthlyRetirementPensionRealTodayValue > 0 && (
            <DetailRow label="퇴직연금" value={data.monthlyRetirementPensionRealTodayValue} />
          )}
          {data.monthlyPrivatePensionRealTodayValue > 0 && (
            <DetailRow label="개인연금" value={data.monthlyPrivatePensionRealTodayValue} />
          )}
          {data.monthlyAssetIncomeRealTodayValue > 0 && (
            <>
              <DetailRow label="자산 소득" value={data.monthlyAssetIncomeRealTodayValue} />
              {data.monthlyAssetIncomeBreakdown.cash > 0 && (
                <SubDetailRow label="현금" value={data.monthlyAssetIncomeBreakdown.cash} />
              )}
              {data.monthlyAssetIncomeBreakdown.deposit > 0 && (
                <SubDetailRow label="예금·적금" value={data.monthlyAssetIncomeBreakdown.deposit} />
              )}
              {data.monthlyAssetIncomeBreakdown.stock_kr > 0 && (
                <SubDetailRow label="국내 주식" value={data.monthlyAssetIncomeBreakdown.stock_kr} />
              )}
              {data.monthlyAssetIncomeBreakdown.stock_us > 0 && (
                <SubDetailRow label="해외 주식" value={data.monthlyAssetIncomeBreakdown.stock_us} />
              )}
              {data.monthlyAssetIncomeBreakdown.bond > 0 && (
                <SubDetailRow label="채권" value={data.monthlyAssetIncomeBreakdown.bond} />
              )}
              {data.monthlyAssetIncomeBreakdown.crypto > 0 && (
                <SubDetailRow label="암호화폐" value={data.monthlyAssetIncomeBreakdown.crypto} />
              )}
            </>
          )}
          {data.monthlySaleProceedsReturn > 0 && (
            <DetailRow label="매각대금 운용수익" value={data.monthlySaleProceedsReturn} />
          )}

          <div style={{ marginTop: 12 }}>
            <SectionTitle>지출 구성</SectionTitle>
            {data.monthlyRent > 0 && (
              <div style={{ fontSize: 13, color: 'var(--ux-text-subtle)', marginBottom: 4, lineHeight: 1.4 }}>
                집 판매 후, 주거비 월세로 계산
              </div>
            )}
            {data.monthlyLivingExpense > 0 && (
              <DetailRow label="생활비" value={data.monthlyVehicleCost > 0 ? data.monthlyLivingExpense - data.monthlyVehicleCost : data.monthlyLivingExpense} />
            )}
            {data.monthlyVehicleCost > 0 && (
              <DetailRow label="자동차 비용" value={data.monthlyVehicleCost} />
            )}
            {data.monthlyDebtService > 0 && (
              <DetailRow label="부채상환" value={data.monthlyDebtService} />
            )}
            {data.monthlyChildExpense > 0 && (
              <DetailRow label="자녀비" value={data.monthlyChildExpense} />
            )}
            {data.monthlyRent > 0 && (
              <DetailRow label="주거비" value={data.monthlyRent} />
            )}
          </div>
        </div>

        {/* 오른쪽: 자산 구성 */}
        <div style={{ padding: '10px 32px' }}>
          <SectionTitle>자산 구성</SectionTitle>
          {data.monthlyNet < 0 && (
            <div style={{ fontSize: 13, color: 'var(--ux-text-subtle)', marginBottom: 4, lineHeight: 1.4 }}>
              생활비가 부족한 해는 현금 → 예금 → 채권 → 국내주식 → 해외주식 → 암호화폐 순으로 사용돼요. 사용되지 않은 자산은 수익률만큼 계속 불어나요.
            </div>
          )}
          {hasSaleProceeds && data.saleProceedsEnd > 0 && (
            <div style={{ fontSize: 13, color: 'var(--ux-text-subtle)', marginBottom: 4, lineHeight: 1.4 }}>
              주식·채권 · 집을 판 뒤 굴리는 돈 합산
            </div>
          )}
          {hasRealEstate && data.propertyValue > 0 && (
            <AssetRow
              label="집 가치"
              value={data.propertyValue}
              dotColor="#e5a04b"
            />
          )}
          {data.assetBalancesEnd.cash > 0 && (
            <AssetRow label="현금" value={data.assetBalancesEnd.cash} dotColor="#00c471" />
          )}
          {data.assetBalancesEnd.deposit > 0 && (
            <AssetRow label="예금·적금" value={data.assetBalancesEnd.deposit} dotColor="#1b64da" />
          )}
          {data.assetBalancesEnd.stock_kr > 0 && (
            <AssetRow label="국내 주식" value={data.assetBalancesEnd.stock_kr} dotColor="#3182f6" />
          )}
          {data.assetBalancesEnd.stock_us > 0 && (
            <AssetRow label="해외 주식" value={data.assetBalancesEnd.stock_us} dotColor="#6366f1" />
          )}
          {data.assetBalancesEnd.bond > 0 && (
            <AssetRow label="채권" value={data.assetBalancesEnd.bond} dotColor="#8b5cf6" />
          )}
          {data.assetBalancesEnd.crypto > 0 && (
            <AssetRow label="암호화폐" value={data.assetBalancesEnd.crypto} dotColor="#f59e0b" />
          )}
          {hasSaleProceeds && data.saleProceedsEnd > 0 && (
            <AssetRow label="매각대금 운용" value={data.saleProceedsEnd} dotColor="#f97316" />
          )}
        </div>
      </div>
    </div>
  );
}
