---
name: aws-readonly-auth
description: Okta로 Spray 운영 AWS 읽기 전용 자격 증명을 획득하거나 만료된 인증을 갱신한다. AWS 조사 중 ExpiredToken이 발생하거나 사용자가 AWS 읽기 권한 획득을 요청할 때 사용한다.
---

# AWS 읽기 전용 인증

사용자가 지정한 순서로 Okta 인증을 완료하고 읽기 전용 AWS 역할을 선택한다. 어드민 역할은 절대 선택하지 않는다. 이 절차는 기존 읽기 전용 역할로 로그인하는 작업이며 IAM 정책이나 권한을 변경하지 않는다.

## 절차

1. 셸에서 `oktasprayprod --open-browser-command 'open -a "Google Chrome"'`을 실행한다. 이 인증은 OS 기본 브라우저 설정과 관계없이 항상 Google Chrome을 사용한다.
   - 사용자가 적은 `oktasparyprod`는 현재 로컬 별칭 `oktasprayprod`의 오타다. `~/.zshrc`에 선언된 실제 별칭을 확인하고 사용한다.
   - 별칭을 불러오는 대화형 zsh에서 실행한다. 예: `exec_command`의 `cmd: "zsh -ic 'oktasprayprod --open-browser-command \"open -a \\\"Google Chrome\\\"\"'"`, `tty: true`로 실행하고 세션 ID를 유지한다.
   - 인증 명령이 대기 중이면 같은 셸 세션에 입력을 전달한다. 명령을 중복 실행하지 않는다.
2. Google Chrome에서 인증 화면의 코드가 셸에 표시된 코드와 일치하는지 확인한 뒤 코드 확인 버튼을 클릭한다.
   - computer use는 Google Chrome(`com.google.Chrome`)에 연결하고, 인증에 사용한 탭을 식별해 둔다.
   - Chrome을 실행하거나 연결할 수 없으면 제약을 보고한다. 다른 브라우저로 대체하지 않는다.
3. 셸의 실제 역할 선택 목록을 읽고 읽기 전용 역할을 선택한다.
   - `ReadOnly`, `ReadOnlyAccess` 등 읽기 전용임이 명확한 역할의 이름과 ARN을 확인한다. 번호는 매번 실제 목록에서 확인한다.
   - `Admin`, `Administrator`, `AdministratorAccess` 등 어드민 역할은 절대 선택하지 않는다. 기본 선택값이 어드민일 수도 있으므로 Enter만 보내지 않는다.
   - 읽기 전용 역할이 없거나 여러 역할 중 대상을 판단할 수 없으면 선택하지 말고 필요한 정보만 사용자에게 요청한다. 다른 권한으로 대체하지 않는다.
4. 명령의 성공과 선택한 읽기 전용 역할을 확인한다.
   - `aws sts get-caller-identity`로 유효한 세션과 선택한 역할을 확인한다. 별도 프로필을 발급했다면 해당 프로필로 확인한다.
   - STS 성공 자체가 읽기 전용 정책의 증명은 아니므로 실제 선택한 역할과 함께 확인한다.
   - 자격 증명, 토큰, 인증 코드는 응답이나 저장소에 기록하지 않는다.
   - 기존 AWS 조회가 인증 만료로 막혔다면 같은 읽기 전용 조회를 재시도한다. 인증 성공과 원래 조사 완료를 구분한다.
5. 인증과 역할 확인이 끝나면 이번 인증에 사용한 Google Chrome 탭을 닫고, 닫힌 상태를 확인한다. 기존의 다른 탭이나 Chrome 앱 전체를 닫지 않는다.
