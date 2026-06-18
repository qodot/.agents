---
name: dead-code-removal
description: Use when deleting dead code — removing unused routes, screens, components, or helpers (미사용 라우트·화면·컴포넌트·헬퍼 제거, 데드코드 정리) and recursively cleaning up their now-orphaned dependencies. Agree the deletion scope up front, then per-target remove→commit→verify-deps→delete→recurse.
---

# 데드코드 삭제

미사용 코드(라우트/화면/컴포넌트/헬퍼)를 안전하게 제거하고, 그로 인해 데드가 된 의존성을 재귀적으로 정리한다.

## 0. 시작 전: 삭제 범위 확정 (먼저 합의)

작업을 시작하기 전에 아래를 사용자와 **명시적으로 확정**한다. 추측해서 진행하지 않는다.

- **제거 대상 목록**: 무엇을 지울지. 사용자가 준 목록을 그대로 확정하고, 애매한 항목(목록/인덱스 페이지, 로그인 같은 진입점 등)은 따로 짚어 확인한다.
- **깊이 정책**: 삭제를 어느 계층까지 번지게 둘지 — `프론트만` / `+ 백엔드 API` / `+ DB(스키마·seed·마이그레이션)`. 되돌리기 무게가 큰 계층(특히 DB)은 **반드시 사용자에게 확인**한다. 한 번 정하면 전체 대상에 동일 적용.
- **제외 대상**: 디자인 시스템 컴포넌트, 공용 라이브러리/유틸 등 지우면 안 되는 것을 명시한다.
- **브랜치**: 독립 작업이면 기본 브랜치 기준 새 브랜치. 프로젝트의 브랜치 규칙을 따른다.

대상이 여러 개면 Task로 진행을 추적한다. 여러 대상이 공유하는 디렉터리(예: 공통 컴포넌트 폴더)는 한 묶음으로 잡는다.

## 1. 반복 절차 (대상 1개마다)

1. **대상 1개 제거 → 커밋.** (라우트면 page 파일/디렉터리, 그 외면 해당 엔트리)
2. **그 대상이 import하던 의존성을 데드 판정한다.**
   - ⚠️ **삭제하는 파일의 import를 빠짐없이 읽어서** 내부 의존성을 추출한다. 디렉터리 `ls`나 "미리 본 일부 import"에만 의존하면, 다른 디렉터리·패키지에 있는 전용 의존성을 놓친다. (이 절차는 바로 그 누락에서 나왔다.)
   - 추출한 각 내부 의존성을 `grep`으로 현재 참조 수를 센다 → 참조 0이면 데드. 제외 대상(디자인 시스템·살아있는 코드가 쓰는 공용 모듈)은 건드리지 않는다.
3. **데드면 삭제 → 커밋.** 대상 제거와 데드 의존성 삭제는 **분리 커밋**으로 한다.
4. **삭제한 코드가 import하던 의존성에 대해 2를 반복**한다(재귀). 새 데드가 더 안 나올 때까지.

## 2. 최종 검증

- **죽은 진입점**: 삭제한 대상으로 가는 호출·링크·경로 문자열(`router.push`/`href`/`redirect`/import 경로 등)이 남았는지 grep. 정적 타입체크가 못 잡는 **문자열 참조**에 특히 주의.
- **빈 디렉터리**: `find <src> -type d -empty`.
- **전수 교차검증**: 삭제 파일의 import를 모두 뽑아 내부 의존성이 전부 처리됐는지 재확인한다.
  ```bash
  git diff <base>..HEAD -- <path> | grep -E "^-" | grep -E "from ['\"]" | sed -E "s/^-//" | sort -u
  # from 없는 의존성(dynamic/side-effect import)도 확인
  git diff <base>..HEAD -- <path> | grep -E "^-" | grep -E "import\(|^-import ['\"]"
  ```
  외부 패키지·제외 대상·이미 삭제됨·유지 확정을 걸러내고 남는 내부 모듈이 모두 데드 처리됐는지 본다.
- **타입/빌드/테스트**: 변경 패키지 typecheck → 전체 CI. 기존 환경성 실패(테스트 DB 오염, 빈 API 키 등)는 실패 항목이 이번 변경 범위(`git diff --stat <base>..HEAD -- <path>`)에 포함되는지로 코드 무관 여부를 구분한다.

## 프로젝트별로 확인할 것

- **경로 특수문자**: Next.js dynamic route(`[id]`) 등 대괄호 경로는 git pathspec glob과 충돌해 `git rm`이 실패한다. `:(literal)...` 매직 또는 파일 단위 literal pathspec을 쓴다.
  ```bash
  git rm ':(literal)src/app/items/[id]/page.tsx'
  ```
- **커밋·브랜치 컨벤션**: 메시지 스타일과 브랜치 네이밍은 프로젝트 규칙을 따른다. (예: 한국어 서술문 + prefix 없음 + subject 한 줄.)
- **제외 경계**: 디자인 시스템·공용 모듈 등 "절대 안 지움" 경계는 프로젝트마다 다르니 0단계에서 확정한다.
