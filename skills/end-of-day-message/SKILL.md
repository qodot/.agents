---
name: end-of-day-message
description: Use when drafting, revising, or sending a Slack 업무 종료 메시지, 퇴근 공유, 업종 메시지, or daily #general work summary.
---

# End Of Day Message

## 규칙

- 오늘 날짜/타임존을 확인한다.
- Slack, GitHub, Notion, Google Calendar를 직접 조회하고 확인한 사실만 쓴다.
- 초안과 전송은 분리한다. 사용자가 명시적으로 요청할 때만 #general에 전송한다.
- 이전 초안, 이미 올린 업무 종료 메시지, 사적 잡담은 근거에서 제외한다.
- 프로젝트를 1단 불릿, 해당 프로젝트에서 한 일을 2단 불릿으로 쓴다. 프로젝트 이름을 작업마다 반복하지 않는다.
- 같은 목적의 관련 작업은 한 불릿으로 묶고, 관련 없는 작업은 별도 불릿으로 나눈다. 고정된 불릿 개수에 맞추려고 무관한 작업을 합치지 않는다.
- 배포, 머지, 승인, 푸시 같은 단순 절차는 업무 항목이나 완료 설명에 넣지 않는다. 실제 기능 변경, 문제 해결, 조사 결과를 쓴다.
- 인덴트의 약관과 법률 문서 작업은 인덴트M에 합친다. 산나비 작업은 별도 요청이 없으면 제외한다.
- 구현이 완료된 작업은 "수정/추가", 진행 중인 작업은 "진행", 대화만 한 것은 "논의/확인/정리"로 구분한다.

## 확인

- Slack: 오늘 #general 업무 시작 메시지, 오늘 보낸 업무 관련 메시지, 쓰레드 답글.
- GitHub: 오늘 생성/갱신/머지한 PR, 커밋, 리뷰. 필요하면 PR 본문.
- Notion: indent 워크스페이스만. 변경 이력을 확인 못 하면 Notion 근거로 단정하지 않는다.
- Google Calendar: 오늘 참석한 일정(회의 등). 거절/불참 일정은 제외한다.

## 출력 형식

아래는 내용의 계층을 보여주는 예시다. 실제 Slack 전송과 수정에는 문자 `•`, `◦`, 공백 들여쓰기 대신 `blocks`의 `rich_text`와 `rich_text_list`를 사용한다. 프로젝트 목록은 `style: "bullet", indent: 0`, 각 프로젝트 바로 다음의 작업 목록은 `style: "bullet", indent: 1`로 구성한다. 항목은 `rich_text_section`으로 넣고, 제목 `업무 종료`는 목록 밖에 둔다.

일반 텍스트만 받는 `agent-slack message send/update`로는 이 서식을 만들 수 없다. 연결된 Slack API 또는 기존 인증을 사용하는 Slack SDK의 `chat.postMessage`와 `chat.update`에 `blocks`를 전달한다. `text`는 알림과 접근성용 대체 텍스트로 유지한다. 전송 후 메시지를 다시 조회해 `rich_text_list`의 `style`과 `indent`가 저장됐는지 확인한다. [Slack 목록 서식 문서](https://docs.slack.dev/block-kit/formatting-with-rich-text/)를 참고한다.

```text
업무 종료
• 인덴트M
  ◦ 팔로워 구간 직접 입력 추가, 1천 명 미만 계정의 재수집 제한 해제
  ◦ 법률 문서의 변경 이력과 이전 문서 안내 제거
• 소셜스캔
  ◦ TikTok 수집 오류 조사와 진단 로그 보강
  ◦ 테스트 재시도 대기 제거로 실행 시간 단축
```
