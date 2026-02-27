---
name: code-review
description: 멀티 모델 코드 리뷰. Codex 5.3, Gemini 3 Pro, Claude Opus 4.6 세 모델이 병렬로 코드를 리뷰하고 종합 리포트를 생성합니다. 코드 리뷰, PR 리뷰, diff 리뷰 요청 시 활성화됩니다.
---

# 멀티 모델 코드 리뷰

3개의 AI 모델(Codex 5.3, Gemini 3 Pro, Claude Opus 4.6)이 xhigh thinking으로 독립 리뷰 후, 결과를 종합하여 최종 리포트를 생성합니다.

## 설정 (최초 1회)

```bash
cd <skill_directory> && npm install
```

## 실행 전 확인 (필수)

스크립트를 실행하기 전에 반드시 사용자에게 다음 3가지를 확인하세요:

1. **대상 브랜치** — 리뷰할 브랜치 (기본값: 현재 브랜치)
2. **베이스 브랜치** — 비교 기준 브랜치 (기본값: main)
3. **집중 영역** — 리뷰 시 특별히 봐야 할 부분 (선택)

사용자가 이미 명시한 값은 다시 묻지 않아도 됩니다.

## 사용법

```bash
cd <skill_directory> && npx tsx review.ts [target_branch] [base_branch] [focus...]
```

### 매개변수

| 매개변수 | 기본값 | 설명 |
|---------|-------|------|
| `target_branch` | HEAD (현재 브랜치) | 리뷰 대상 브랜치 |
| `base_branch` | main | 비교 기준 브랜치 |
| `focus...` | (없음) | 리뷰 시 특별히 집중할 영역 (선택) |

브랜치명에 `origin/` 접두사는 자동으로 처리됩니다.

### 예시

```bash
# 현재 브랜치를 main 대비 리뷰
npx tsx review.ts

# 특정 브랜치를 특정 베이스와 비교
npx tsx review.ts qodot/SPR-4142 qodot/SPR-4141

# 집중 영역 지정
npx tsx review.ts HEAD main "에러 핸들링과 타입 안전성"
```

## 실행 흐름

1. 대상/베이스 브랜치 간 git diff 추출
2. 3개 모델에 병렬로 리뷰 요청 (각 모델은 read, bash 도구로 코드 컨텍스트 추가 확인 가능)
3. 3개 리뷰 결과를 Claude Sonnet 4.6이 종합하여 최종 리포트 생성

## 주의사항

- 3개 모델을 병렬 실행하므로 API 비용이 발생합니다
- xhigh thinking 레벨 사용으로 완료까지 수 분 소요될 수 있습니다
- 진행 상황은 stderr, 최종 리포트는 stdout으로 출력됩니다
- `interactive_shell`로 실행 시 반드시 `autoExitOnQuiet: false`를 설정할 것 (모델 thinking 중 출력이 없어 조기 종료될 수 있음)
