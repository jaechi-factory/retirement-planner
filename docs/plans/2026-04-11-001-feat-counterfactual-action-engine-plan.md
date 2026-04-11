# 반사실 시뮬레이션 기반 액션 추천 엔진 설계안

> **한 줄 결론**: 기존 `simulateMonthlyV2` + `findMaxSustainableMonthlyV2`를 입력값만 바꿔 다시 돌린 뒤, baseline과 비교해서 "이 전략이 실제로 얼마나 유리한지"를 숫자로 보여주는 엔진.

---

## 1. 핵심 개념

### 반사실(Counterfactual) 시뮬레이션이란

- **Baseline**: 사용자가 현재 입력한 값 그대로 돌린 결과
- **Counterfactual**: 하나의 입력값만 바꿔서(= input patch) 돌린 결과
- **비교**: baseline vs counterfactual의 차이 = 그 전략의 효과

### 왜 이 방식인가

현재 `buildActionItems()`는 규칙 기반이다. "failureAge < lifeExpectancy - 5이면 → 은퇴 2년 늦춰라"처럼 조건문으로 추천한다. 문제는:

- 추천의 근거가 없다 (실제로 2년 늦추면 얼마나 좋아지는지 모른다)
- 사용자 상황에 따라 효과가 천차만별인데 일률적으로 추천한다
- "비교해보니 이 전략이 더 유리했다"가 아니라 "이렇게 해보세요"라는 조언이다

반사실 시뮬레이션은 실제로 돌려본 결과이므로, "은퇴를 2년 늦추면 월 가능 생활비가 47만원 늘어나요"처럼 구체적 숫자를 줄 수 있다.

### 재사용 범위

새 시뮬레이션 엔진을 만들지 않는다. 기존 코드를 그대로 쓴다:

| 기존 함수 | 역할 | 반사실에서 사용법 |
|-----------|------|------------------|
| `findMaxSustainableMonthlyV2` | 최대 지속가능 월 생활비 역산 | input patch 적용 후 호출 |
| `simulateMonthlyV2` | 월별 시뮬레이션 | failureAge, deficitStartAge 추출용 |
| `isSustainableV2` | shortfall 판정 | 역산 내부에서 자동 사용 |

---

## 2. v1 전략 엔진 설계안

### 2.1 전체 흐름

```
사용자 입력 (PlannerInputs)
    │
    ▼
① Baseline 계산
   └→ sustainableMonthly, failureAge, deficitStartAge, totalLateLifeShortfall

② 전략 후보 필터링
   └→ isApplicable == false인 전략 제외
   └→ 경쟁 카테고리(debt_strategy, housing_strategy) 내 사전 시뮬 → 승자만 통과

③ 각 후보별 input patch 생성
   └→ PlannerInputs를 deep copy + patch 대상 필드만 변경

④ 각 후보별 counterfactual 시뮬레이션
   └→ findMaxSustainableMonthlyV2(patched)
   └→ simulateMonthlyV2(patched, targetMonthly) → failureAge, deficitStartAge, shortfall 추출

⑤ baseline과 비교 → ComparisonMetrics 생성
   └→ Δ sustainableMonthly, Δ failureAge, Δ deficitStartAge, Δ totalLateLifeShortfall

⑥ delta ≤ 0인 전략 제거

⑦ 3-슬롯 배정 (best → practical → big_move)

⑧ 각 슬롯에 추천 카드 생성
```

### 2.2 Input Patch 패턴

```
type InputPatch = {
  strategyId: string;
  label: string;
  category: StrategyCategory;
  slotEligibility: SlotType[];
  apply: (base: PlannerInputs) => PlannerInputs;
  isApplicable: (base: PlannerInputs, baseline: BaselineResult) => boolean;
}

type StrategyCategory =
  | 'retire_timing'
  | 'expense_reduction'
  | 'pension_addition'
  | 'vehicle_removal'
  | 'debt_strategy'
  | 'housing_strategy';

type SlotType = 'best' | 'practical' | 'big_move';
```

- `apply`: immutable하게 새 PlannerInputs 반환 (원본 절대 변경 안 함)
- `isApplicable`: 이 전략이 사용자 상황에 해당하는지 판단하는 필터
- `category`: 같은 카테고리의 전략은 전체 슬롯 통틀어 1개만 노출
- `slotEligibility`: 이 전략이 배정될 수 있는 슬롯 목록

### 2.3 비교 지표 (ComparisonMetrics)

```
type ComparisonMetrics = {
  strategyId: string;
  label: string;
  category: StrategyCategory;
  slotEligibility: SlotType[];

  // ── 핵심 delta ──
  sustainableMonthlyDelta: number;
  failureAgeDelta: number | null;
  deficitStartAgeDelta: number | null;

  // ── 말년 안정성 ──
  totalLateLifeShortfall: number;
  baselineLateLifeShortfall: number;

  // ── 절대값 ──
  newSustainableMonthly: number;
  newFailureAge: number | null;
  newDeficitStartAge: number | null;

  // ── 생존 판정 ──
  baselineSurvives: boolean;
  counterfactualSurvives: boolean;
}
```

#### 지표 정의

| 지표 | 정의 | 추출 방법 |
|------|------|----------|
| `sustainableMonthly` | 기대수명까지 shortfall 없이 유지 가능한 최대 월 생활비 | `findMaxSustainableMonthlyV2` 결과 |
| `failureAge` | 모든 자산이 0 이하가 되는 최초 나이 | `findFailureAgeV2(snapshots)` |
| `deficitStartAge` | 월 수입 < 월 지출이 처음 시작되는 나이 (적자 전환점) | 월별 snapshot에서 `incomeThisMonth < expenseThisMonth` 최초 시점 |
| `totalLateLifeShortfall` | 기대수명까지 남은 기간 중 누적 부족액 합산 | 월별 snapshot에서 `shortfall > 0`인 달의 합산 |

#### deficitStartAge가 필요한 이유

failureAge(자산 고갈)는 최종 파국 시점이다. 하지만 사용자에게 더 체감되는 건 "언제부터 매달 적자가 시작되느냐"이다. 예: A 전략은 75세부터 적자지만 85세에 고갈, B 전략은 80세부터 적자지만 83세에 고갈. failureAge만 보면 A가 낫지만, 적자 기간이 10년 vs 3년이므로 B가 심리적으로 더 안정적일 수 있다.

#### totalLateLifeShortfall이 필요한 이유

시점뿐 아니라 "얼마나 부족한지" 크기도 알아야 한다. 예: A 전략은 85세에 고갈, 누적 부족 2,000만원. B 전략은 83세에 고갈, 누적 부족 8,000만원. 시점만 보면 A가 2년 낫지만 심각도는 B가 4배 더 크다.

### 2.4 랭킹 우선순위

1. **고갈 방지** — baseline이 기대수명 전 고갈되는데, counterfactual은 생존하는 전략
2. **적자 시작 시점 개선** — deficitStartAge를 늦추는 전략 (적자 기간 단축)
3. **지속가능 생활비 증가** — sustainableMonthly가 크게 늘어나는 전략
4. **실행 가능성** — 사용자가 통제 가능한 변수인지
5. **결정의 크기** — 라이프스타일 전환 요구가 작은 것 우선

동점 처리: 위 순위를 순차 적용. 그래도 같으면 totalLateLifeShortfall 개선 폭이 큰 순.

---

## 3. v1 전략 후보 최종안 (7개)

### 3.1 전략 Patch 규칙 표

| # | strategyId | category | slotEligibility | patch 대상 | patch 방식 | 비교 자원 | 적용 조건 |
|---|-----------|----------|----------------|-----------|-----------|----------|----------|
| 1 | `delay_retire_2y` | retire_timing | best, practical | `goal.retirementAge` | +2 | — | retirementAge < lifeExpectancy - 5 |
| 2 | `reduce_expense_10` | expense_reduction | best, practical | `goal.targetMonthly` | ×0.9 (정수 반올림) | — | targetMonthly > 100 |
| 3 | `add_private_pension` | pension_addition | best, practical | `pension.products[]` | 개인연금 1건 추가 | — | 개인연금 미입력 |
| 4 | `remove_vehicle` | vehicle_removal | best, practical | `vehicle` | ownershipType → 'none' | — | vehicle.ownershipType !== 'none' |
| 5 | `debt_paydown` | debt_strategy | best, practical | `debts.*`, `assets.*` | 대출 잔액 0 + 동액 자산 차감 | **상환가용자금** | 대출 잔액 합계 > 0 AND 상환가용자금 ≥ 대출 잔액 |
| 6 | `debt_keep_invest` | debt_strategy | best, practical | `assets.*` | 상환가용자금을 투자자산에 추가 | **상환가용자금** | 대출 잔액 합계 > 0 AND 상환가용자금 > 0 |
| 7 | `housing_best` | housing_strategy | big_move | property strategy | sell 또는 secured_loan 중 선발된 쪽 | — | assets.realEstate.amount > 0 |

### 3.2 각 전략 상세

**1. 은퇴 2년 늦추기 (`delay_retire_2y`)**

- patch: `{ goal: { ...base.goal, retirementAge: base.goal.retirementAge + 2 } }`
- 의미: 2년 더 일하면 근로소득 기간 증가 + 자산 소진 지연
- 표시 예: "은퇴를 2년 늦추면 월 가능 생활비가 47만원 늘어나요"

**2. 생활비 10% 줄이기 (`reduce_expense_10`)**

- patch: `{ goal: { ...base.goal, targetMonthly: Math.round(base.goal.targetMonthly * 0.9) } }`
- 의미: 가장 직접적인 레버. 당장 실행 가능
- 표시 예: "생활비를 월 50만원 줄이면 적자 시작이 75세에서 80세로 늦춰져요"

**3. 개인연금 월 30만원 추가 (`add_private_pension`)**

- patch: pension.products 배열에 개인연금 상품 1개 추가
  - type: 'private', monthlyContribution: 30, startAge: 65, duration: 20
- 필터: 현재 개인연금 입력이 없을 때만
- 표시 예: "개인연금에 월 30만원을 넣으면 은퇴 후 월 수입이 18만원 늘어나요"

**4. 자동차 비용 제거 (`remove_vehicle`)**

- patch: `{ vehicle: { ownershipType: 'none', loanBalance: 0, loanRate: 0, loanMonths: 0, monthlyMaintenance: 0, costIncludedInExpense: 'separate' } }`
- 의미: 차량 유지비 + 할부금이 은퇴 자금에 미치는 영향
- 표시 예: "자동차를 정리하면 월 가능 생활비가 23만원 늘어나요"

**5. 대출 조기상환 (`debt_paydown`)**

> 이 전략과 `debt_keep_invest`는 반드시 **같은 비교 자원**을 놓고 비교해야 한다.
> 그래야 "대출 갚기 vs 운용 유지"의 비교가 공정하게 성립한다.

**비교 자원: 상환가용자금**

상환가용자금이란, 사용자가 대출 조기상환에 투입할 수 있는 최대 금액이다.

```
상환가용자금 = min(총 대출 잔액, 현금성 자산)

총 대출 잔액 = debts.mortgage.balance + debts.creditLoan.balance + debts.otherLoan.balance
현금성 자산 = assets.cash.amount + assets.deposit.amount
```

- v1에서는 현금성 자산(현금 + 예금)만 상환 재원으로 본다
- 주식, 채권, 암호화폐는 상환 재원에 포함하지 않는다 (매도 타이밍·세금 변수 때문)
- 상환가용자금 < 총 대출 잔액이면 debt_paydown 자체를 제외한다 (부분상환은 v2 검토)

**v1 모델: 일시 전액상환**

v1에서 debt_paydown은 "지금 당장 상환가용자금으로 대출을 전액 상환하는" 시나리오다.

이 모델을 선택한 이유:
- 가장 단순하고 시뮬레이션 결과가 명확하다
- 월 추가상환 모델은 상환 금액·기간 가정이 필요해서 변수가 늘어난다
- 사용자에게 "지금 갚으면 vs 안 갚으면"이 가장 직관적인 비교 축이다

patch 내용:

```
// 1. 대출 전액 상환
debts.mortgage.balance = 0, repaymentYears = 0
debts.creditLoan.balance = 0, repaymentYears = 0
debts.otherLoan.balance = 0, repaymentYears = 0

// 2. 상환에 쓴 금액만큼 현금성 자산 차감 (현금 먼저, 부족하면 예금)
차감액 = 총 대출 잔액
assets.cash.amount = max(0, assets.cash.amount - 차감액)
잔여 차감 = max(0, 차감액 - 원래 cash)
assets.deposit.amount = max(0, assets.deposit.amount - 잔여 차감)
```

표시 예: "대출을 지금 갚으면 유지하는 것보다 월 12만원 더 여유가 생겨요"

**6. 대출 유지 + 투자 (`debt_keep_invest`)**

> debt_paydown과 **같은 상환가용자금**을 놓고 비교하는 경쟁 전략이다.
> debt_paydown은 그 돈으로 대출을 갚고, debt_keep_invest는 그 돈을 투자자산에 넣는다.

**v1 모델: 상환가용자금을 투자자산으로 이전**

patch 내용:

```
// 1. 대출은 그대로 유지 (baseline과 동일)
debts → 변경 없음

// 2. 상환가용자금을 현금성 자산에서 빼고, 투자자산(stock_kr)에 추가
이전액 = 상환가용자금 (= min(총 대출 잔액, 현금성 자산))
assets.cash.amount = max(0, assets.cash.amount - 이전액)
잔여 이전 = max(0, 이전액 - 원래 cash)
assets.deposit.amount = max(0, assets.deposit.amount - 잔여 이전)
assets.stock_kr.amount += 이전액
```

이 모델을 선택한 이유:
- debt_paydown과 동일한 자원(상환가용자금)의 용처만 다르게 한 것이므로 비교가 공정하다
- "대출 이자 부담 유지 + 투자 수익" vs "대출 이자 제거 + 투자 기회 포기"가 명확히 비교된다
- v1에서는 이전 대상을 stock_kr(국내주식)로 고정한다. 기존 자산 배분 비중을 따르는 건 v2에서 검토

**경쟁 카테고리 처리 (debt_strategy)**

1. debt_paydown과 debt_keep_invest를 둘 다 시뮬레이션한다
2. 비교 기준: sustainableMonthly가 더 높은 쪽이 승자
3. 동점이면: failureAge가 더 늦은 쪽. 그래도 동점이면 debt_keep_invest 우선 (현상 유지가 덜 부담스럽기 때문)
4. 승자만 최종 후보에 남는다
5. 승자의 headline에 패자 대비 비교 문구를 포함한다:
   - debt_paydown 승: "대출을 지금 갚으면 유지하는 것보다 월 N만원 더 여유가 생겨요"
   - debt_keep_invest 승: "대출을 유지하면서 투자하면 조기상환보다 월 N만원 더 여유가 생겨요"

표시 예: "대출을 유지하면서 투자하면 조기상환보다 월 8만원 더 여유가 생겨요"

**7. 집 전략 (`housing_best`)**

> housing_best는 big_move 슬롯 전용이다.
> sell과 secured_loan을 각각 시뮬레이션한 뒤 더 유리한 쪽을 선발한다.

필터: assets.realEstate.amount > 0

housing_best의 상세 선발 로직은 **섹션 3.4**에서 별도로 정의한다.

### 3.3 카테고리 내 경쟁 규칙

| 카테고리 | 경쟁 전략 | 비교 기준 | 동점 처리 |
|---------|----------|----------|----------|
| debt_strategy | debt_paydown vs debt_keep_invest | sustainableMonthly 높은 쪽 | failureAge 늦은 쪽 → debt_keep_invest 우선 |
| housing_strategy | sell vs secured_loan | 섹션 3.4 참조 | 섹션 3.4 참조 |

retire_timing, expense_reduction, pension_addition, vehicle_removal은 v1에서 각 1개씩이므로 카테고리 내 경쟁 없음.

### 3.4 housing_best 선발 로직

housing_best는 sell(집 매각)과 secured_loan(집 담보대출) 중 더 유리한 쪽을 골라서 big_move 슬롯에 제안하는 전략이다.

**입력**: 기존 `calculatorV2.ts`의 `propertyOptions` 배열에서 sell과 secured_loan의 `PropertyOptionResult`를 가져온다. 추가 시뮬레이션 불필요.

**비교 기준 (순차 적용)**:

| 순서 | 기준 | 설명 |
|------|------|------|
| 1 | 기대수명 전 고갈 해소 여부 | 한쪽만 기대수명까지 생존하면 그 쪽이 승자 |
| 2 | 적자 시작 시점 개선 | deficitStartAge가 더 늦은 쪽이 승자 |
| 3 | 지속가능 생활비 증가 | sustainableMonthly가 더 높은 쪽이 승자 |
| 4 | **덜 극단적인 전략 우선** | 위 세 기준이 모두 비슷하면(차이 ≤ 12만원 AND 차이 ≤ 2년) **secured_loan 우선** |

4번 규칙의 이유: 수치가 비슷하면 집을 유지하는 secured_loan이 사용자에게 덜 부담스럽다. 집 매각은 되돌릴 수 없는 결정이므로, 효과가 비슷할 때는 덜 극단적인 쪽을 추천한다.

**"비슷하다"의 정의**: sustainableMonthly 차이 ≤ 12만원 AND failureAge/deficitStartAge 차이 ≤ 2년. 이 범위 안에 있으면 4번 규칙 적용.

**선발 결과 표시**:
- sell 선발 시: "집을 매각하면 자금 고갈 없이 기대수명까지 유지돼요"
- secured_loan 선발 시: "집을 담보로 대출받으면 자금 고갈을 N년 늦출 수 있어요"
- headline에 선발된 전략명을 명시. 패자 전략은 언급하지 않음 (big_move는 1개만 노출)

**baseline(keep)과 비교 시 delta가 0 이하인 경우**:
- 집을 건드리지 않는 게 낫다는 뜻이므로 housing_best 자체를 비워서 big_move 슬롯을 비운다

### 3.5 v2에서 추가 검토할 전략 (v1 제외)

- delay_retire_5y (은퇴 5년 늦추기) — big_move로 v2 이동
- reduce_expense_20 (생활비 20% 줄이기) — big_move로 v2 이동
- 부분 조기상환 (현금 < 대출잔액일 때)
- 상환가용자금의 자산배분 비중 반영 (stock_kr 고정 대신)
- 저축률 올리기, 투자 수익률 시나리오, 기대수명 조정
- 자녀 독립 시기 변경, 파트타임 근로, 인플레이션 시나리오

---

## 4. 추천 결과 노출 구조

### 4.1 3-슬롯 시스템

단순 상위 3개가 아니라, 성격이 다른 3개 슬롯에 각각 1개씩 배정한다.

### 4.2 슬롯 선발 규칙 표

| 슬롯 | 목적 | 선발 기준 | 제외 기준 |
|------|------|----------|----------|
| **best** | 종말 안정성 + 개선 효과를 함께 봤을 때 가장 유리한 전략 | 랭킹 1위. 우선순위: 고갈 방지 > 적자 시작 개선 > 생활비 증가 | slotEligibility에 'best' 없는 전략. big_move 전용 전략. delta ≤ 0인 전략 |
| **practical** | 효과가 충분하면서도 실행 부담이 낮은 전략. 사용자가 지금 바로 시도해볼 가능성이 높은 것 | best와 **다른 카테고리** 중, 실행 가능성 점수가 가장 높은 전략 | best와 같은 카테고리. slotEligibility에 'practical' 없는 전략. delta ≤ 0인 전략 |
| **big_move** | 효과는 크지만 큰 결정을 요구하는 전략 (집 매각, 주거 전략 변경 등) | slotEligibility에 'big_move'가 포함된 전략 중 효과 최상위 | delta ≤ 0인 전략. best/practical과 같은 카테고리 |

### 4.3 슬롯 배정 알고리즘

```
사전 처리:
  - 카테고리 내 경쟁 전략 해소 (debt_strategy, housing_strategy)
  - delta ≤ 0인 전략 전부 제거
  - 남은 전략을 랭킹 순으로 정렬

① best 슬롯 배정
   - slotEligibility에 'best'가 포함된 전략 중 랭킹 1위를 배정
   - big_move 전용 전략(housing_best)은 후보에서 제외
   - best에 배정된 전략의 카테고리를 기록 → usedCategories에 추가

② practical 슬롯 배정
   - usedCategories에 없는 카테고리의 전략만 후보
   - slotEligibility에 'practical'이 포함된 전략만 후보
   - 후보 중 실행 가능성 점수가 가장 높은 전략을 배정
   - 실행 가능성 점수 (높을수록 바로 실행하기 쉬움):
     ① remove_vehicle (5점) — 차를 정리하기만 하면 됨
     ② reduce_expense_10 (4점) — 생활 패턴 조정
     ③ add_private_pension (3점) — 가입 행위 필요
     ④ delay_retire_2y (2점) — 직장/커리어 상황에 의존
     ⑤ debt_strategy 승자 (1점) — 자산 재배치 결정 필요
   - 동일 점수면 랭킹 순
   - practical에 배정된 전략의 카테고리를 usedCategories에 추가

③ big_move 슬롯 배정
   - slotEligibility에 'big_move'가 포함된 전략 중 효과 최상위
   - usedCategories에 없는 카테고리만 (사실상 housing_strategy는 best/practical과 겹칠 일 없음)
   - 해당 전략이 없으면 슬롯 비움 → 카드 2개만 표시

④ 최종 검증
   - 3개 슬롯에 같은 카테고리가 2개 이상 존재하면 → 하위 슬롯(big_move → practical 순)을 다음 후보로 교체
   - best와 practical이 모두 비면 → "현재 입력 기준으로 안정적인 계획이에요"
```

### 4.4 best와 practical 중복 방지 규칙

best와 practical은 반드시 서로 다른 성격의 추천이어야 한다.

- **카테고리 중복 금지**: best가 retire_timing이면 practical은 retire_timing 불가
- **실행 난이도 차이**: practical은 best보다 실행 부담이 낮은 전략이 오도록 실행 가능성 점수로 선발
- **효과 크기 ≠ 실행 가능성**: best는 "효과가 제일 좋은 것", practical은 "바로 할 수 있는 것"이므로 자연스럽게 다른 전략이 선발됨

예시:
- best = delay_retire_2y (효과 큼), practical = remove_vehicle (바로 실행 가능), big_move = housing_best
- best = reduce_expense_10 (효과 큼), practical = add_private_pension (가입하면 됨), big_move = housing_best

### 4.5 카드 구조

```
┌─────────────────────────────────────────────────┐
│ [슬롯 라벨]  "가장 효과적" / "바로 실행 가능" / "큰 결정"
│                                                   │
│ [headline]                                        │
│ "은퇴를 2년 늦추면 월 가능 생활비가 47만원 늘어나요" │
│                                                   │
│ [detail]                                          │
│ "현재 58세 은퇴 → 60세 은퇴로 바꾸면               │
│  적자 시작 75세 → 80세, 월 320만원 → 367만원"       │
│                                                   │
│ [delta badges]                                    │
│  +47만원/월  |  적자 시작 +5년  |  고갈 방지 ✓     │
└─────────────────────────────────────────────────┘
```

### 4.6 슬롯 라벨

| 슬롯 | 라벨 | 색상 톤 |
|------|------|--------|
| best | "가장 효과적" | 강조색 (ink) |
| practical | "바로 실행 가능" | 보조색 (subtle) |
| big_move | "큰 결정" | 경고색 (amber/yellow) |

### 4.7 텍스트 생성 규칙

**headline** (1줄, bold):
- 패턴: "[행동]하면 [효과 지표]가 [수치] [방향]"
- 효과 지표 우선순위: 고갈 방지 > 적자 시작 지연 > 생활비 증가
- 대출 전략은 반드시 비교 대상 명시: "조기상환보다" / "유지보다"

**detail** (1-2줄, 회색):
- 패턴: "현재 [기준값] → [변경값]으로 바꾸면 [결과 변화]"
- 적자 시작 시점, 고갈 시점, 생활비 변화를 조합

**delta badges** (하단 태그, 최대 3개):
- `+N만원/월`: sustainableMonthly 변화
- `적자 시작 +N년`: deficitStartAge 변화
- `고갈 시점 +N년` 또는 `고갈 방지 ✓`: failureAge 변화
- 유의미한 것만 표시. 변화 없으면 생략.

### 4.8 노출 규칙

- 최대 3개 표시 (슬롯별 1개)
- delta ≤ 0인 전략은 어떤 슬롯에도 배정 안 됨
- 동일 카테고리는 전체 3개 슬롯에서 1개만 존재
- big_move 슬롯이 비면 2개만 표시
- best와 practical이 모두 비면 → 빈 상태 메시지

### 4.9 빈 상태 처리

"현재 입력 기준으로 안정적인 계획이에요. 입력값을 바꾸면 바로 다시 확인할 수 있어요."

---

## 5. 제품적으로 주의할 점

### 5.1 "조언"이 아니라 "비교 결과"

- "~하세요", "~해야 합니다" 톤 금지
- O: "은퇴를 2년 늦추면 월 가능 생활비가 47만원 늘어나요"
- X: "은퇴를 2년 늦추세요"
- O: "대출을 지금 갚으면 유지하는 것보다 월 12만원 더 여유가 생겨요"
- X: "대출을 갚으세요"

### 5.2 대출 비교의 뉘앙스

- "갚는 게 무조건 좋다"가 아니라 "비교해보니 어느 쪽이 더 유리했다"
- 투자 수익률 > 대출 이자율이면 유지가 유리할 수 있음
- 이 판단을 사용자에게 떠넘기지 않고, 시뮬레이션 결과로 보여줌
- headline에 반드시 비교 대상 명시

### 5.3 큰 결정 전략의 톤

- big_move는 "이렇게 하면 좋다"가 아니라 "이런 선택지도 있다" 톤
- 집 매각은 감정적 저항이 크므로, 숫자만 보여주고 판단은 사용자에게
- 카드 라벨 "큰 결정"이 "쉽지 않은 선택"이라는 신호

### 5.4 성능

- 실질 시뮬레이션 횟수: 기존 3회(keep/sell/secured_loan) + 추가 5-6회(counterfactual) = 총 8-9회
- housing_best는 기존 propertyOptions 결과를 재사용하므로 추가 시뮬 불필요
- 측정 필수: 전체 계산 시간이 사용자 체감에 영향 주는지 확인
- 최적화 옵션: binary search 범위 축소, Web Worker 분리(v2)

### 5.5 잘못된 추천 방지

- 역효과 전략 제거: delta ≤ 0 → 절대 표시 안 함
- 비현실적 전략 제거: retirementAge + 2 > lifeExpectancy - 5 → delay_retire_2y 제외
- 중복 카테고리 제거: 3개 슬롯 통틀어 같은 카테고리 1개만
- 상황 부적합 필터: 차 없으면 remove_vehicle 제외, 집 없으면 housing_best 제외, 대출 없으면 debt_strategy 제외
- 대출 자산 부족: 상환가용자금 < 총 대출 잔액이면 debt_paydown 제외 (v1은 전액상환만)

### 5.6 숫자의 신뢰성

- binary search는 정수 단위(만원)이므로 delta도 정수 단위
- "47만원 늘어나요"는 시뮬레이션 결과이지 추정이 아님
- 카드 하단에 "현재 입력 기준 시뮬레이션 결과입니다" 한 줄 추가 검토

---

## 6. 구현 우선순위

### Phase 1: 엔진 코어

**파일**: `src/engine/counterfactualEngine.ts` (신규)

- [ ] 타입 정의: InputPatch, ComparisonMetrics, SlottedRecommendation
- [ ] 7개 전략의 apply + isApplicable 함수
- [ ] 상환가용자금 계산 유틸
- [ ] deficitStartAge 추출 유틸 (월별 snapshot 순회)
- [ ] totalLateLifeShortfall 추출 유틸
- [ ] 카테고리 내 경쟁 처리 (debt_strategy, housing_strategy)
- [ ] housing_best 선발 로직 (섹션 3.4 규칙)
- [ ] 3-슬롯 배정 로직 (섹션 4.3 알고리즘)
- [ ] runCounterfactualAnalysis 진입 함수
- [ ] 단위 테스트

### Phase 2: 텍스트 생성 (Phase 1 의존)

**파일**: `src/engine/counterfactualCopy.ts` (신규)

- [ ] generateHeadline, generateDetail, generateDeltaBadges
- [ ] 대출 비교 전략의 비교 대상 텍스트 분기
- [ ] 각 strategyId별 텍스트 템플릿
- [ ] 단위 테스트

### Phase 3: UI 연결 (Phase 2 의존)

**파일**: `src/components/layout/ActionPlanSection.tsx` (수정)

- [ ] buildActionItems를 3-슬롯 기반으로 교체
- [ ] 슬롯 라벨 UI
- [ ] delta badges UI
- [ ] 빈 상태 / 슬롯 2개 상태 처리

### Phase 4: Store 연결 (Phase 3와 병렬 가능)

**파일**: `src/store/` (기존 store 수정)

- [ ] runCalculationV2 이후 runCounterfactualAnalysis 호출
- [ ] 결과를 store에 저장
- [ ] housing_best는 기존 propertyOptions 결과 재사용

### Phase 5: 성능 측정 및 최적화

- [ ] 전체 계산 시간 측정
- [ ] binary search 범위 축소 적용 검토
- [ ] debounce 강화 또는 Web Worker 분리 검토
