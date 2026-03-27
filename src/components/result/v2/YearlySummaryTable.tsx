import { useState } from 'react';
import type { YearlyAggregateV2 } from '../../../types/calculationV2';
import { fmtKRW } from '../../../utils/format';

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
  strategyLabel: string;
  targetMonthly: number;
}

export default function YearlySummaryTable({ rows, retirementAge, strategyLabel, targetMonthly }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const hasLoanActivity = rows.some((r) => r.securedLoanBalanceEnd > 0);

  if (rows.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--tds-white)',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--tds-gray-100)',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          padding: '16px 18px 12px',
          borderBottom: '1px solid var(--tds-gray-100)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tds-gray-700)' }}>연도별 자산 현황</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--tds-gray-400)' }}>단위: 만원</span>
        </div>
        {/* 표 기준 명시: 어떤 전략 + 어떤 생활비 금액을 가정한 시뮬레이션인지 */}
        <div style={{ fontSize: 11, color: 'var(--tds-gray-400)', marginTop: 4, lineHeight: 1.5 }}>
          월 {targetMonthly}만원 생활 시나리오 ({strategyLabel} 전략 적용)
        </div>
        {/* 명목 기준 안내: 생활비 컬럼이 현재가치 입력값과 다르게 보이는 이유 */}
        <div style={{ fontSize: 10, color: 'var(--tds-gray-300)', marginTop: 2 }}>
          생활비 금액은 물가를 반영한 명목 기준이에요
        </div>
        {/* 집 활용 누적액이 있을 때: 차트와 동일한 용어임을 연결 */}
        {hasLoanActivity && (
          <div style={{ fontSize: 10, color: 'var(--tds-gray-300)', marginTop: 2 }}>
            집 가치 − 집 활용 누적액 = 순주택가치 (위 차트에서 확인)
          </div>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--tds-gray-50)', borderBottom: '1px solid var(--tds-gray-100)' }}>
              {['나이', '현금·예금', '주식·채권', '집 가치', '집 활용 누적액', '연평균 월생활비', '이벤트'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--tds-gray-500)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
              <th style={{ padding: '8px 8px', width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isRetirementYear = row.ageYear === retirementAge;
              const hasShortfall = row.totalShortfall > 0;
              const expanded = expandedYear === row.ageYear;

              return (
                <>
                  <tr
                    key={row.ageYear}
                    onClick={() => setExpandedYear(expanded ? null : row.ageYear)}
                    style={{
                      borderBottom: '1px solid var(--tds-gray-50)',
                      background: hasShortfall ? '#FFF5F5' : isRetirementYear ? '#F0F7FF' : undefined,
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '7px 12px', fontWeight: 700, color: 'var(--tds-gray-800)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {row.ageYear}세
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--tds-gray-700)' }}>
                      {fmtKRW(row.cashLikeEnd)}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--tds-gray-700)' }}>
                      {fmtKRW(row.financialInvestableEnd)}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--tds-gray-700)' }}>
                      {fmtKRW(row.propertyValueEnd)}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: row.securedLoanBalanceEnd > 0 ? '#C0392B' : 'var(--tds-gray-700)' }}>
                      {row.securedLoanBalanceEnd > 0 ? `-${fmtKRW(row.securedLoanBalanceEnd)}` : '-'}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--tds-gray-700)' }}>
                      {fmtKRW(row.totalExpense / 12)}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: 11, color: hasShortfall ? '#C0392B' : 'var(--tds-gray-400)' }}>
                      {hasShortfall
                        ? `부족 ${fmtKRW(row.totalShortfall)}`
                        : row.eventSummary.length > 0
                        ? (row.eventSummary[0] === '주식·채권 팔기 시작'
                            ? '주식·채권 매도 시작 (현금 버퍼 부족)'
                            : row.eventSummary[0])
                        : ''}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', color: 'var(--tds-gray-400)', fontSize: 10 }}>
                      {expanded ? '▲' : '▼'}
                    </td>
                  </tr>
                  {expanded && row.months.map((m) => (
                    <tr
                      key={`${row.ageYear}-${m.ageMonthIndex}`}
                      style={{ background: '#FAFBFF', borderBottom: '1px solid var(--tds-gray-50)' }}
                    >
                      <td style={{ padding: '5px 12px 5px 24px', color: 'var(--tds-gray-400)', whiteSpace: 'nowrap', textAlign: 'right', fontSize: 11 }}>
                        {m.ageMonthIndex + 1}월
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--tds-gray-600)' }}>
                        {fmtKRW(m.cashLikeEnd)}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--tds-gray-600)' }}>
                        {fmtKRW(m.financialInvestableEnd)}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--tds-gray-600)' }}>
                        {fmtKRW(m.propertyValueEnd)}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: m.securedLoanBalanceEnd > 0 ? '#C0392B' : 'var(--tds-gray-400)' }}>
                        {m.securedLoanBalanceEnd > 0 ? `-${fmtKRW(m.securedLoanBalanceEnd)}` : '-'}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--tds-gray-600)' }}>
                        {fmtKRW(m.expenseThisMonth)}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: m.shortfallThisMonth > 0 ? '#C0392B' : 'var(--tds-gray-400)' }}>
                        {m.shortfallThisMonth > 0 ? `부족 ${fmtKRW(m.shortfallThisMonth)}` : ''}
                      </td>
                      <td />
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
