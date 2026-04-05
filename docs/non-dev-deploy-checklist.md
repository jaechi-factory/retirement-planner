# 비개발자용: 자동 배포 한 번만 설정하기

아래 3가지만 하면 됩니다.

## 1) GitHub 저장소 Secrets 등록
GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** 에서 아래 3개를 추가하세요.

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

> 세 값은 Vercel 프로젝트 설정/CLI에서 확인할 수 있습니다.

## 2) 기본 브랜치 확인
- 배포 워크플로우는 `main` 브랜치 푸시 시 자동 실행됩니다.

## 3) 확인 방법
- GitHub 저장소 → **Actions** 탭 → `Deploy to Vercel` 워크플로우 실행 여부 확인
- 성공하면 Vercel Production URL이 갱신됩니다.

---

## 지금 상태에서 해야 할 최소 작업
1. 이 브랜치를 GitHub에 푸시
2. Pull Request 머지 (main 반영)
3. 위 Secrets 3개 등록

이후부터는 main에 머지될 때마다 자동 배포됩니다.
