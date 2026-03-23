import type { CalculationResult } from '../../types/calculation';
import type { PlannerInputs } from '../../types/inputs';
import type { Verdict } from '../../types/calculation';
import { formatEok } from '../../utils/format';

interface Props {
  result: CalculationResult;
  inputs: PlannerInputs;
  verdict: Verdict;
}

const ASSET_LABELS: Record<string, string> = {
  cash: '현금',
  deposit: '예금·적금',
  stock_kr: '국내 주식',
  stock_us: '해외 주식',
  bond: '채권',
  crypto: '코인',
  realEstate: '부동산',
};

export default function InsightSentences({ result, inputs, verdict }: Props) {
  const { goal, status, children, assets } = inputs;
  const { netWorth, annualNetSavings, annualChildExpense, weightedReturn } = result;

  const insights: (string | React.ReactNode)[] = [];

  insights.push(
    `현재 자산과 부채를 반영한 순자산은 ${formatEok(netWorth)}이에요.`
  );

  if (weightedReturn > 0) {
    insights.push(
      `보유 자산의 기대수익률은 연 ${weightedReturn.toFixed(1)}%예요.`
    );
  }

  if (annualNetSavings > 0) {
    const monthlySurplus = Math.round(annualNetSavings / 12);
    // 부동산 제외: 여유자금은 유동 자산에만 투자된다고 가정
    const liquidTotal = Object.entries(assets)
      .filter(([key, a]) => key !== 'realEstate' && a.amount > 0)
      .reduce((s, [, a]) => s + a.amount, 0);

    const breakdown = Object.entries(assets)
      .filter(([key, a]) => key !== 'realEstate' && a.amount > 0)
      .map(([key, a]) => ({
        label: ASSET_LABELS[key] ?? key,
        pct: liquidTotal > 0 ? Math.round((a.amount / liquidTotal) * 100) : 0,
        amount: liquidTotal > 0 ? Math.round((a.amount / liquidTotal) * monthlySurplus) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    insights.push(
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--tds-gray-700)', lineHeight: 1.6 }}>
          매달 남는 <strong>{monthlySurplus.toLocaleString('ko-KR')}만원</strong>은 기존 투자 비중을 유지한다고 가정하고 계산돼요.
        </p>
        <div style={{
          borderRadius: 10,
          border: '1px solid var(--tds-gray-100)',
          overflow: 'hidden',
        }}>
          {breakdown.map((item, i) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 12px',
                background: i % 2 === 0 ? 'var(--tds-gray-50)' : 'white',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--tds-gray-600)' }}>{item.label}</span>
              <span style={{ color: 'var(--tds-gray-400)', marginLeft: 8 }}>{item.pct}%</span>
              <span style={{ fontWeight: 700, color: 'var(--tds-gray-700)', marginLeft: 'auto', paddingLeft: 16 }}>
                +{item.amount.toLocaleString('ko-KR')}만원
              </span>
            </div>
          ))}
        </div>
      </div>
    );

    insights.push(
      `현재 입력 기준으로 올해 약 ${formatEok(annualNetSavings)}의 여유자금이 생겨요. 소득·지출·부채에 따라 해마다 달라질 수 있어요.`
    );
  } else if (annualNetSavings < 0) {
    insights.push(
      `현재 입력 기준으로 소비가 세후 소득을 초과하고 있어요. 지출을 조정해보세요.`
    );
  }

  if (children.hasChildren && annualChildExpense > 0) {
    insights.push(
      `자녀 관련 연 지출 ${formatEok(annualChildExpense)}이 ${children.independenceAge}세까지 계속돼요.`
    );
  }

  const yearsToRetirement = goal.retirementAge - status.currentAge;
  const requiredAtRetirement = Math.round(result.requiredMonthlyAtRetirement);
  insights.push(
    `목표 생활비 월 ${goal.targetMonthly.toLocaleString('ko-KR')}만원은 지금 기준이에요. ` +
    `물가가 매년 ${goal.inflationRate}%씩 오르면 ${yearsToRetirement}년 뒤엔 월 ${requiredAtRetirement.toLocaleString('ko-KR')}만원이 필요해지는데, ` +
    `이 플래너는 그 금액을 자동으로 반영해서 계산해요. 지금 금액 그대로 입력하면 돼요.`
  );

  if (result.depletionAge !== null) {
    const shortfall = goal.targetMonthly - result.possibleMonthly;
    insights.push(
      `지금 계획대로면 ${result.depletionAge}세쯤 모은 돈이 바닥나요. ` +
      `이 조건에서 기대수명까지 버틸 수 있는 월 생활비는 ${result.possibleMonthly.toLocaleString('ko-KR')}만원으로, ` +
      `목표보다 월 ${shortfall.toLocaleString('ko-KR')}만원 부족해요.`
    );
  }

  if (verdict.level === 'critical') {
    insights.push(
      `지금 당장 바꿀 수 있는 것부터 시작해보세요. ` +
      `① 지출을 줄여 저축을 늘리기 ② 투자 수익률 높이기 ③ 은퇴 시기 늦추기 — 세 가지 중 하나만 개선해도 달라질 수 있어요.`
    );
  } else if (verdict.level === 'low') {
    insights.push(
      `조금만 조정하면 목표에 닿아요. ` +
      `저축을 조금 늘리거나, 은퇴 시기를 1~2년 늦추는 것만으로도 충분히 가까워질 수 있어요.`
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--tds-gray-700)' }}>
        해석
      </p>
      {insights.map((text, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--tds-blue-500)', fontSize: 16, lineHeight: 1.4 }}>·</span>
          {typeof text === 'string' ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--tds-gray-700)', lineHeight: 1.6 }}>
              {text}
            </p>
          ) : (
            <div style={{ flex: 1 }}>{text}</div>
          )}
        </div>
      ))}
    </div>
  );
}
