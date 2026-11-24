# 저장소별 지침

해당 프로젝트의 최신 지침과 변경 대상 디렉터리를 먼저 확인한다. 아래 내용은 로컬 지침에서 수집한 적용 범위와 시행 규칙이다.

## indentm

- `design-system/tokens.css`를 단일 토큰 원본으로 쓰고 `grid.md`에 있는 `PageShell`을 새 화면의 기본 데스크톱 셸로 사용한다. 반응형 패널, `NavigationBar`, 모바일 safe area와 화면 폭은 `grid.md`를 확인한다.
- Base UI와 Tailwind v4, Phosphor 및 등록된 아이콘을 쓴다. variant, size, state를 기존 클래스 맵과 토큰으로 표현한다. 패널 헤더는 `PanelTitle`, 카드 헤더는 `CardTitle`, 폼 바로 위 레이블은 `Field`를 확인한다. 본문은 `Article`이나 `article` 유틸을 쓰고 외부 HTML과 사용자 글에는 필요한 경우 `[overflow-wrap:anywhere]`를 추가한다. 한국어 어절 줄바꿈, 일본어 금칙, 텍스트 선택 정책은 `design-system/index.md`를 확인한다.
- 새 공용 컴포넌트는 `apps/web/src/app/design/entries.ts`의 `entryMeta`, `codeNamesBySlug`와 `_demos`에 등록하고 `bun run design:check-catalog`를 실행한다. 패턴은 `patterns.ts`, 해당 페이지와 패턴 데모 규칙을 따른다. 주석과 동적 임포트 금지 규칙을 적용한다. `design-system/components/`의 props 필드 중 카탈로그가 실제 Props 표에 표시하는 JSDoc만 예외다. 제약, prop 상호작용, 부작용이나 이름만으로 알기 어려운 사용법을 문서화한다. 기본값과 타입이 곧 설명인 항목은 반복하지 않는다.
- `design-system/copy.md`가 제품과 카탈로그 문구의 원본이다. Primary 버튼은 `~하기`, 다른 버튼 variant와 메뉴, 행 액션, 다이얼로그 confirm/cancel은 명사형을 사용한다. 아이콘 버튼과 동적 레이블은 가능한 `대상 + 명사형`을 사용한다. `다시 시도`는 고정 레이블이다. 에러와 경고는 합쇼체, 안내와 완료, 빈 상태는 해요체를 쓴다. 문구와 번역 변경은 `ux-writing`과 용어표를 확인한다.
- 내부 웹 API 하나당 `apps/web/src/lib`의 요청 파일 하나를 대응시킨다. API 라우트와 도메인, 액션 파일명을 맞추고 동적 ID는 파일 경로에서 뺀다. 요청 함수는 첫 인자로 네트워크 클라이언트, 다음 인자로 입력을 받는다. 파일에서 스키마로 응답을 파싱하고 타입을 추론해 성공과 실패를 기존 `Result`로 반환한다. 도메인, HTTP 스키마, 웹 요청 타입의 소유 위치를 지키고 신규 코드에 레거시 `packages/shared` 의존을 추가하지 않는다.
- API 또는 코어 변경에 권한이 걸리면 캠페인과 세션의 기존 권한 함수 및 미들웨어를 따른다. 소유자와 admin을 허용하고, 하위 리소스의 캠페인 또는 세션 소속은 별도로 검사한다. 루트 목록은 admin도 본인 소유만 돌려준다. 실행자와 리소스 소유자를 섞지 않고 미들웨어가 보장한 검사를 중복하지 않는다.
- 공용 test 스킬의 indentm 절을 적용한다.
- DOM 테스트에 `test-setup-dom.ts`, 공통 env에 `test-setup.ts`를 사용하고 실제 DB가 필요한 테스트는 `localhost:5433/icarus_test`와 `bun run db:migrate:test`를 사용한다. PR 검증은 `icarus-git`의 최종 diff, convention-fixup, 로컬 CI 규칙을 따른다. 공용 `CLAUDE.md`의 Bun HTML imports 예시는 실제 Next.js 앱의 App Router나 빌드 스크립트를 대체하는 지침으로 쓰지 않는다.

- 크리에이터의 poolGroup과 view를 클라이언트만 읽는 같은 화면에서는 History API를 사용한다. 다른 발송 그룹 경로에서 진입할 때는 라우터를 사용한다. [#3808](https://github.com/indentcorp/icarus/pull/3808)
- 풀 그룹 전환과 브라우저 이력 이동은 페이지 요청 없이 해당 그룹 목록을 한 번 조회한다. 전체 집계는 CampaignCreatorsDataProvider가 소유하며 그룹 전환과 독립적으로 갱신한다. [#3809](https://github.com/indentcorp/icarus/pull/3809)

## Huxley

### 컴포넌트와 Next.js

- `docs/coding-rules.md`의 RC, NXT, GQL, URL과 ORG 규칙을 따른다. `page-content.tsx`가 데이터와 상태를 소유하고 자식에 props를 전달한다. 복잡한 트리, 필터, 페이지 계산은 훅이나 순수 함수로 분리한다. RC-002의 30줄 이상 JSX, 훅 2개 이상, map/render prop에서 쓰는 중첩 렌더 함수 조건이면 해당 렌더 단위를 독립 컴포넌트로 분리한다.
- 도메인 지식이 없는 primitive는 `src/ui/`, 여러 경로가 공유하는 도메인 UI는 `src/components/`, 여러 도메인이 공유하는 로직은 `src/lib/`, 단일 경로 전용 코드는 해당 App Router 경로 옆에 둔다. 파일명과 코드로 기존 컴포넌트와 훅, 유틸을 먼저 찾아본다. 두 개 이상의 실제 사용처가 필요한 Base 추상화를 미리 만들지 않는다.
- 내부 함수는 동사와 대상을 표현하고 `handle` 접두사를 쓰지 않는다. 이벤트 prop에 `on`을 쓰며 짝을 이루는 액션의 이름을 대칭으로 둔다. props에는 `type`과 교차, 유니온 타입을 사용한다. 일반 모듈은 named export를 선호하고 Next.js page/layout의 default export는 규약대로 사용한다. 타입 오류를 `as any`, `@ts-ignore`, `@ts-expect-error`로 숨기지 않는다.
- 서버 Apollo 모듈과 클라이언트 훅을 다른 파일에 두고 클라이언트에서 서버 전용 barrel을 import하지 않는다. 공유하는 공개 상수와 타입은 서버 모듈이 따라오지 않는 경로에서 가져온다.

### GraphQL, Apollo, URL

- 쿼리와 뮤테이션은 `.graphql`과 codegen output을 쓴다. 필요한 스키마가 로컬에만 있으면 로컬 백엔드를 시작하고 `bun env:local` 후 `bun run codegen`을 쓴다. 엔티티 선택에 fragment spread를 사용하고 소비자는 생성된 fragment type을 직접 참조한다. 깊은 `Query[...]`, `Pick<Fragment>`로 모델을 재정의하거나 필드 복사 전용 래퍼와 매퍼를 만들지 않는다. 실제 UI 전용 상태와 생성된 뮤테이션 입력으로의 변환은 명시적으로 둔다.
- Apollo query 결과에서 화면 값을 파생하고 조회 결과를 로컬 상태로 복제하지 않는다. 변경은 뮤테이션 옵션에서 캐시에 반영한다. 단순 갱신은 `__typename`과 `id` 머지, 목록이나 카운터는 `update`와 `cache.modify` 또는 `writeQuery`, 복합 집계나 재동기화는 `refetchQueries`를 검토한다. 호출 컴포넌트에서 별도 `refetch()`를 이어 호출하지 않는다.
- 검색, 필터, 정렬, 페이지처럼 공유할 상태는 `nuqs`를 쓴다. 페이지 번호는 항상 URL에 두고 번호를 눌러 직접 이동할 수 있게 한다. 라우트의 `search-params.ts`에서 `nuqs/server` 파서를 선언하고 `page-content.tsx`의 `useQueryStates`가 소비한다. GraphQL 페이지 크기는 변수로 넘긴다. `DjangoListConnection`의 결정적 cursor만 해당 서버 규약에 따라 페이지와 크기에서 계산한다. 첫 페이지 이후에는 `btoa('arrayconnection:' + ((page - 1) * pageSize - 1))`을 사용한다.
- 리뷰 대상이 앱 또는 공유 패키지의 라우팅, GraphQL, 캐시 또는 페이지 처리라면 코드와 테스트 양쪽을 대조한다. `check-coding-rules.sh`와 GitHub CI가 못 잡는 데이터 소유권과 서버 경계를 수동으로 본다. 위반과 예외의 처리 기준은 `docs/coding-rules.md`의 severity와 reviewer checklist를 적용한다.
- Admin과 Storefront는 Bun workspaces와 프로젝트의 `env:local`, `env:dev` 전환을 쓴다. Next.js가 읽는 앱의 `.env`와 GraphQL codegen이 읽는 환경이 의도한 서버를 가리키는지 확인한다. 개발, 린트, 포맷, 타입 검사와 테스트는 루트 `AGENTS.md`의 스크립트로 실행한다.

### Admin UI, Storefront, E2E

- `apps/admin/`에서는 `design-system-guide`에 따라 비슷한 프로덕션 컴포넌트 두세 개를 먼저 읽는다. 대화형 UI는 Base UI props를 기준으로 하고 React 19 ref prop, 상태 `data-*`, `cn`, 2개 이상 variant 축의 CVA, 배타 props의 판별 유니온, compound 컴포넌트의 flat named exports와 동일 파일 배치를 따른다. factory나 HOC를 새로 씌우지 않는다.
- Admin 가이드의 kebab-case, 해당 UI 파일의 `'use client'`, 외부 → 내부 import 순서, `*Icon` export와 금지된 Phosphor 내부 SSR 경로, Tailwind v4 토큰 매핑 및 타이포 → 레이아웃 → 간격 → 시각 속성 → 상태 클래스 순서를 확인한다. 토큰 namespace를 중복하지 않고 ring, outline, shadow는 가이드의 변수를 사용한다. `src/app/design/<component>/page.tsx`에 variants, sizes, states를 반영하고 린트, tsgo 타입 검사와 UI 또는 카탈로그 변경의 빌드를 실행한다.
- Storefront의 PLP/PDP UX, 가격, 할인, 카트와 체크아웃 변경에는 `docs/storefront-cognitive-psych.md`를 확인한다. 결과에 근거 이론, 조치, 지표와 윤리 가드를 붙인다. 가짜 희소성, 숨은 비용, 오해를 유도하는 기본값과 사용자에게 불리한 넛지를 사용하지 않는다. 영어 UI는 사전의 sentence case를 따르고 프로젝트 코드명은 사용자 문구에 하드코딩하지 않는다.
- E2E는 `e2e/AGENTS.md`에 따라 admin, storefront, 실제 교차 앱 workflows를 구분한다. `fixtures/test.ts`의 페이지와 시드부터 쓰고, `pages/`는 조작, `assertions/`는 공유 검증, `helpers/`는 소규모 도구를 둔다. 같은 시나리오를 다르게 추상화해서 반복하지 않는다. 변경 범위에 따라 spec, project, 전체 E2E 중 적절한 경로를 실행한다.

## Spray 프론트엔드 모노레포

- `indentcorp/frontend`의 Yarn Workspaces와 Turborepo를 따른다. 저장소 `AGENTS.md`의 코드 스타일, TypeScript 추론 예외, named export와 테스트 배치, Red-Green 검증을 참고한다. 작업 후 패키지의 ESLint와 타입 검사, 루트 포맷 검사를 확인한다.
- Spray Web의 App Router `(public)`, `(protected)` 경로를 존중한다. `.cursor/rules/spray-rule.mdc`에 따라 `primitives`는 도메인 독립, `domain`은 도메인별 UI, `composite`는 반복 조합에 쓴다. `@/ui`의 구형 구조를 확인하고 적용 범위 내 API 선언은 `apis`에 둔다. Tailwind와 semantic 색을 선호하고 표기 규칙을 따른다. 새 화면과 해당 라우트 README의 screen 구조를 확인한다.
- Spray E2E는 `apps/synthetics-spray`, `loginAndGetUtils`, 접근 가능한 레이블과 기존 `screenshots.ts`를 따른다. SendLab은 Apollo와 GraphQL 코드 생성, TipTap과 기존 UI를 사용한다. Spray 디자인 시스템 사이트는 `@indent/spray`의 공개 컴포넌트 및 테마의 라이브 데모 위치를 따른다.
- `@indent/spray`는 OpenAPI 생성 타입을 제공하고 HTTP 구현은 소비 앱이 맡는다. GraphQL 경로는 README의 서버용 조회와 클라이언트 Provider 및 훅을 구분한다.
- Vovu Shopfront는 subdomain 라우팅을 기존 미들웨어, rewrite와 App Router에 맡긴다. 서버에서는 `getShop()`과 `getShopHandle()`, 클라이언트에서는 `useShop()`과 `useShopHandle()`로 tenant 정보를 가져온다. 환경별 호스트 규칙 때문에 subdomain을 호출부마다 직접 파싱하지 않는다.
- VReview 위젯 화면은 embedding이 만드는 iframe 안에서 렌더된다. `apps/vreview-widget-react/README.md`의 위젯, embedding과 터널 구성 및 대체 embedding 모드를 확인한다. 운영 설정은 읽기와 재현 준비 단계에서 변경하지 않는다.
- Vercel 운영 문제는 GitHub에 연결된 기존 배포 상태와 로그를 먼저 확인한다. 이 모노레포 지침에 따라 Vercel 프로젝트, 연결, 공용 빌드 및 환경 설정을 변경하는 명령을 사용하지 않는다.

## 기타 확인된 프로젝트

- **Sanabi**의 `AGENTS.md`는 뷰 컴포넌트에 전달받은 데이터와 이벤트를, 상태 관리 컴포넌트에 상태 전이와 사이드 이펙트를 둔다. `.agents/skills/testing`은 동작 검증, 옆 파일 배치와 `.test.ts`, `.test.tsx`를 따른다.
- **indent/apps/web**의 `AGENTS.md`는 설치된 Next.js의 `node_modules/next/dist/docs/`에서 해당 안내를 구현 전에 읽고 deprecation을 확인하라고 명시한다.
- **Hermes Agent**의 웹 UI와 Electron 데스크톱 React는 서로 다른 표면이다. `web/AGENTS.md`는 주 채팅 경험을 React로 중복 구현하지 않고 기존 TUI를 사용하며 주변 구조화 UI는 React로 허용한다. `apps/desktop/src/AGENTS.md`의 데스크톱 상태와 JSON-RPC 경계를 따르고, 실제 UI와 TypeScript 동작은 소유 앱의 Vitest에서 검증한다. Python 테스트에서 TS 소스 모양을 assertion으로 검사하지 않는다.
