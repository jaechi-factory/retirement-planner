import { useState } from 'react';
import type { YearlyAggregateV2 } from '../../../types/calculationV2';

interface Props {
  rows: YearlyAggregateV2[];
  retirementAge: number;
}

export default function YearlySummaryTable({ rows, retirementAge }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  if (rows.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--tds-white)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--tds-gray-100)',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          padding: '16px 18px 12px',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--tds-gray-700)',
          borderBottom: '1px solid var(--tds-gray-100)',
        }}
      >
        연도별 자산 흐름
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--tds-gray-50)', borderBottom: '1px solid var(--tds-gray-100)' }}>
              {['나이', '현금성', '투자자산', '부동산', '부채', '생활비', '이벤트'].map((h) => (
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
                      {row.cashLikeEnd.toLocaleString()}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--tds-gray-700)' }}>
                      {row.financialInvestableEnd.toLocaleString()}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--tds-gray-700)' }}>
                      {row.propertyValueEnd.toLocaleString()}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: row.securedLoanBalanceEnd > 0 ? '#C0392B' : 'var(--tds-gray-700)' }}>
                      {row.securedLoanBalanceEnd > 0 ? `-${row.securedLoanBalanceEnd.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--tds-gray-700)' }}>
                      {Math.round(row.totalExpense / 12).toLocaleString()}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: 11, color: hasShortfall ? '#C0392B' : 'var(--tds-gray-400)' }}>
                      {hasShortfall
                        ? `부족 ${row.totalShortfall.toLocaleString()}만`
                        : row.eventSummary.length > 0
                        ? row.eventSummary[0]
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
                        {m.cashLikeEnd.toLocaleString()}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--tds-gray-600)' }}>
                        {m.financialInvestableEnd.toLocaleString()}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--tds-gray-600)' }}>
                        {m.propertyValueEnd.toLocaleString()}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: m.securedLoanBalanceEnd > 0 ? '#C0392B' : 'var(--tds-gray-400)' }}>
                        {m.securedLoanBalanceEnd > 0 ? `-${m.securedLoanBalanceEnd.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--tds-gray-600)' }}>
                        {m.expenseThisMonth.toLocaleString()}
                      </td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: m.shortfallThisMonth > 0 ? '#C0392B' : 'var(--tds-gray-400)' }}>
                        {m.shortfallThisMonth > 0 ? `부족 ${m.shortfallThisMonth.toLocaleString()}` : ''}
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
