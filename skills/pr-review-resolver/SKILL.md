---
name: pr-review-resolver
description: GitHub PR에 달린 리뷰 코멘트를 수집·분석하고, 각 항목에 대해 해결책 후보를 제시하며 하나씩 처리합니다. PR 링크와 함께 '리뷰 처리해줘', '리뷰 반영해줘', 'PR 코멘트 처리' 등 요청 시 활성화됩니다.
---

# PR 리뷰 리졸버

GitHub PR에 달린 리뷰 코멘트를 모두 수집하고, 각 코멘트를 분석하여 해결책 후보를 제시하며 사용자와 하나씩 처리합니다.

## 전제 조건

- `gh` CLI가 설치되어 있고 인증된 상태여야 합니다
- 프로젝트 루트(git 저장소)에서 실행해야 합니다

## 전체 흐름

```
PR URL 파싱 → 리뷰 코멘트 수집 → 코드 컨텍스트 분석 → 항목별 순회 → 완료 요약
```

## Phase 1: PR URL 파싱

사용자가 제공한 PR URL에서 owner, repo, PR 번호를 추출합니다.

```
https://github.com/{owner}/{repo}/pull/{number}
```

URL 없이 PR 번호만 제공한 경우, 현재 git remote에서 owner/repo를 추출합니다.

## Phase 2: 리뷰 코멘트 수집

`gh` CLI로 PR의 모든 리뷰 코멘트를 가져옵니다.

### 2-1. 리뷰 코멘트 (코드에 달린 코멘트)

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate --jq '.[] | {
  id: .id,
  reviewer: .user.login,
  path: .path,
  line: (.original_line // .line),
  side: .side,
  body: .body,
  in_reply_to_id: .in_reply_to_id,
  created_at: .created_at
}'
```

### 2-2. PR 리뷰 본문 (전체 리뷰 코멘트)

```bash
gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '.[] | select(.body != "") | {
  id: .id,
  reviewer: .user.login,
  state: .state,
  body: .body
}'
```

### 2-3. 일반 이슈 코멘트

```bash
gh api repos/{owner}/{repo}/issues/{number}/comments --paginate --jq '.[] | {
  id: .id,
  reviewer: .user.login,
  body: .body,
  created_at: .created_at
}'
```

### 2-4. 코멘트 정리

수집한 코멘트를 다음 기준으로 정리합니다:

- **스레드 그룹핑**: `in_reply_to_id`로 대화 스레드를 묶는다. 이미 해결된 대화(resolved)는 제외한다
- **봇 제외**: CI 봇, lint 봇 등 자동 생성 코멘트는 제외한다
- **중복 제거**: 같은 내용을 여러 리뷰어가 지적한 경우 하나로 합친다

## Phase 3: 코드 컨텍스트 분석

각 코멘트에 대해 해당 코드를 `read`로 읽어 컨텍스트를 파악합니다.

- 코멘트가 가리키는 파일과 라인 주변 코드 확인
- 관련 함수/메서드의 전체 맥락 이해
- 리뷰어의 의도와 요청 사항 분석

분석 후 각 코멘트를 분류합니다:

| 분류 | 설명 |
|------|------|
| 🔴 must-fix | 버그, 보안 이슈, 로직 오류 등 반드시 수정 필요 |
| 🟡 should-fix | 코드 품질, 가독성, 성능 등 수정 권장 |
| 🟢 nit | 스타일, 네이밍 등 사소한 제안 |
| 💬 question | 질문 또는 논의 필요 |

## Phase 4: 항목별 순회

전체 요약을 먼저 표시한 뒤, 각 항목을 심각도 높은 순으로 사용자에게 제시합니다.

### 4-1. 전체 요약

```
📋 PR #{number}: {PR 제목}
리뷰어: {리뷰어 목록}
코멘트: 총 N개 (🔴 n개, 🟡 n개, 🟢 n개, 💬 n개)
```

### 4-2. 항목 제시

각 항목을 다음 형식으로 표시합니다:

```
[N/총개수] 🔴 must-fix — 이슈 요약
📁 파일경로:라인 | 💬 리뷰어명

리뷰어 코멘트 원문...

━━━ 해결책 후보 ━━━

A. {해결책 1 설명}
B. {해결책 2 설명}
C. {해결책 3 설명} (해당되는 경우)
```

해결책 후보는 코드 컨텍스트를 분석하여 구체적으로 제시합니다:
- 코드 수정을 제안할 때는 반드시 기존 코드와의 diff 형식으로 함께 보여준다
- 각 해결책의 트레이드오프를 간단히 설명한다
- 리뷰어의 제안이 명확하면 그것을 A안으로 포함한다

### 4-3. 사용자 선택

`question` 도구로 선택지를 제시합니다:

- **"A안으로 수정"** / **"B안으로 수정"** / **"C안으로 수정"** — 해당 해결책을 적용
- **"직접 설명"** — 사용자가 원하는 방식을 직접 설명
- **"건너뛰기"** — 이 항목을 넘기고 다음으로
- **"리뷰 종료"** — 남은 항목을 모두 건너뛰고 종료

### 4-4. 수정 적용

선택된 해결책에 따라:

1. 해당 파일을 `read`로 읽는다
2. `edit`으로 코드를 수정한다
3. 수정 결과를 간단히 보여준다
4. 다음 항목으로 진행한다

## Phase 5: 완료 요약

모든 항목 처리 후 결과를 요약합니다:

```
✅ PR 리뷰 처리 완료

수정: N개
건너뜀: N개
수정된 파일:
  - path/to/file1.ts
  - path/to/file2.ts
```

`question` 도구로 후속 작업을 확인합니다:

- **"커밋 & 푸시"** — 수정사항을 커밋하고 푸시
- **"diff 확인"** — `git diff`로 전체 변경사항 확인 후 다시 선택
- **"종료"** — 수정사항을 커밋하지 않고 종료
