---
name: deploy
description: indentcorp/backend 모노레포의 서비스(spray, socialscan, blaster)를 배포합니다. 릴리즈 드래프트에서 PR 목록을 추출하고, Slack #release-notice 채널에 배포 알림을 보낸 뒤, GitHub Actions CD 워크플로우를 트리거합니다. '배포해줘', 'deploy', '프로덕션 배포' 등 요청 시 활성화됩니다.
allowed-tools: Bash(gh:*) Bash(agent-slack:*)
---

# Deploy Skill

indentcorp/backend 모노레포 서비스를 배포하는 스킬.

## 지원 서비스

- spray
- socialscan
- blaster

## 배포 절차

### Step 1. 서비스 선택

사용자에게 spray, socialscan, blaster 중 어떤 서비스를 배포할지 물어본다.

### Step 2. 릴리즈 드래프트 확인

```bash
gh release list --repo indentcorp/backend --limit 20 | grep Draft
```

선택된 서비스의 Draft 릴리즈를 찾는다. 릴리즈 태그 패턴: `{service}@{date}`

Draft가 없으면 사용자에게 "현재 {service}의 릴리즈 드래프트가 없습니다"라고 알린다.

### Step 3. PR 목록 추출

Draft 릴리즈는 같은 태그명의 Published 릴리즈와 공존할 수 있으므로, 반드시 GitHub API로 draft만 조회한다:

```bash
gh api repos/indentcorp/backend/releases --jq '.[] | select(.draft == true and (.tag_name | startswith("{service}"))) | .body'
```

응답의 `body`에서 `## Upcoming Changes` 섹션 아래 `* [TICKET] description (#PR)` 형식의 라인들을 추출한다.

> **주의**: `gh release view`는 같은 태그명의 Published 릴리즈를 반환할 수 있으므로 사용하지 않는다.

### Step 4. Slack #release-notice 채널에 배포 알림 전송

채널 ID: `C04ABEMS4PQ`

메시지 포맷:
```
{service} 배포합니다.
{PR 목록 - bullet point list}
```

- 불릿은 `•` (유니코드 bullet)를 사용한다. Slack mrkdwn은 `- `를 리스트로 렌더링하지 않는다.
- PR 번호는 GitHub PR 링크로 변환한다. Slack 링크 서식: `<URL|표시텍스트>`

예시:
```
socialscan 배포합니다.
• [SOCIALSCAN-56V] collect_video_task에서 PrivateUserError 처리 추가 (<https://github.com/indentcorp/backend/pull/14696|#14696>)
• [SOCIALSCAN-56Y] TikTok 동영상 조회 시 10203, 10231 에러 코드 NotFoundError 처리 (<https://github.com/indentcorp/backend/pull/14699|#14699>)
```

```bash
agent-slack message send C04ABEMS4PQ "{message}"
```

### Step 5. 배포 옵션 선택

사용자에게 다음 옵션을 물어본다 (questionnaire 사용):

- **브랜치**: 배포할 브랜치 (기본값: `main`)
- **환경**: `prod` 또는 `dev` (기본값: `prod`)

사용자가 별도로 지정하지 않으면 기본값을 사용한다.

### Step 6. 최종 확인 후 CD 워크플로우 트리거

배포 실행 전, 사용자에게 최종 확인을 받는다:

```
배포 정보:
- 서비스: {service}
- 브랜치: {branch}
- 환경: {env}

진행할까요?
```

확인을 받으면 CD 워크플로우를 트리거한다:

```bash
gh workflow run cd.yml --repo indentcorp/backend --ref {branch} \
  -f project={service} \
  -f env={env}
```

트리거 후 워크플로우 실행 URL을 확인하여 사용자에게 공유한다:

```bash
gh run list --repo indentcorp/backend --workflow cd.yml --limit 1 --json url,status
```
