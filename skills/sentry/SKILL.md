---
name: sentry
description: Sentry 이슈 URL을 받아 REST API로 상세 정보(스택트레이스, breadcrumbs, 태그 등)를 조회하고, 코드베이스를 분석하여 원인 분석과 해결책 후보를 제시합니다. 센트리 에러, Sentry 이슈 디버깅, 에러 분석 요청 시 활성화됩니다.
---

# Sentry Issue Analyzer

Sentry 이슈 URL → REST API 상세 조회 → 원인 분석 → 해결책 후보 제시

## Setup

환경변수 설정 (셸 프로필에 추가):
```bash
export SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

토큰 발급: Sentry Settings > Auth Tokens (필요 권한: `project:read`, `event:read`)

## 사용법

### 1단계: 이슈 정보 수집

사용자로부터 Sentry 이슈 URL을 받으면 아래 스크립트를 실행합니다:

```bash
python3 {baseDir}/scripts/fetch-issue.py "<sentry-issue-url>"
```

### 2단계: 원인 분석

수집된 정보를 바탕으로 다음을 수행합니다:

1. **스택트레이스 분석**: `→` 마커가 붙은 in-app 프레임이 핵심입니다. 해당 파일과 라인을 프로젝트 코드베이스에서 찾아 `read`로 읽습니다.
2. **에러 컨텍스트 파악**: breadcrumbs, HTTP request, tags 정보를 종합하여 에러 발생 흐름을 재구성합니다.
3. **관련 코드 탐색**: 스택트레이스의 파일 경로를 기반으로 `find`/`rg`로 프로젝트 내 해당 파일을 찾고, 에러 지점 전후 코드를 분석합니다.

### 3단계: 결과를 파일로 저장

분석 결과를 프로젝트의 `.agents/errors/{short-id}.md` 파일로 저장합니다.
- `{short-id}`는 1단계에서 조회한 이슈의 `Short ID`입니다 (예: `SOCIALSCAN-4K`)
- 프로젝트 루트는 현재 작업 디렉토리 기준입니다

파일 형식:

```markdown
# Sentry Issue {short-id}

- **URL**: [Sentry 이슈 URL]
- **에러 타입**: [예외 클래스]
- **발생 위치**: [파일:라인]
- **최초 발생**: [first_seen]
- **마지막 발생**: [last_seen]
- **발생 횟수**: [count]

## 🔍 원인 분석

[에러 타입, 발생 위치, 발생 조건을 구체적으로 설명]
[breadcrumbs/request 정보를 활용한 에러 흐름 재구성]
[왜 이 에러가 발생하는지 근본 원인 설명]

## 🛠️ 해결책 후보

아래에서 적용할 해결책을 선택해주세요:

1. **[해결책 제목]**
   - 변경 사항: [어떤 파일의 어떤 부분을 어떻게 수정]
   - 장점: ...
   - 단점/리스크: ...

2. **[해결책 제목]**
   - 변경 사항: ...
   - 장점: ...
   - 단점/리스크: ...

3. **[해결책 제목]** (있다면)
   ...
```

### 4단계: 해결책 확정

사용자가 제안된 해결책 중 하나를 선택하거나, 새로운 해결책을 직접 제시할 수 있습니다.

**새로운 해결책을 제시한 경우**, 3단계에서 저장한 `.agents/errors/{short-id}.md` 파일에 아래 섹션을 추가합니다:

```markdown
## ✅ 채택된 해결책 (유저 논의)

> 제안된 후보가 아닌, 유저와의 논의를 통해 도출된 해결책입니다.

- **해결책**: [유저가 제시한 해결책 설명]
- **채택 사유**: [기존 후보 대비 이 해결책을 선택한 이유]
- **변경 사항**: [어떤 파일의 어떤 부분을 어떻게 수정]
```

**기존 후보를 선택한 경우**, 아래 섹션을 추가합니다:

```markdown
## ✅ 채택된 해결책

- **선택**: 후보 {N}번 - [해결책 제목]
```

### 5단계: 브랜치 생성 및 해결책 적용

확정된 해결책을 기반으로:

1. **브랜치 생성**: `{projectname}/{gituser}/{short-id}` 형식으로 새 브랜치를 만듭니다.
   - `{projectname}`: 현재 프로젝트 디렉토리명 (`basename $(pwd)`)
   - `{gituser}`: Git 사용자명 (`git config user.name`)
   - `{short-id}`: Sentry 이슈 Short ID (예: `SOCIALSCAN-4K`)
   ```bash
   git switch -c "{projectname}/{gituser}/{short-id}"
   ```
2. **코드 수정**: 선택된 해결책에 따라 `edit` 도구로 코드를 변경합니다.
3. **변경 사항 커밋**: 수정된 파일을 커밋합니다.
   ```bash
   git add -A
   git commit -m "fix: resolve sentry issue {short-id}"
   ```
4. **에러 파일 커밋**: `.agents/errors/{short-id}.md`도 함께 커밋합니다.
5. **PR 생성**: GitHub PR을 생성합니다.
   ```bash
   git push -u origin HEAD
   gh pr create --title "fix: resolve sentry issue {short-id}" --body "Sentry Issue: {sentry-issue-url}"
   ```
6. **Sentry 이슈에 PR 연결**: PR URL을 Sentry 이슈에 코멘트로 남깁니다.
   ```bash
   python3 {baseDir}/scripts/link-pr.py "<sentry-issue-url>" "<pr-url>"
   ```

## 주의사항

- 스택트레이스의 파일 경로가 프로젝트 구조와 다를 수 있습니다. `find`로 실제 경로를 확인하세요.
- 여러 예외가 chained된 경우, 가장 안쪽(root cause) 예외부터 분석하세요.
- 해결책은 최소 2개 이상 제시하고, 각각의 트레이드오프를 명확히 합니다.
