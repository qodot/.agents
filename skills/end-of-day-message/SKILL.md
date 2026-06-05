---
name: end-of-day-message
description: Use when drafting, revising, or sending a Slack 업무 종료 메시지, 퇴근 공유, 업종 메시지, or daily #general work summary.
---

# End Of Day Message

## 규칙

- 오늘 날짜/타임존을 확인한다.
- Slack, GitHub, Notion을 직접 조회하고 확인한 사실만 쓴다.
- 초안과 전송은 분리한다. 사용자가 명시적으로 요청할 때만 #general에 전송한다.
- 이전 초안, 이미 올린 업무 종료 메시지, 사적 잡담은 근거에서 제외한다.
- 4-8개 bullet로 도메인별 압축한다.
- 완료/머지는 "수정/추가/머지", 대화만 한 것은 "논의/확인/정리"로 쓴다.

## 확인

- Slack: 오늘 #general 업무 시작 메시지, 오늘 보낸 업무 관련 메시지, 쓰레드 답글.
- GitHub: 오늘 생성/갱신/머지한 PR, 커밋, 리뷰. 필요하면 PR 본문.
- Notion: indent 워크스페이스만. 변경 이력을 확인 못 하면 Notion 근거로 단정하지 않는다.

## 출력 형식

```text
업무 종료
• ...
• ...
```
