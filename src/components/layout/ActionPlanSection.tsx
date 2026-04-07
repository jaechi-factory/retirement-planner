import { Typography } from '../ui/wds-replacements';
import { getTotalMonthlyPensionTodayValue } from '../../engine/pensionEstimation';
import type { CalculationResultV2, PropertyOptionResult } from '../../types/calculationV2';
import type { PlannerInputs } from '../../types/inputs';
import { fmtKRW } from '../../utils/format';

interface ActionPlanSectionProps {
  summary: CalculationResultV2['summary'];
  inputs: PlannerInputs;
  hasRealEstate: boolean;
  propertyOptions: PropertyOptionResult[];
}

interface ActionItem {
  id: string;
  text: string;
  detail?: string;
}

function buildActionItems(
  summary: CalculationResultV2['summary'],
  inputs: PlannerInputs,
  hasRealEstate: boolean,
): ActionItem[] {
  const { targetMonthly, lifeExpectancy, retirementAge, inflationRate } = inputs.goal;
  const { currentAge, annualIncome } = inputs.status;
  const items: ActionItem[] = [];

  const pensionMonthly = getTotalMonthlyPensionTodayValue(
    inputs.pension,
    currentAge,
    retirementAge,
    annualIncome,
    inflationRate,
  );

  // 1. If expense gap exists (highest priority)
  if (summary.targetGap < 0) {
    const shortfall = Math.abs(summary.targetGap);
    items.push({
      id: 'expense-gap',
      text: `목표 생활비를 월 ${fmtKRW(shortfall)} 낮춰서 다시 계산해보세요`,
      detail: `현재 자산으로는 월 ${fmtKRW(summary.sustainableMonthly)}이 가능해요. 목표(월 ${fmtKRW(targetMonthly)})를 조금 조정해보세요.`,
    });
  }

  // 2. Property intervention timing (if has real estate)
  if (hasRealEstate && summary.propertyInterventionAge !== null) {
    items.push({
      id: 'house-strategy',
      text: `${summary.propertyInterventionAge}세 전후 집을 팔거나 담보대출 받는 경우를 비교해보세요`,
      detail: '위 "집을 팔거나 대출받는 선택" 섹션에서 전략별 차이를 확인할 수 있어요.',
    });
  }

  // 3. Retirement age adjustment suggestion (if shortage with margin)
  if (summary.failureAge !== null && summary.failureAge < lifeExpectancy - 5) {
    items.push({
      id: 'retire-age',
      text: '은퇴 나이를 2년 늦추면 어떻게 달라지는지 확인해보세요',
      detail: `은퇴를 ${retirementAge + 2}세로 늦추면 근로소득 기간이 늘어나 자금 여유가 생길 수 있어요.`,
    });
  }

  // 4. Missing pension (lower priority but important)
  if (pensionMonthly === 0) {
    items.push({
      id: 'pension-empty',
      text: '국민연금, 퇴직연금, 개인연금 정보를 입력하면 더 정확해요',
      detail: '연금은 은퇴 후 가장 안정적인 수입원이에요. 왼쪽 연금 섹션에서 입력해보세요.',
    });
  }

  // Max 3 items
  return items.slice(0, 3);
}

export default function ActionPlanSection({ summary, inputs, hasRealEstate, propertyOptions: _propertyOptions }: ActionPlanSectionProps) {
  const items = buildActionItems(summary, inputs, hasRealEstate);

  // Empty state — stable plan
  if (items.length === 0) {
    return (
      <section style={{ marginBottom: 40 }}>
        {/* Section label */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--neutral-400)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          지금 해야 할 일
        </div>

        <div
          style={{
            background: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--neutral-150)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              background: 'var(--ux-status-positive-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span style={{ fontSize: 20, color: 'var(--ux-status-positive)' }}>✓</span>
          </div>
          <Typography
            variant="headline2"
            weight="bold"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--neutral-900)',
              marginBottom: 4,
            }}
          >
            안정적인 계획이에요
          </Typography>
          <Typography
            variant="body1"
            style={{
              fontSize: 14,
              color: 'var(--neutral-500)',
              lineHeight: 1.6,
            }}
          >
            현재 입력 기준으로 추가 조정 없이 안정적인 계획이에요. 입력값이 바뀌면 다시 확인해보세요.
          </Typography>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 40 }}>
      {/* Section label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--neutral-400)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        지금 해야 할 일
      </div>

      {/* Action items */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-150)',
          overflow: 'hidden',
        }}
      >
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              padding: '20px 24px',
              borderBottom: idx < items.length - 1 ? '1px solid var(--neutral-100)' : 'none',
            }}
          >
            {/* Step number */}
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-accent)',
                color: 'var(--white)',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {idx + 1}
            </span>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                weight="bold"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--neutral-900)',
                  lineHeight: 1.45,
                  marginBottom: item.detail ? 6 : 0,
                }}
              >
                {item.text}
              </Typography>
              {item.detail && (
                <Typography
                  variant="caption1"
                  style={{
                    fontSize: 13,
                    color: 'var(--neutral-500)',
                    lineHeight: 1.55,
                  }}
                >
                  {item.detail}
                </Typography>
              )}
            </div>

            {/* Arrow */}
            <span
              aria-hidden
              style={{
                fontSize: 20,
                color: 'var(--neutral-300)',
                flexShrink: 0,
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              {'>'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
