import { SectionHeader, Typography } from '@wanteddev/wds';
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

  // 1. 생활비 부족 시 (최우선)
  if (summary.targetGap < 0) {
    const shortfall = Math.abs(summary.targetGap);
    items.push({
      id: 'expense-gap',
      text: `목표 생활비를 월 ${fmtKRW(shortfall)} 낮춰서 다시 계산해보세요`,
      detail: `현재 자산으로는 월 ${fmtKRW(summary.sustainableMonthly)}이 가능해요. 목표(월 ${fmtKRW(targetMonthly)})를 조금 조정해보세요.`,
    });
  }

  // 2. 집 개입 시점 (집이 있는 경우)
  if (hasRealEstate && summary.propertyInterventionAge !== null) {
    items.push({
      id: 'house-strategy',
      text: `${summary.propertyInterventionAge}세 전후 집을 팔거나 담보대출 받는 경우를 비교해보세요`,
      detail: `위 "집을 팔거나 대출받는 선택" 섹션에서 전략별 차이를 확인할 수 있어요.`,
    });
  }

  // 3. 은퇴 나이 조정 제안 (자금 부족 & 충분한 여유 있을 때)
  if (summary.failureAge !== null && summary.failureAge < lifeExpectancy - 5) {
    items.push({
      id: 'retire-age',
      text: '은퇴 나이를 2년 늦추면 어떻게 달라지는지 확인해보세요',
      detail: `은퇴를 ${retirementAge + 2}세로 늦추면 근로소득 기간이 늘어나 자금 여유가 생길 수 있어요.`,
    });
  }

  // 4. 연금 미입력 (낮은 우선순위지만 중요)
  if (pensionMonthly === 0) {
    items.push({
      id: 'pension-empty',
      text: '국민연금·퇴직연금·개인연금 정보를 입력하면 더 정확해요',
      detail: '연금은 은퇴 후 가장 안정적인 수입원이에요. 왼쪽 연금 섹션에서 입력해보세요.',
    });
  }

  // 최대 3개
  return items.slice(0, 3);
}

export default function ActionPlanSection({ summary, inputs, hasRealEstate, propertyOptions: _propertyOptions }: ActionPlanSectionProps) {
  const items = buildActionItems(summary, inputs, hasRealEstate);

  if (items.length === 0) {
    return (
      <section
        style={{
          borderRadius: 16,
          border: '1px solid #DDD7CE',
          background: '#FFFFFF',
          padding: '28px 28px',
        }}
      >
        <SectionHeader
          headingContent="지금 해야 할 일"
          size="small"
          headingTag="h2"
          style={{
            letterSpacing: '0.01em',
            marginBottom: 'var(--result-space-3)',
          }}
        />
        <Typography variant="body1" style={{ color: 'var(--result-text-body-color)', lineHeight: 1.62 }}>
          현재 입력 기준으로 안정적인 계획이에요. 입력값을 바꾸면 바로 다시 확인할 수 있어요.
        </Typography>
      </section>
    );
  }

  return (
    <section
      style={{
        borderRadius: 16,
        border: '1px solid #DDD7CE',
        background: '#FFFFFF',
        padding: '28px 28px',
      }}
    >
      <SectionHeader
        headingContent="지금 해야 할 일"
        size="small"
        headingTag="h2"
        style={{
          letterSpacing: '0.01em',
          marginBottom: 'var(--result-space-4)',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--result-space-2)' }}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--result-space-3)',
              padding: '16px 20px',
              borderRadius: 12,
              border: '1px solid #EDE8E2',
              background: '#FAF8F4',
            }}
          >
            {/* 번호 — 테두리형 (Hero 검정 원과 구분) */}
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'transparent',
                border: '2px solid #1C1814',
                color: '#1C1814',
                fontSize: 11,
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

            {/* 내용 */}
            <div style={{ flex: 1 }}>
              <Typography
                variant="body1"
                weight="bold"
                style={{
                  color: 'var(--result-text-strong-color)',
                  display: 'block',
                  lineHeight: 1.45,
                  marginBottom: item.detail ? 4 : 0,
                }}
              >
                {item.text}
              </Typography>
              {item.detail && (
                <Typography
                  variant="caption1"
                  color="semantic.label.alternative"
                  style={{ display: 'block', lineHeight: 1.55 }}
                >
                  {item.detail}
                </Typography>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
