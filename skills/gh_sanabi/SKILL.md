---
name: gh_sanabi
description: 산나비 GitHub App 명의로 gh를 실행한다. 산나비의 GitHub 조회와 변경 작업에 사용한다.
---

# gh_sanabi

GitHub 작업은 `sanabi-indent` 앱으로 인증한다. 아래 래퍼에 대상 저장소와 기존 `gh` 인자를 전달한다. 현재 작업 디렉터리와 표준 입출력, 종료 코드는 그대로 유지된다.

```sh
/Users/qodot/.agents/skills/gh_sanabi/scripts/gh_sanabi indentcorp/icarus pr list
```

래퍼는 저장소별 앱 설치 토큰을 `~/.cache/gh_sanabi/`에 보관하고 만료 시에만 갱신한다. 동시 호출도 같은 토큰을 재사용한다. 캐시 디렉터리 권한은 700, 토큰 파일은 600이다. 토큰은 해당 `gh` 프로세스의 `GH_TOKEN`으로 전달한다.

브리지 서버나 `sanabi_github` 동적 도구는 필요 없다. 인증 실패 시 개인 계정으로 우회하지 않는다. 토큰과 개인 키를 출력하거나 `gh auth login`으로 저장하지 않는다.

기존 프로젝트의 Git 작업 절차를 따른다. 이 스킬 자체는 GitHub 변경 작업을 승인하지 않는다.
