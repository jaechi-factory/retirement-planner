import type { CalculationResult } from '../../types/calculation';
import type { PlannerInputs } from '../../types/inputs';
import type { Verdict } from '../../types/calculation';
import { formatEok } from '../../utils/format';

interface Props {
  result: CalculationResult;
  inputs: PlannerInputs;
  verdict: Verdict;
}

export default function InsightSentences({ result, inputs, verdict }: Props) {
  const { goal, status, children } = inputs;
  const { netWorth, annualNetSavings, annualChildExpense, weightedReturn } = result;

  const insights: string[] = [];

  insights.push(
    `현재 자산과 부채를 반영한 순자산은 ${formatEok(netWorth)}이에요.`
  );

  if (weightedReturn > 0) {
    insights.push(
      `보유 자산의 기대수익률은 연 ${weightedReturn.toFixed(1)}%예요.`
    );
  }

  if (annualNetSavings > 0) {
    insights.push(
      `매년 약 ${formatEok(annualNetSavings)}씩 순저축이 쌓이고 있어요.`
    );
  } else if (annualNetSavings < 0) {
    insights.push(
      `현재 소비가 수입을 초과하고 있어요. 지출을 조정해보세요.`
    );
  }

  if (children.hasChildren && annualChildExpense > 0) {
    insights.push(
      `자녀 관련 연 지출 ${formatEok(annualChildExpense)}이 ${children.independenceAge}세까지 계속돼요.`
    );
  }

  const yearsToRetirement = goal.retirementAge - status.currentAge;
  insights.push(
    `물가상승률 ${goal.inflationRate}% 기준으로, ${yearsToRetirement}년 후 은퇴 시점에는 목표 생활비가 ` +
    `월 ${Math.round(result.requiredMonthlyAtRetirement).toLocaleString('ko-KR')}만원으로 늘어요.`
  );

  if (verdict.level === 'critical' || verdict.level === 'low') {
    insights.push(
      `은퇴 전까지 저축을 늘리거나, 투자수익률을 높이거나, 은퇴 시기를 늦추면 목표에 가까워질 수 있어요.`
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--tds-gray-700)' }}>
        해석
      </p>
      {insights.map((text, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ color: 'var(--tds-blue-500)', fontSize: 16, lineHeight: 1.4 }}>·</span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--tds-gray-700)', lineHeight: 1.6 }}>
            {text}
          </p>
        </div>
      ))}
    </div>
  );
}
