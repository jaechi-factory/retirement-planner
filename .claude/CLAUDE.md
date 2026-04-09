# retirement-planner
> 전역 원칙은 ~/.claude/CLAUDE.md 참조. 이 파일은 이 프로젝트 고유 정보만.

## 기술 스택
- React 18 + TypeScript + Vite
- 스타일링: Tailwind CSS v4
- 차트: Recharts
- 상태관리: Zustand
- 배포: Vercel (main 브랜치 자동 배포)

## 핵심 파일 경로
- `src/components/layout/ResultWorkbench.tsx` — 결과 화면 전체 구조
- `src/components/result/TransitionSection.tsx` — 금융자산 소진 전환점 설명 컴포넌트
- `src/components/charts/AssetBalanceChart.tsx` — 자산 잔액 차트
- `src/components/charts/PropertyAssetChart.tsx` — 부동산 자산 차트
- `src/components/result/v2/` — 탭별 결과 컴포넌트 (SummaryTab, PensionTab, YearlySummaryTable 등)
- `src/components/input/` — 입력 섹션들

## 이번 세션 집중 범위
- (세션마다 업데이트. 현재 작업 중인 것만 작성.)

## 금지
- 검증 없이 완료 선언
- 승인 없는 범위 확장
- 관련 없는 리팩터링
- typecheck 실패 상태로 배포

## QA 기준 (이 프로젝트 필수 시나리오)
- 금융자산 소진 + 집 없음
- 금융자산 소진 + 집 있음
- 금융자산 소진 없음
- TransitionSection 렌더 조건 (소진 발생 여부에 따른 분기)
- 차트 데이터와 텍스트 설명 일치 여부

## 배포 방법
```bash
git add [파일] && git commit -m "[type]: [설명]" && git push
vercel --prod
# 자동배포 사용 안 함 — 반드시 vercel --prod 직접 실행
```

## 특이사항
- v3.1 결과 화면 구조 리팩터링 완료 (2026-03-30)
- strategyLabel, targetMonthly props가 차트 컴포넌트에 필수
- TypeScript strict mode 사용 중
