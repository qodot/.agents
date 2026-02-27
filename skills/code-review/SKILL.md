---
name: code-review
description: 멀티 모델 코드 리뷰. Codex 5.3, Gemini 3 Flash, Claude Opus 4.6 세 모델이 병렬로 리뷰하고 종합 리포트를 생성합니다. 코드 리뷰, PR 리뷰, diff 리뷰 요청 시 활성화됩니다.
---

# 멀티 모델 코드 리뷰

3개의 AI 모델(Codex 5.3, Gemini 3 Flash, Claude Opus 4.6)이 xhigh thinking으로 독립 리뷰 후, 결과를 종합하여 최종 리포트를 생성합니다.

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

프로젝트 루트(git 저장소)에서 실행해야 합니다. 글로벌 스킬이므로 tsx와 review.ts는 스킬 디렉토리의 절대 경로를 사용합니다.

```bash
<skill_directory>/node_modules/.bin/tsx <skill_directory>/review.ts [target_branch] [base_branch] [focus...]
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
3. 3개 리뷰 결과를 Claude Opus 4.6이 종합하여 구조화된 JSON으로 생성
4. 개별 리뷰 + 종합 리포트를 `reviews/{브랜치명}_{타임스탬프}.md`로 저장
5. 구조화된 리뷰 항목을 `reviews/{브랜치명}_{타임스탬프}_items.json`으로 저장
6. stdout으로 `{ reportPath, itemsPath }` JSON 출력

## 스크립트 완료 후: 인터랙티브 리뷰

스크립트가 완료되면, stdout 마지막 줄의 JSON에서 `itemsPath`를 파싱합니다.
`itemsPath`가 존재하면 (null이 아니면) 아래 절차를 따릅니다.
`itemsPath`가 null이면 "JSON 파싱에 실패하여 인터랙티브 리뷰를 진행할 수 없습니다. 리포트 파일을 확인해주세요."라고 안내합니다.

### 1. 항목 파일 읽기

`itemsPath`의 JSON 파일을 읽습니다. 구조:

```json
{
  "summary": "종합 평가",
  "score": 7,
  "verdict": "approve | request-changes",
  "items": [
    {
      "id": 1,
      "severity": "critical | major | minor | suggestion",
      "file": "파일 경로",
      "line": "라인 번호",
      "title": "이슈 제목",
      "description": "상세 설명",
      "suggestion": "수정 제안",
      "recommendation": "must-fix | recommended | optional",
      "reporters": ["리뷰어명"]
    }
  ]
}
```

### 2. 전체 요약 표시

먼저 종합 요약을 표시합니다:
- 점수, 판정 (approve/request-changes)
- 총 항목 수 (severity별 개수)
- summary 내용

### 3. 항목별 순회

각 항목을 순서대로 (severity 높은 순) 사용자에게 제시합니다:

1. 항목 정보를 표시합니다:
   ```
   [N/총개수] 🔴 CRITICAL — 이슈 제목
   📁 파일경로:라인 | 지적: 리뷰어1, 리뷰어2

   설명 내용...

   💡 제안: 수정 방법...
   ```

2. `question` 도구로 사용자에게 선택지를 제시합니다:
   - **"제안대로 수정"** — suggestion 내용을 참고하여 해당 코드를 수정합니다
   - **"건너뛰기"** — 이 항목을 무시하고 다음으로 넘어갑니다
   - **"리뷰 종료"** — 남은 항목을 모두 건너뛰고 종료합니다

3. "제안대로 수정" 선택 시:
   - 해당 파일을 읽고 suggestion을 참고하여 코드를 수정합니다
   - 수정 완료 후 다음 항목으로 진행합니다

### 4. 완료 요약

모든 항목 처리 후 결과를 요약합니다:
- 수정된 항목 수
- 건너뛴 항목 수
- 수정된 파일 목록

## 주의사항

- 3개 모델을 병렬 실행하므로 API 비용이 발생합니다
- xhigh thinking 레벨 사용으로 완료까지 수 분 소요될 수 있습니다
- 진행 상황은 stderr, 파일 경로 JSON은 stdout으로 출력됩니다
- `interactive_shell`로 실행 시 반드시 `autoExitOnQuiet: false`를 설정할 것 (모델 thinking 중 출력이 없어 조기 종료될 수 있음)
