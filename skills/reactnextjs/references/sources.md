# 출처와 조사 범위

로컬에서 확인한 지침을 요약한 인덱스다. 경로의 `~`는 사용자 홈을 뜻한다. 프로젝트나 플러그인이 갱신되면 해당 원본을 먼저 확인한다.

## 공통 기준

| 적용 내용 | 원본 |
| --- | --- |
| 구현 전 기존 패턴 추적, 라우트와 설정 이름, PR 검증, 브라우저와 계측 | `~/.agents/AGENTS.md`의 구현 전 기존 패턴 확인, 로그와 계측 보고, 도구 장애 복구와 작업 재개, 브라우저 선택 |
| 같은 화면의 URL 변경과 탐색, 서버 경계와 렌더링 비용 | Icarus `AGENTS.md`의 프론트엔드 렌더링 비용과 브라우저로 보내는 코드, Huxley `docs/coding-rules.md`의 RC, NXT, URL |
| 동작 중심 테스트, 테스트 실행 환경과 가상 타이머 | Icarus `.agents/skills/icarus-testing/SKILL.md`, Huxley `docs/coding-rules.md`의 TST와 `e2e/AGENTS.md`, Spray `AGENTS.md`와 `.cursor/rules/spray-rule.mdc` |
| 삭제한 라우트의 문자열 참조 및 경로 특수문자 | `~/.agents/skills/dead-code-removal/SKILL.md` |
| 설치된 Next.js 버전과 문서 우선 | `~/workspace/indent/indent/apps/web/AGENTS.md` |
| 같은 화면에서 `useSearchParams()`로 선택을 읽는 실제 사례 | Icarus의 [PR #3808](https://github.com/indentcorp/icarus/pull/3808), [Next.js Native History API 문서](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api) |

`~/.codex/AGENTS.md`와 `~/.claude/CLAUDE.md`는 이 환경에서 같은 `~/.agents/AGENTS.md`를 가리킨다.

## 프로젝트 원본

- **Icarus**는 `~/workspace/indent/icarus`. `AGENTS.md`, `CLAUDE.md`, `design-system/index.md`, `tokens.css`, `grid.md`, `component-page.md`, `copy.md`, `.agents/skills/{ux-writing,icarus-testing,icarus-git}/SKILL.md`, DOM preload와 `/design` 카탈로그 소스.
- **Huxley**는 `~/workspace/indent/huxley`. `AGENTS.md`, `docs/coding-rules.md`의 General, Testing, TS, RC, GQL, NXT, URL, ORG, `.agents/skills/design-system-guide/SKILL.md`, `apps/storefront/AGENTS.md`, `docs/storefront-cognitive-psych.md`, `packages/web-shared/dictionary/AGENTS.md`, `e2e/AGENTS.md`.
- **Spray 프론트엔드**는 `~/workspace/indent/frontend`. `AGENTS.md`, `.cursor/rules/spray-rule.mdc`, `apps/{spray-web,spray-sendlab,spray-design-system,vovu-shopfront}/AGENTS.md`, Spray Web의 `src/client/`, `src/client/effects/`, `src/ui/screens/` README, `packages/spray/README.md`, `apps/vreview-widget-react/README.md`, `.agents/skills/frontend-git/SKILL.md`.
- **Sanabi**는 `~/workspace/indent/sanabi`의 `AGENTS.md`, `.agents/skills/testing/SKILL.md`, `.agents/skills/ux-writing/SKILL.md`.
- **Hermes Agent**는 `~/workspace/qodot/hermes-agent`의 `web/AGENTS.md`, `apps/desktop/src/AGENTS.md`, `tests/AGENTS.md`. 웹 계층과 데스크톱 앱, TypeScript 테스트 각각의 경계가 적용된다.

## 스킬 원본

- `~/.agents/skills`의 StyleSeed 계열. 규칙 해석은 `styleseed`, `ss-resolve`, `ss-setup`, `ss-update`. 구현은 `ss-build`, `ss-component`, `ss-page`, `ss-pattern`, `ss-flow`. 디자인 조정은 `ss-tokens`, `ss-motion`, `ss-feedback`, `ss-copy`, `ss-reference`, `ss-restyle`, `ss-dial`, `ss-studio`. 검증은 `ss-a11y`, `ss-lint`, `ss-review`, `ss-audit`, `ss-score`, `ss-verify`. 프레임워크별 코드 작성에는 실제 프로젝트 어댑터와 규칙 번들을 사용한다.
- Codex 플러그인의 `frontend-design`, `cloud-desktop`, `cloud-environment-runtime`, `sites`, `visualize`. 각각 디자인 방향, 환경에 맞는 화면 검증, Sites 전용 작업, 대화 내 시각화에 적용한다. 기술 스택이 같아도 사용자의 요청이 해당 플러그인 작업이 될 때만 그 절차를 따른다.
- 타 주제의 스킬에서 React가 단순 예시, 옵션, 동사 또는 서비스 이름으로 나오는 경우는 React 지침으로 취급하지 않는다. 동일한 스킬의 구버전 캐시나 워크트리 복제본에서 규칙이 다르면 활성 버전과 현재 저장소 원본을 먼저 확인한다.

## 조사 범위

사용자 글로벌 지침과 `~/.agents`, `~/.codex/skills`, `~/.codex/plugins/cache`, `~/.claude/skills`, `~/workspace`의 에이전트 지침, 스킬, Cursor 규칙을 검색했다. 6,966개 후보 경로에서 같은 내용의 복제본을 제외한 653개 문서를 대상으로 검색했고, React, Next.js, TSX, UI, 렌더링, 접근성이나 테스트가 나타난 175개 문서를 검토 후보로 확인했다. 원본이 가리키는 기술 규칙, 디자인 시스템과 실행 문서는 별도로 추적했다. 생성 결과, 패키지 의존성, 환경 비밀값과 대화 기록은 조사 대상에서 제외했다.
