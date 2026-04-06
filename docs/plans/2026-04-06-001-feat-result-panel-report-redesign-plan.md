---
title: "feat: Redesign result panel as judgment report (상태→이유→선택→근거→행동)"
type: feat
status: active
date: 2026-04-06
---

# feat: Result Panel Report Redesign

## Overview

현재 오른쪽 결과 패널은 계산 수치를 나열하는 구조다. 이번 작업은 사용자가 위에서 아래로 읽으면서 **"내 상태 → 원인 → 선택지 → 근거 → 행동"** 5단 흐름이 닫히는 **판단 보고서** 형태로 재설계한다.

변경 범위는 `src/components/layout/ResultWorkbench.tsx`와 그 하위 컴포넌트 전체다. 계산 엔진(`engine/*`), 스토어(`store/*`), 타입(`types/calculationV2.ts`), 비즈니스 로직은 건드리지 않는다.

---

## Problem Frame

사용자가 현재 결과 화면을 보고 얻는 것:
- 수치는 볼 수 있다 (월 생활비, 유지 가능 나이 등)
- 하지만 **"왜 이런 결과가 나왔는지"** 가 명확히 설명되지 않는다
- **"집을 어떻게 할지"** 는 표가 있지만 단순 비교 목록처럼 보인다
- 화면 끝에서 **"이제 뭘 해야 하지?"** 라는 질문에 답이 없다
- `fundingTimeline[]` 데이터가 있지만 UI에 전혀 사용되지 않는다
- `HouseDecisionSection` + `VerificationSection` 이 같은 `<section>` 으로 묶여 맥락이 흐려진다

---

## Requirements Trace

- R1. 결과 패널이 "상태 → 이유 → 선택 → 근거 → 행동" 순서로 읽혀야 한다
- R2. 사용자가 3초 안에 현재 상태(배지 + 한 줄 결론 + 핵심 수치 3개)를 이해해야 한다
- R3. "왜 이런 결과인지"를 카드 구조로 설명해야 한다 (단순 bullet 리스트 대체)
- R4. 집이 있는 경우 전략 비교를 "선택 도구"처럼 제공하되, "집 활용" 같은 추상어를 쓰지 않는다
- R5. `fundingTimeline[]` 을 활용해 "몇 세부터 무엇으로 버티는지" 시각화한다
- R6. `AssetBalanceChart` 는 제거하지 않고 "근거 확인" 영역으로 이동한다. 차트 위에 해석 요약 문구를 노출한다
- R7. 마지막 섹션으로 ActionPlanSection을 추가한다 (사용자가 다음에 해야 할 3개 내외 액션)
- R8. 계산 로직, 엔진, 스토어, 타입은 변경하지 않는다
- R9. `npm run build` 기준 빌드 가능 상태를 유지한다

---

## Scope Boundaries

- 모바일/반응형 대응 제외
- `engine/*`, `store/*`, `types/calculationV2.ts`, `types/inputs.ts` 수정 제외
- 좌측 InputWorkbench, App.tsx 셸 수정 제외
- 기존 `PROPERTY_STRATEGY_LABELS` 변경 제외 (내부 엔진 상수) — 섹션 제목/설명은 새 컴포넌트에서 별도 문구를 정의한다

---

## Context & Research

### Relevant Code and Patterns

- `src/components/layout/ResultWorkbench.tsx` — 메인 오케스트레이터. inline `ReportConclusionSection` 포함. `narrative`, `selectedStrategy` state, `propertyOptions` 흐름 관리
- `src/components/layout/resultNarrative.ts` — `buildResultNarrativeModel()` → `headline`, `metrics[3]`, `recommendedStrategyLabel`, `recommendationReasonLine`, `insightLines[3]` 반환. 이 데이터를 `ResultHeroSection` + `WhyThisResultSection` 에서 재사용한다
- `src/components/layout/houseDecisionVM.ts` — `buildHouseDecisionRowsVM()` → `HouseDecisionRowVM[]` 반환. `sustainableMonthlyText`, `startAgeText`, `survivalAgeText`, `lastRemainingMoneyText`, `houseCashSupportText` 등 모두 여기서 포맷됨. `HouseStrategyComparisonSection` 에서 이 VM을 계속 사용한다
- `src/components/layout/VerificationSection.tsx` — `AssetBalanceChart` + `CompactLifetimeTimeline` + `details>assumptions/warnings` 구조. `EvidenceWorkspace` 로 역할 재정의
- `src/types/calculationV2.ts` — `FundingStage` (bucketType: income/cash_like/financial/property_keep/property_loan/property_sale/failure), `PropertyOptionResult` (sustainableMonthly, failureAge, interventionAge, finalNetWorth)
- `src/index.css` — `--result-*` CSS 토큰: space(1~6), text-size(display/title/body/meta/metric), text-color, surface, accent, border 변수 모두 정의됨

### Existing UI Patterns

- 섹션 카드: `borderRadius: 16, border: '1px solid var(--result-border-soft)', background: 'var(--result-surface-base)'`
- 메트릭 카드: `borderRadius: 8, border: soft, background: --result-surface-metric`
- 강조 텍스트: `fontSize: --result-text-display, fontWeight: 800, letterSpacing: -0.02em`
- 서브 텍스트: `fontSize: --result-text-meta, color: --result-text-meta-color`
- 차트 라이브러리: Recharts (`AreaChart`, `BarChart` 사용 가능 — 이미 설치됨)
- 배지 패턴: 둥근 pill 형태, `border-radius: 999`, `padding: '1px 6px'` — HouseDecisionRows에서 "추천" 배지로 사용 중

### Not Currently Used

- `resultV2.fundingTimeline` — 엔진이 계산해서 넘기지만 현재 UI에서 완전히 미사용
- Recharts `BarChart` — `AssetBalanceChart`는 `AreaChart`만 사용. 전략 비교 막대는 신규

---

## Key Technical Decisions

- **`ReportConclusionSection` 분리**: 현재 `ResultWorkbench.tsx` 인라인 함수를 `ResultHeroSection.tsx`로 분리하고 상태 배지(안정적/조정 필요/부족)와 요약 액션 1줄을 추가한다
- **`InsightLinesSection` 대체**: 3줄 bullet을 "왜 이런 결과인지" 카드 3개(연금 커버리지, 자산 수준, 자금 전환 시점)로 교체한다. `insightLines` 문자열 배열 대신 `WhyThisResultSection` 이 `summary + inputs + narrative` 를 직접 받아 카드를 구성한다
- **`FundingPathSection` 신규**: `resultV2.fundingTimeline[]` 을 수평 타임라인 바(또는 블록 배지 행)로 시각화한다. bucketType별 색상 매핑을 새로 정의한다
- **`HouseStrategyComparisonSection`**: 기존 `HouseDecisionSection` + `HouseDecisionRows` 를 대체. 전략 비교 막대그래프(Recharts `BarChart`) + 기존 선택 행 유지. 섹션 제목은 "집을 팔거나 대출받는 선택" 으로 고정
- **`EvidenceWorkspace`**: `VerificationSection` 역할 재정의. 차트 위에 해석 요약 헤더("이 차트에서 가장 중요한 것: ...")를 추가. 탭 없이 섹션 구분 방식으로 "돈 흐름 / 나이별 이벤트 / 가정과 주의" 명확히 구분
- **`ActionPlanSection` 신규**: `summary` + `inputs` + `hasRealEstate` 조건에 따라 3개 내외 액션 아이템을 동적으로 생성한다. CTA는 섹션 스크롤 이동(좌측 패널 포커스는 v2 과제로 defer)
- **`ResultWorkbench` 오케스트레이션**: 기존 shouldRenderLinkedGroup 조건부 섹션 묶음을 해제하고 6개 섹션을 순서대로 배치한다

---

## Open Questions

### Resolved During Planning

- **ActionPlanSection CTA 범위**: 좌측 입력 패널로의 실제 포커스 이동은 store/ref 연결 필요 → 이번 작업에서는 UI 구조 + 정적 텍스트만 구현, 이동 동작은 defer
- **FundingPath 시각화 형태**: 수평 가로형 블록 배지 행(타임라인 바 형태)으로 결정. 나이별 구간 폭을 (toAge - fromAge)에 비례해 렌더링
- **`InsightLinesSection` 폐기 vs 유지**: 교체(폐기)하되 파일은 삭제하지 않고 `ResultWorkbench`에서 import를 제거한다
- **전략 비교 그래프 지표**: 주 지표는 `sustainableMonthly`(가능한 월 생활비). 보조로 `failureAge`(유지 가능 나이)를 같은 그래프 또는 테이블에 표시
- **EvidenceWorkspace 탭 여부**: 탭 없이 명확한 라벨 + 구분선 구조로 진행 (탭 상태 관리 복잡도 제거)

### Deferred to Implementation

- 좌측 입력 패널 섹션 포커스 이동 로직 (ActionPlanSection CTA 실제 동작)
- `resultNarrative.ts` `insightLines` 타입의 폐기 — 현재 `ResultNarrativeModel` 인터페이스에 `insightLines` 필드가 있으나 `WhyThisResultSection` 이 직접 데이터를 소비하면 이 필드는 unused가 됨. 타입 정리는 별도 cleanup 작업으로 defer

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
ResultWorkbench
├── ResultHeroSection        props: { summary, narrative, hasRealEstate }
│   ├── 상태 배지             derivedFrom: summary.targetGap + failureAge
│   ├── headline (h1-style)   from: narrative.headline
│   ├── 핵심 수치 3개          from: narrative.metrics
│   └── 요약 액션 1줄          from: narrative.recommendationReasonLine
│
├── WhyThisResultSection     props: { summary, inputs, pensionMonthly }
│   ├── 카드 1: 연금 커버리지   연금 월X원 → 생활비 목표의 Y%
│   ├── 카드 2: 자산 충분도     현재 자산 기준 가능한 월생활비 vs 목표
│   └── 카드 3: 자금 전환 시점  X세부터 투자자산 매도, Y세부터 집 개입
│
├── FundingPathSection       props: { fundingTimeline, lifeExpectancy }   [NEW]
│   └── 나이 구간 블록 배지 행  bucketType별 색상 + 나이 범위 + 한 줄 레이블
│
├── HouseStrategyComparisonSection  [집 있을 때만, replaces HouseDecisionSection]
│   props: { propertyOptions, selectedStrategy, lifeExpectancy, onSelectStrategy }
│   ├── 섹션 제목: "집을 팔거나 대출받는 선택"
│   ├── 전략 비교 막대그래프    BarChart(sustainableMonthly per strategy)
│   └── 전략 선택 행 (기존 HouseDecisionRows 재사용)
│
├── EvidenceWorkspace        props: { ...VerificationSection props }   [replaces VerificationSection]
│   ├── 차트 해석 요약 헤더     derivedFrom: summary + chartRows
│   ├── AssetBalanceChart     (existing, no change)
│   ├── 나이별 주요 이벤트      (existing CompactLifetimeTimeline)
│   └── 가정과 주의            (existing details/summary)
│
└── ActionPlanSection        props: { summary, inputs, hasRealEstate }   [NEW]
    └── 액션 아이템 2~3개      derivedFrom: gap/failureAge/pension/house conditions
```

### 상태 배지 결정 로직 (ResultHeroSection)

| 조건 | 배지 | 색상 |
|---|---|---|
| failureAge === null && targetGap >= 0 | 안정적 | positive (green) |
| failureAge === null && targetGap < 0 | 조정 필요 | warning (amber) |
| failureAge !== null | 부족 | negative (red) |

### FundingPathSection bucketType 색상 매핑

| bucketType | 한글 레이블 | 색상 톤 |
|---|---|---|
| income | 근로소득 | neutral/green |
| cash_like | 현금 사용 | blue |
| financial | 투자자산 매도 | blue-dark |
| property_keep | 집 유지 | gray |
| property_loan | 담보대출 | amber |
| property_sale | 매각 대금 | amber-dark |
| failure | 자금 부족 | red |

### ActionPlanSection 액션 결정 규칙

```
if (targetGap < 0 && failureAge === null) → "목표 생활비를 월 X원 낮춰보세요"
if (failureAge !== null && failureAge < lifeExpectancy - 5) → "은퇴 나이를 2년 늦추면 어떻게 달라지는지 확인해보세요"
if (pensionMonthly === 0) → "연금 정보를 입력하면 더 정확한 결과를 볼 수 있어요"
if (hasRealEstate && propertyInterventionAge !== null) → "X세 전후 집을 팔거나 담보대출 받는 경우를 비교해보세요"
if (!hasRealEstate && failureAge !== null) → "집이 없다면 투자자산을 늘리는 방향을 시뮬레이션해보세요"
```

---

## Implementation Units

- [ ] **Unit 1: ResultHeroSection 컴포넌트 신규 생성**

**Goal:** `ReportConclusionSection` 인라인 함수를 독립 컴포넌트로 분리하고, 상태 배지(안정적/조정 필요/부족) + 요약 액션 1줄을 추가한다.

**Requirements:** R1, R2

**Dependencies:** 없음 (기존 `resultNarrative.ts` 타입 재사용)

**Files:**
- Create: `src/components/layout/ResultHeroSection.tsx`
- Modify: `src/components/layout/ResultWorkbench.tsx` (ReportConclusionSection 인라인 제거, ResultHeroSection import)

**Approach:**
- `NarrativeMetric`, `ResultNarrativeModel` import from `resultNarrative.ts`
- `CalculationResultV2['summary']` 를 추가 prop으로 받아 배지 결정 (targetGap + failureAge 기준)
- 배지: 안정적(positive green), 조정 필요(warning amber), 부족(negative red)
- 요약 액션 1줄: `narrative.recommendationReasonLine` 을 이미 있는 위치보다 상단에 배치하거나 별도 accent 박스로 노출
- 기존 ReportConclusionSection의 3 metric cards + headline + strategy label 유지

**Patterns to follow:**
- `src/components/layout/ResultWorkbench.tsx` 내 기존 `ReportConclusionSection` 구조
- 배지 패턴: `src/components/layout/HouseDecisionRows.tsx` 의 "추천" 배지 (border-radius 999, padding 1px 6px)

**Test scenarios:**
- Happy path: summary.targetGap >= 0 && failureAge === null → 배지 "안정적" 렌더링
- Edge case: summary.targetGap < 0 && failureAge === null → 배지 "조정 필요" 렌더링
- Edge case: summary.failureAge !== null → 배지 "부족" 렌더링
- Happy path: hasRealEstate=true → 서브 레이블 "추천 전략 기준 · 최대 생활비" 표시
- Happy path: hasRealEstate=false → 서브 레이블 "무주택 기준 · 최대 생활비" 표시
- Happy path: 3개 metric card가 올바른 값/tone으로 렌더링됨

**Verification:**
- `ResultWorkbench` 에서 `ReportConclusionSection` 인라인 함수 제거 후 동일한 수치 표시
- 배지가 summary 상태에 따라 3가지 케이스 모두 렌더링됨
- TypeScript 에러 없음

---

- [ ] **Unit 2: WhyThisResultSection 컴포넌트 신규 생성**

**Goal:** `InsightLinesSection` 의 3줄 bullet을 "왜 이런 결과인지" 카드 3개 구조로 교체한다.

**Requirements:** R1, R3

**Dependencies:** Unit 1 완료 후 (ResultWorkbench 수정 흐름)

**Files:**
- Create: `src/components/layout/WhyThisResultSection.tsx`
- Modify: `src/components/layout/ResultWorkbench.tsx` (InsightLinesSection 제거, WhyThisResultSection 추가)

**Approach:**
- Props: `{ summary: CalculationResultV2['summary'], inputs: PlannerInputs, hasRealEstate: boolean }`
- `getTotalMonthlyPensionTodayValue` import from `engine/pensionEstimation` (이미 resultNarrative.ts에서 사용 중인 함수)
- 카드 3개:
  1. **연금 커버리지 카드**: `pensionMonthly / targetMonthly * 100` → "연금이 생활비 목표의 X%를 받쳐줘요" (혹은 "연금이 없어요")
  2. **자산 수준 카드**: `sustainableMonthly` vs `targetMonthly` 비교 → "현재 자산으로 월 X원이 가능해요. 목표보다 Y원 [높아요/낮아요]"
  3. **자금 전환 시점 카드**: `financialExhaustionAge`, `propertyInterventionAge` → "X세부터 투자자산을 써요" / "Y세부터 집이 필요해요" (없으면 "기대수명까지 금융자산으로 버텨요")
- 카드 레이아웃: 3개 가로 grid (1fr 1fr 1fr) 또는 세로 stack — 콘텐츠 길이 감안해 세로 stack 추천
- 각 카드: `border-radius: 10, border: 1px solid --result-border-soft, padding: --result-space-3`
- 섹션 제목: "이런 결과가 나온 이유" (또는 없이 카드만)

**Patterns to follow:**
- `src/components/layout/ResultWorkbench.tsx` metric card 스타일
- `src/components/layout/resultNarrative.ts` `getTotalMonthlyPensionTodayValue` import 패턴

**Test scenarios:**
- Happy path: pensionMonthly > 0 → 연금 커버리지 카드에 비율 표시
- Edge case: pensionMonthly === 0 → "연금이 없어요" 대체 텍스트
- Happy path: sustainableMonthly >= targetMonthly → 자산 수준 카드에 positive tone
- Edge case: sustainableMonthly < targetMonthly → negative tone
- Happy path: financialExhaustionAge !== null → 자금 전환 시점 카드에 나이 표시
- Edge case: failureAge === null && financialExhaustionAge === null → "기대수명까지 금융자산으로 버텨요" 표시
- Edge case: hasRealEstate=true && propertyInterventionAge !== null → 집 개입 시점 카드에 표시

**Verification:**
- `InsightLinesSection` 이 `ResultWorkbench`에서 더 이상 렌더링되지 않음
- 카드 3개가 조건에 따라 적절한 문구로 표시됨
- TypeScript 에러 없음

---

- [ ] **Unit 3: FundingPathSection 컴포넌트 신규 생성**

**Goal:** `resultV2.fundingTimeline[]` 을 활용해 "몇 세부터 무엇으로 버티는지" 가로 타임라인 블록으로 시각화한다.

**Requirements:** R1, R5

**Dependencies:** 없음

**Files:**
- Create: `src/components/layout/FundingPathSection.tsx`
- Modify: `src/components/layout/ResultWorkbench.tsx` (FundingPathSection import + 렌더링)

**Approach:**
- Props: `{ fundingTimeline: FundingStage[], lifeExpectancy: number, retirementAge: number }`
- 수평 블록 배지 행: 각 `FundingStage` 를 시작/종료 나이 + bucketType 레이블 + 색상으로 표시
- 블록 폭 비율: `(toAge ?? lifeExpectancy) - fromAge` 비례. `retirementAge`~`lifeExpectancy` 전체 구간을 100%로 환산
- `toAge === null` 인 경우 `lifeExpectancy` 로 처리
- bucketType별 한글 레이블 + 색상 매핑 (Key Technical Decisions 섹션 참조)
- 블록 위/아래: 나이 레이블 표시 (fromAge)
- 섹션 제목: "은퇴 후 자금 흐름" 또는 "돈이 어떻게 버텨주는지"
- fundingTimeline이 비어 있으면 섹션 렌더링 생략

**Patterns to follow:**
- `src/index.css` `--result-*` 색상 토큰 사용
- `src/types/calculationV2.ts` `FundingStage` 타입

**Test scenarios:**
- Happy path: fundingTimeline에 income + cash_like + financial 단계가 있을 때 3개 블록 렌더링
- Edge case: fundingTimeline이 빈 배열 → 섹션 자체 null 반환
- Edge case: FundingStage.toAge === null → lifeExpectancy로 대체 처리
- Edge case: failure 단계 포함 시 붉은 색상 블록으로 표시
- Happy path: 블록 폭이 구간 길이에 비례해 렌더링됨 (5세 구간이 10세 구간보다 절반 폭)

**Verification:**
- `resultV2.fundingTimeline` 데이터가 있을 때 블록이 렌더링됨
- 각 구간의 나이 레이블이 정확히 표시됨
- TypeScript 에러 없음

---

- [ ] **Unit 4: HouseStrategyComparisonSection 컴포넌트 신규 생성**

**Goal:** `HouseDecisionSection` 을 대체하는 전략 비교 섹션. 전략 비교 막대그래프 + 기존 선택 행을 하나의 "선택 도구" 섹션으로 구성한다.

**Requirements:** R1, R4

**Dependencies:** 없음 (`HouseDecisionRows` 재사용)

**Files:**
- Create: `src/components/layout/HouseStrategyComparisonSection.tsx`
- Modify: `src/components/layout/ResultWorkbench.tsx` (HouseDecisionSection import 제거, HouseStrategyComparisonSection 추가)

**Approach:**
- Props: 기존 `HouseDecisionSectionProps` 와 동일 (hasRealEstate, propertyOptions, selectedStrategy, lifeExpectancy, onSelectStrategy)
- 섹션 제목: "집을 팔거나 대출받는 선택" (고정 문구, R4)
- 서브 설명: "집을 그대로 둘지, 팔지, 담보대출을 받을지 비교해보세요."
- 전략 비교 막대그래프 (Recharts `BarChart`):
  - X축: 전략명 (keep/secured_loan/sell → 액션형 레이블: "그대로 두기" / "담보대출" / "팔기")
  - Y축: 가능한 월 생활비 (만원)
  - 각 bar에 추천 전략 하이라이트 (filled color)
  - 보조 텍스트: failureAge (유지 가능 나이) → bar 위 또는 tooltip에 표시
  - 그래프 제목: "전략별 가능한 월 생활비"
- 그래프 아래 기존 `HouseDecisionRows` 그대로 재사용 (전략 선택 인터랙션 유지)
- isSelectable 체크 동일하게 유지 (hasRealEstate && hasSelectableRows)
- 불필요 시 (hasRealEstate=false 또는 selectable 없음) null 반환

**Patterns to follow:**
- `src/components/charts/AssetBalanceChart.tsx` Recharts import 패턴
- `src/components/layout/HouseDecisionRows.tsx` 재사용
- `src/components/layout/houseDecisionVM.ts` `buildHouseDecisionRowsVM` 재사용

**Test scenarios:**
- Happy path: propertyOptions 3개 모두 selectable → BarChart 3개 bar + 선택 행 3개
- Edge case: 일부 옵션 isSelectable=false → bar는 비활성 스타일, 행은 disabled 상태
- Happy path: 추천 전략 bar가 시각적으로 하이라이트됨
- Happy path: 선택 행 클릭 → onSelectStrategy 호출
- Edge case: hasRealEstate=false → 섹션 전체 null 반환
- Happy path: 섹션 제목 "집을 팔거나 대출받는 선택" 렌더링 확인

**Verification:**
- `HouseDecisionSection` 이 `ResultWorkbench`에서 더 이상 렌더링되지 않음
- BarChart와 선택 행이 올바른 데이터로 렌더링됨
- TypeScript 에러 없음

---

- [ ] **Unit 5: EvidenceWorkspace 컴포넌트 신규 생성**

**Goal:** `VerificationSection` 역할을 재정의한다. 차트 위에 해석 요약 헤더 추가 + 섹션 타이틀을 "근거 확인" 영역으로 명확히 구분한다.

**Requirements:** R1, R6

**Dependencies:** 없음 (`AssetBalanceChart`, `CompactLifetimeTimeline` 재사용)

**Files:**
- Create: `src/components/layout/EvidenceWorkspace.tsx`
- Modify: `src/components/layout/ResultWorkbench.tsx` (VerificationSection import 제거, EvidenceWorkspace 추가)

**Approach:**
- Props: 기존 `VerificationSectionProps` 와 동일
- 최상단 섹션 레이블: "근거 확인" (작은 meta 텍스트)
- 차트 해석 요약 헤더: `AssetBalanceChart` 렌더 전에 1~2줄 해석 문구 노출
  - 예: "금융자산이 X세에 소진되고, 이후 집에서 보완해요" / "기대수명까지 금융자산이 유지돼요"
  - derivedFrom: `summary.financialExhaustionAge`, `summary.propertyInterventionAge`, `summary.failureAge`
- `AssetBalanceChart` (변경 없음)
- "나이별 주요 이벤트" 섹션 (기존 `CompactLifetimeTimeline` 유지)
- "가정과 주의" (기존 `details>summary` 구조 유지, `PropertyAssetChart` + assumptions + warnings 포함)
- 기존 VerificationSection과 동일한 props 인터페이스 유지

**Patterns to follow:**
- `src/components/layout/VerificationSection.tsx` 전체 구조 (리팩터링 수준)
- `src/index.css` `--result-*` 토큰

**Test scenarios:**
- Happy path: summary.financialExhaustionAge !== null → "X세에 투자자산이 소진돼요" 헤더 표시
- Happy path: summary.failureAge === null → "기대수명까지 유지돼요" 헤더 표시
- Happy path: AssetBalanceChart 기존 동일하게 렌더링됨
- Happy path: 나이별 주요 이벤트 섹션 기존 동일하게 렌더링됨
- Happy path: assumptions/warnings가 있을 때 "가정과 주의" 섹션 표시

**Verification:**
- `VerificationSection` 이 `ResultWorkbench`에서 더 이상 렌더링되지 않음
- 차트 해석 요약 헤더가 summary 조건에 따라 올바르게 표시됨
- 기존 AssetBalanceChart, CompactLifetimeTimeline, assumptions/warnings 동일하게 렌더링됨
- TypeScript 에러 없음

---

- [ ] **Unit 6: ActionPlanSection 컴포넌트 신규 생성**

**Goal:** 결과 화면 마지막에 "지금 해야 할 일" 액션 아이템 섹션을 추가한다.

**Requirements:** R1, R7

**Dependencies:** 없음

**Files:**
- Create: `src/components/layout/ActionPlanSection.tsx`
- Modify: `src/components/layout/ResultWorkbench.tsx` (ActionPlanSection import + 마지막에 렌더링)

**Approach:**
- Props: `{ summary: CalculationResultV2['summary'], inputs: PlannerInputs, hasRealEstate: boolean, propertyOptions: PropertyOptionResult[] }`
- 액션 아이템 결정 로직 (Key Technical Decisions 섹션의 결정 규칙 참조):
  1. targetGap < 0 → "목표 생활비를 월 {Math.abs(targetGap)}원 낮춰서 다시 계산해보세요"
  2. failureAge !== null && failureAge < lifeExpectancy - 5 → "은퇴 나이를 2년 늦추면 어떻게 달라지는지 확인해보세요"
  3. pensionTotal === 0 (inputs에서 파악) → "국민연금·개인연금 정보를 입력하면 더 정확한 결과를 볼 수 있어요"
  4. hasRealEstate && propertyInterventionAge !== null → "{propertyInterventionAge}세 전후 집을 팔거나 담보대출 받는 경우를 비교해보세요"
- 아이템 최대 3개 표시 (우선순위: 1 > 4 > 2 > 3)
- 각 아이템: 번호 + 액션 텍스트 + 화살표 아이콘 (→)
- 섹션 제목: "지금 해야 할 일"
- CTA 버튼: 이번 작업에서는 정적 UI만. 실제 이동 동작 defer

**Patterns to follow:**
- `src/index.css` `--result-*` 토큰
- `src/utils/format.ts` `fmtKRW` 금액 포맷

**Test scenarios:**
- Happy path: targetGap < 0 → 첫 번째 아이템으로 생활비 조정 제안 표시
- Happy path: failureAge !== null → 은퇴 나이 조정 제안 표시
- Edge case: targetGap >= 0 && failureAge === null && hasRealEstate=false && pensionTotal > 0 → 액션 아이템 없거나 최소 1개 대안 표시
- Happy path: hasRealEstate=true && propertyInterventionAge !== null → 집 관련 제안 표시
- Edge case: pensionTotal === 0 → 연금 입력 요청 아이템 포함
- Happy path: 아이템이 항상 최대 3개를 넘지 않음

**Verification:**
- 화면 마지막 섹션으로 ActionPlanSection이 렌더링됨
- 계산 조건에 따라 relevant한 액션 아이템만 표시됨
- TypeScript 에러 없음

---

- [ ] **Unit 7: ResultWorkbench 오케스트레이션 정리**

**Goal:** 6개 Unit에서 만든 컴포넌트를 `ResultWorkbench` 에서 올바른 순서로 조립하고, 기존 `shouldRenderLinkedGroup` 조건부 묶음 구조를 해제한다.

**Requirements:** R1, R8, R9

**Dependencies:** Unit 1~6 모두 완료

**Files:**
- Modify: `src/components/layout/ResultWorkbench.tsx`

**Approach:**
- 기존 inline `ReportConclusionSection` 함수 제거
- 기존 `InsightLinesSection` import 제거 (파일 자체는 삭제하지 않음)
- 기존 `HouseDecisionSection` import 제거
- 기존 `VerificationSection` import 제거
- 새 import: `ResultHeroSection`, `WhyThisResultSection`, `FundingPathSection`, `HouseStrategyComparisonSection`, `EvidenceWorkspace`, `ActionPlanSection`
- `shouldRenderLinkedGroup` 조건부 섹션 묶음 해제 — 각 섹션이 독립적으로 렌더링
- 렌더링 순서:
  ```
  1. ResultHeroSection
  2. WhyThisResultSection
  3. FundingPathSection (fundingTimeline이 있을 때)
  4. HouseStrategyComparisonSection (hasRealEstate && hasSelectableHouseRows)
  5. EvidenceWorkspace
  6. ActionPlanSection
  ```
- `verificationOption`, `chartRows`, `chartStrategy`, `chartLabel` 등 기존 chart 관련 변수 유지 (EvidenceWorkspace에 그대로 전달)
- `selectedStrategy`, `handleSelectStrategy` state 유지 (HouseStrategyComparisonSection에 전달)
- empty state 조건 (나이 초과, 금융자산 없음, resultV2 없음) 기존 그대로 유지

**Patterns to follow:**
- 기존 `ResultWorkbench.tsx` 전체 구조

**Test scenarios:**
- Happy path: hasRealEstate=true, fundingTimeline 있음 → 6개 섹션 모두 렌더링
- Happy path: hasRealEstate=false → HouseStrategyComparisonSection null, 나머지 5개 렌더링
- Edge case: fundingTimeline=[] → FundingPathSection null
- Happy path: empty state 조건 진입 시 EmptyStateCard 렌더링 (기존 동일)
- Integration: selectedStrategy 변경 시 EvidenceWorkspace(chartRows)가 올바르게 업데이트됨

**Verification:**
- `npm run build` 성공 (TypeScript 에러, import 오류 없음)
- 6개 섹션이 올바른 순서로 렌더링됨
- 기존 계산 결과 수치가 동일하게 표시됨

---

## System-Wide Impact

- **Interaction graph:** `selectedStrategy` state가 `HouseStrategyComparisonSection`의 선택 행과 `EvidenceWorkspace`의 차트 데이터 양쪽에 영향. `onSelectStrategy` 콜백을 통해 `ResultWorkbench` 에서 관리.
- **Error propagation:** 신규 컴포넌트들은 모두 계산 결과 데이터를 props로 받는 순수 표현 컴포넌트 — 계산 에러가 `resultV2=null` 로 처리되면 `ResultWorkbench`의 empty state guard에서 차단됨
- **State lifecycle risks:** `selectedStrategy` 초기값 로직(`resolveSelectedStrategy`)은 변경 없음. `HouseStrategyComparisonSection`이 `HouseDecisionSection`을 교체해도 동일 props/callback 시그니처 사용
- **API surface parity:** `houseDecisionVM.ts`, `resultNarrative.ts`, `selectedStrategy.ts` 파일은 수정하지 않음
- **Integration coverage:** `FundingPathSection`의 `fundingTimeline` 데이터가 실제 엔진에서 채워지는지 런타임 확인 필요 (엔진 미수정이므로 기존 동작 그대로)
- **Unchanged invariants:** `engine/*`, `store/*`, `types/calculationV2.ts` 완전 유지. `resultNarrative.ts` 의 `insightLines` 필드는 `WhyThisResultSection` 전환 후 미사용 상태가 되지만 타입 정의는 유지 (cleanup은 defer)

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `fundingTimeline` 이 일부 입력 조건에서 빈 배열로 반환될 수 있음 | `FundingPathSection` 에서 빈 배열 시 null 반환 처리 |
| Recharts `BarChart` 가 이미 번들에 포함되어 있는지 확인 필요 | `AssetBalanceChart`가 Recharts 사용 중이므로 BarChart도 포함됨. import만 추가하면 됨 |
| `HouseDecisionRows` 재사용 시 기존 selected state 인터랙션 유지 | `HouseStrategyComparisonSection`이 동일한 `rows`, `onSelectStrategy` props를 전달하므로 동작 변화 없음 |
| 6개 섹션의 세로 스크롤이 너무 길어질 수 있음 | `EvidenceWorkspace`의 "가정과 주의" 를 `<details>` 접이식으로 유지해 기본 뷰 압축 |
| TypeScript strict mode에서 신규 컴포넌트 타입 오류 | 모든 props 인터페이스를 명시적으로 정의하고 Unit 7 완료 후 `npm run build` 로 검증 |

---

## Sources & References

- Related code: `src/components/layout/ResultWorkbench.tsx`
- Related code: `src/components/layout/resultNarrative.ts`
- Related code: `src/components/layout/houseDecisionVM.ts`
- Related code: `src/types/calculationV2.ts`
- Related code: `src/index.css` (--result-* CSS 토큰)
- Recharts BarChart API (이미 설치된 패키지)
