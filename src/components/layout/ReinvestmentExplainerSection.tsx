import type { PlannerInputs } from '../../types/inputs';
import { calcFinancialTotalAsset } from '../../engine/assetWeighting';

interface Props {
  inputs: PlannerInputs;
  annualNetSavings: number; // 연간 저축 여력 (만원)
  monthlyDebt: number;      // 월 대출 상환액 (만원)
  monthlyVehicle: number;   // 월 차량 비용 (만원)
}

function Divider() {
  return <div style={{ background: '#d9d9d9', height: 1, width: '100%', flexShrink: 0 }} />;
}

const textStyle = {
  fontFamily: 'Pretendard, sans-serif',
} as const;

export default function ReinvestmentExplainerSection({ inputs, annualNetSavings, monthlyDebt, monthlyVehicle }: Props) {
  const { status, goal, assets, children } = inputs;

  // ── 월별 수치 계산 ────────────────────────────────────────────────
  const monthlyIncome = Math.round(status.annualIncome / 12);
  const monthlyLiving = goal.targetMonthly > 0 ? goal.targetMonthly : Math.round(status.annualExpense / 12);
  const monthlyChildren =
    children.hasChildren ? Math.round(children.count * children.monthlyPerChild) : 0;
  const monthlySurplus = Math.round(annualNetSavings / 12);
  const isDeficit = monthlySurplus < 0;

  // ── 자산 비중 계산 ────────────────────────────────────────────────
  const totalFinancial = calcFinancialTotalAsset(assets);

  const allocationItems = [
    { label: '현금', amount: assets.cash.amount },
    { label: '예금, 적금', amount: assets.deposit.amount },
    { label: '국내 주식', amount: assets.stock_kr.amount },
    { label: '해외 주식', amount: assets.stock_us.amount },
    { label: '채권', amount: assets.bond.amount },
    { label: '암호화폐', amount: assets.crypto.amount },
  ].filter((item) => item.amount > 0);

  const hasAllocation = totalFinancial > 0 && allocationItems.length > 0;

  // ── 공통 bullet list ─────────────────────────────────────────────
  const BulletList = () => (
    <ul
      style={{
        margin: 0,
        paddingLeft: 20,
        listStyleType: 'disc',
        fontSize: 16,
        color: '#191f28',
        ...textStyle,
        lineHeight: 1.6,
      }}
    >
      <li>{`월 수입 : ${monthlyIncome.toLocaleString('ko-KR')}만원`}</li>
      <li>{`월 생활비 : - ${monthlyLiving.toLocaleString('ko-KR')}만원`}</li>
      {monthlyChildren > 0 && (
        <li>{`월 자녀 지출 : - ${monthlyChildren.toLocaleString('ko-KR')}만원`}</li>
      )}
      {monthlyDebt > 0 && (
        <li>{`월 대출 상환 : - ${monthlyDebt.toLocaleString('ko-KR')}만원`}</li>
      )}
      {monthlyVehicle > 0 && (
        <li>{`월 차량 비용 : - ${monthlyVehicle.toLocaleString('ko-KR')}만원`}</li>
      )}
    </ul>
  );

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 32,
        padding: '28px 32px',
        boxShadow: '0px 2px 8px 4px rgba(121,158,195,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* 제목 + 설명 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isDeficit ? (
          <>
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#191f28',
                ...textStyle,
                lineHeight: 1.5,
              }}
            >
              현재 수입으로는 생활비와 차량비, 대출 상환을 감당하기 어려워요.
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 400,
                color: '#4e5968',
                ...textStyle,
                lineHeight: 1.5,
              }}
            >
              {`매월 ${Math.abs(monthlySurplus).toLocaleString('ko-KR')}만원이 부족해요. 지출을 줄여주세요.`}
            </p>
          </>
        ) : (
          <>
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#191f28',
                ...textStyle,
                lineHeight: 1.5,
              }}
            >
              월급에서 남은 돈은 기존 투자 비율대로 계속 투자한다고 가정했어요
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 400,
                color: '#4e5968',
                ...textStyle,
                lineHeight: 1.5,
              }}
            >
              남은 돈은 부동산을 제외한 투자 자산 비중대로, 매월 다시 투자되는 것으로 계산돼요.
            </p>
          </>
        )}
      </div>

      {/* 카드 영역 */}
      {isDeficit ? (
        /* 부정: 왼쪽 카드만 (빨간 배경) */
        <div
          style={{
            background: '#ffeeee',
            borderRadius: 20,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#f04452',
              ...textStyle,
              lineHeight: 1.5,
            }}
          >
            {`매달 ${Math.abs(monthlySurplus).toLocaleString('ko-KR')}만원이 부족해요`}
          </p>
          <Divider />
          <div style={{ paddingTop: 8 }}>
            <BulletList />
          </div>
        </div>
      ) : (
        /* 긍정: 두 컬럼 */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* 왼쪽: 월 남는 돈 */}
          <div
            style={{
              background: '#f2f4f6',
              borderRadius: 20,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#191f28',
                ...textStyle,
                lineHeight: 1.5,
              }}
            >
              {`매달 ${monthlySurplus.toLocaleString('ko-KR')}만원이 남아요`}
            </p>
            <Divider />
            <div style={{ paddingTop: 8 }}>
              <BulletList />
            </div>
          </div>

          {/* 오른쪽: 자산 비중 */}
          <div
            style={{
              background: '#f0faf6',
              borderRadius: 20,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#191f28',
                ...textStyle,
                lineHeight: 1.5,
              }}
            >
              남은 돈을 이 비중대로 투자해요
            </p>
            <Divider />
            <div style={{ paddingTop: 8 }}>
              {hasAllocation ? (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    listStyleType: 'disc',
                    fontSize: 16,
                    color: '#191f28',
                    ...textStyle,
                    lineHeight: 1.6,
                  }}
                >
                  {allocationItems.map(({ label, amount }) => (
                    <li key={label}>
                      {`${label} : ${Math.round((amount / totalFinancial) * 100)}%`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: '#8b95a1',
                    ...textStyle,
                    lineHeight: 1.5,
                  }}
                >
                  자산을 입력하면 비중이 표시돼요
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
