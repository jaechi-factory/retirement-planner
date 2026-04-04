import type { PropertyOptionResult } from '../../types/calculationV2';
import { fmtKRW } from '../../utils/format';

interface PropertyDecisionSectionProps {
  financialExhaustionAge: number;
  propertyOptions: PropertyOptionResult[];  // keep, secured_loan, sell
  lifeExpectancy: number;
  selectedStrategy: 'sell' | 'secured_loan';
}

export default function PropertyDecisionSection({
  financialExhaustionAge,
  propertyOptions,
  lifeExpectancy,
  selectedStrategy,
}: PropertyDecisionSectionProps) {
  const keepOpt = propertyOptions.find((o) => o.strategy === 'keep');
  const loanOpt = propertyOptions.find((o) => o.strategy === 'secured_loan');
  const sellOpt = propertyOptions.find((o) => o.strategy === 'sell');

  function statusLabel(opt: PropertyOptionResult): { text: string; positive: boolean } {
    if (opt.survivesToLifeExpectancy) return { text: `${lifeExpectancy}세까지 가능`, positive: true };
    if (opt.failureAge !== null) return { text: `${opt.failureAge}세부터 부족`, positive: false };
    return { text: '지속 불가', positive: false };
  }

  const badgeStyle = (positive: boolean): React.CSSProperties => ({
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    background: positive ? '#E8F5E9' : '#FFF3E0',
    color: positive ? '#1B7F3A' : '#E65100',
    whiteSpace: 'nowrap',
  });

  const recommendBadge: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 600,
    color: '#1565C0',
    background: '#EBF3FF',
    padding: '1px 6px',
    borderRadius: 4,
    marginLeft: 6,
    verticalAlign: 'middle',
  };

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--tds-gray-100)',
        padding: '20px 24px',
        marginBottom: 16,
      }}
    >
      {/* 소진 맥락 텍스트 */}
      <div style={{ fontSize: 13, color: 'var(--tds-gray-600)', lineHeight: 1.7, marginBottom: 14 }}>
        {financialExhaustionAge}세에 금융자산이 소진돼요. 이후 집을 어떻게 할지에 따라 월 생활비가 달라져요.
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'var(--tds-gray-100)', marginBottom: 14 }} />

      {/* keep 비교 기준 행 */}
      {keepOpt && (
        <>
          <div
            style={{
              background: '#F8F8F8',
              padding: '10px 14px',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--tds-gray-400)' }}>집을 건드리지 않으면</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tds-gray-500)' }}>
                월 {fmtKRW(keepOpt.sustainableMonthly)}
              </span>
              <span style={badgeStyle(statusLabel(keepOpt).positive)}>
                {statusLabel(keepOpt).text}
              </span>
            </div>
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, background: 'var(--tds-gray-100)', marginBottom: 0 }} />
        </>
      )}

      {/* secured_loan 행 */}
      {loanOpt && selectedStrategy === 'secured_loan' && (
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--tds-gray-100)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--tds-gray-700)' }}>집에 살며 현금흐름을 만들면</span>
              {loanOpt.isRecommended && <span style={recommendBadge}>추천</span>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tds-gray-900)', marginTop: 2 }}>
              월 {fmtKRW(loanOpt.sustainableMonthly)}
            </div>
          </div>
          <span style={badgeStyle(statusLabel(loanOpt).positive)}>
            {statusLabel(loanOpt).text}
          </span>
        </div>
      )}

      {/* sell 행 */}
      {sellOpt && selectedStrategy === 'sell' && (
        <div
          style={{
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--tds-gray-700)' }}>집을 팔면</span>
                {sellOpt.isRecommended && <span style={recommendBadge}>추천</span>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tds-gray-900)', marginTop: 2 }}>
                월 {fmtKRW(sellOpt.sustainableMonthly)}
              </div>
            </div>
            <span style={badgeStyle(statusLabel(sellOpt).positive)}>
              {statusLabel(sellOpt).text}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 4 }}>
            단, 이후 월세 약 200만원/월(현재가치·물가연동)이 추가돼요
          </div>
        </div>
      )}

      {/* 하단 주석 */}
      <div style={{ fontSize: 11, color: 'var(--tds-gray-300)', marginTop: 12 }}>
        이 수치는 고정 수익률 가정 기준이에요.
      </div>
    </div>
  );
}
