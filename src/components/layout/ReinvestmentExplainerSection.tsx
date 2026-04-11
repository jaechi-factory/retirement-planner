import type { PlannerInputs } from '../../types/inputs';
import { calcTotalAsset } from '../../engine/assetWeighting';

interface Props {
  inputs: PlannerInputs;
  annualNetSavings: number; // 연간 저축 여력 (만원)
}

function Divider() {
  return <div style={{ background: '#d9d9d9', height: 1, width: '100%', flexShrink: 0 }} />;
}

export default function ReinvestmentExplainerSection({ inputs, annualNetSavings }: Props) {
  const { status, goal, assets, children } = inputs;

  // ── 월별 수치 계산 ────────────────────────────────────────────────
  const monthlyIncome = Math.round(status.annualIncome / 12);
  const monthlyLiving = goal.targetMonthly > 0 ? goal.targetMonthly : Math.round(status.annualExpense / 12);
  const monthlyChildren =
    children.hasChildren ? Math.round(children.count * children.monthlyPerChild) : 0;
  const monthlySurplus = Math.round(annualNetSavings / 12);

  // 대출 상환 + 차량 비용 = 잔액으로 역산 (항상 표시값 합계가 수입과 일치)
  const monthlyOther = monthlyIncome - monthlyLiving - monthlyChildren - monthlySurplus;

  // ── 자산 비중 계산 ────────────────────────────────────────────────
  const totalFinancial = calcTotalAsset(assets);

  const allocationItems = [
    { label: '현금', amount: assets.cash.amount },
    { label: '예금, 적금', amount: assets.deposit.amount },
    { label: '국내 주식', amount: assets.stock_kr.amount },
    { label: '해외 주식', amount: assets.stock_us.amount },
    { label: '채권', amount: assets.bond.amount },
    { label: '암호화폐', amount: assets.crypto.amount },
  ].filter((item) => item.amount > 0);

  const hasAllocation = totalFinancial > 0 && allocationItems.length > 0;

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
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#191f28',
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>일할 때, 매월 월급에서 남은 돈을 투자 자산의 기존 비율대로</p>
          <p style={{ margin: 0 }}>계속 투자한다고 가정하고, 계산한 결과예요</p>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 400,
            color: '#4e5968',
            fontFamily: 'Pretendard, sans-serif',
            lineHeight: 1.5,
          }}
        >
          남는 돈이 재투자 되고, 설정한 수익률로 복리 효과를 자동으로 계산해요.
        </p>
      </div>

      {/* 두 컬럼 카드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
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
              fontFamily: 'Pretendard, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {monthlySurplus >= 0
              ? `매달 ${monthlySurplus.toLocaleString('ko-KR')}만원이 남아요`
              : `매달 ${Math.abs(monthlySurplus).toLocaleString('ko-KR')}만원이 부족해요`}
          </p>
          <Divider />
          <div style={{ paddingTop: 8 }}>
            <ul
              style={{
                margin: 0,
                paddingLeft: 24,
                fontSize: 16,
                color: '#191f28',
                fontFamily: 'Pretendard, sans-serif',
                lineHeight: 1.6,
              }}
            >
              <li>{`월 수입 : ${monthlyIncome.toLocaleString('ko-KR')}만원`}</li>
              <li>{`월 생활비 : ${monthlyLiving.toLocaleString('ko-KR')}만원`}</li>
              {monthlyChildren > 0 && (
                <li>{`월 자녀 지출 : ${monthlyChildren.toLocaleString('ko-KR')}만원`}</li>
              )}
              {monthlyOther > 0 && (
                <li>{`월 대출·차량 : ${monthlyOther.toLocaleString('ko-KR')}만원`}</li>
              )}
            </ul>
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
              fontFamily: 'Pretendard, sans-serif',
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
                  paddingLeft: 24,
                  fontSize: 16,
                  color: '#191f28',
                  fontFamily: 'Pretendard, sans-serif',
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
                  fontFamily: 'Pretendard, sans-serif',
                  lineHeight: 1.5,
                }}
              >
                자산을 입력하면 비중이 표시돼요
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
