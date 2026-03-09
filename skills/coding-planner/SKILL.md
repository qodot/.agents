---
name: coding-planner
description: 코딩 작업 전 함수 시그니처 설계와 호출 트리 기반 플래닝. 코드베이스를 분석하고 함수 시그니처를 정의한 뒤 호출 트리로 구조화하여 TDD 실행 계획을 수립합니다. '플래닝해줘', '계획 세워줘', '어떻게 구현할지 정리해줘' 등 요청 시 활성화됩니다.
---

# 코딩 플래너

코딩 작업 전에 코드베이스를 분석하고, 태스크를 분해하고, 리스크를 평가하여 체계적인 실행 계획을 수립합니다.

## 전체 흐름

```
인터뷰 → 코드베이스 분석 → 플랜 생성 → 저장 → 실행 여부 확인
```

## Phase 1: 인터뷰 (적응적)

사용자의 구두 설명을 기반으로 요구사항을 파악합니다. **작업 복잡도에 따라 인터뷰 깊이를 조절**합니다.

인터뷰는 간결하게. `question` 도구를 사용하여 다음을 확인합니다. 사용자가 이미 설명한 내용은 다시 묻지 않습니다.

1. **목표**: 무엇을 만들거나 수정하려는지
2. **완료 조건**: 어떤 상태가 되면 완료인지

## Phase 2: 코드베이스 분석

`bash`와 `read` 도구를 사용하여 **구현 수준**까지 코드베이스를 분석합니다. 불필요하게 많은 파일을 읽지 않는다. 관련 파일에 집중한다.

### 2-1. 프로젝트 구조 파악

```bash
# 프로젝트 전체 구조 확인
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" | head -100
# 또는 tree, ls 등을 프로젝트에 맞게 사용
```

### 2-2. 관련 파일 식별

- 작업과 직접 관련된 파일 찾기 (grep, rg 등 활용)
- 의존성 추적: import/require/use 관계
- 영향 범위 확인: 수정 시 영향받는 다른 모듈

### 2-3. 구현 수준 분석

관련 파일을 `read`로 읽어서:
- 관련 함수/메서드의 시그니처와 내부 로직 파악
- 데이터 흐름 추적
- 기존 패턴/컨벤션 파악 (네이밍, 에러 처리, 테스트 방식 등). 기존 컨벤션을 존중하고, 새로운 패턴 도입 시 플랜에 명시한다
- 타입/인터페이스 구조 이해

## Phase 3: 플랜 생성

분석 결과를 바탕으로 아래 구조의 마크다운 문서를 한국어로 생성합니다.

### 플랜 문서 구조

```markdown
# {작업 제목}

> 생성일: YYYY-MM-DD HH:mm
> 상태: 계획됨

## 개요

{무엇을, 왜 하는지 1-2문장 요약}

## 함수 설계

플랜의 핵심. 문제를 해결하기 위한 함수들의 시그니처와 호출 트리를 설계한다.

### 시그니처 목록

각 함수의 시그니처와 역할을 정의한다. 신규 함수는 `[NEW]`, 수정 함수는 `[MOD]`로 표시한다.

\`\`\`ts
// 📁 path/to/file.ts
[NEW] async function processOrder(order: Order): Promise<OrderResult>
// 주문을 검증하고 결제를 실행한 뒤 결과를 반환한다

[NEW] function validateOrder(order: Order): ValidationResult
// 주문 데이터의 유효성을 검증한다

[MOD] async function executePayment(amount: number, method: PaymentMethod): Promise<PaymentResult>
// 기존: 카드만 지원 → 변경: 계좌이체 추가
\`\`\`

### 호출 트리

함수 간 호출 관계를 트리로 표현한다. 어떤 함수가 내부에서 어떤 헬퍼/모델 함수를 호출하는지 한눈에 보여준다. 각 함수에 입력 타입과 반환 타입을 명시하여 시그니처 목록을 참조하지 않아도 데이터 흐름을 파악할 수 있게 한다.

\`\`\`
processOrder(order: Order) -> OrderResult                      📁 orders/process.ts
├── validateOrder(order: Order) -> ValidationResult            📁 orders/validate.ts
│   ├── checkStock(items: OrderItem[]) -> StockResult          📁 inventory/stock.ts
│   └── validateAddress(address: Address) -> bool              📁 shipping/address.ts
├── executePayment(amount: number, method: PaymentMethod) -> PaymentResult  📁 payments/execute.ts [MOD]
│   ├── chargeCard(card: Card, amount: number) -> PaymentResult             📁 payments/card.ts
│   └── transferBank(account: BankAccount, amount: number) -> PaymentResult 📁 payments/bank.ts [NEW]
└── createOrderRecord(order: Order, paymentResult: PaymentResult) -> OrderRecord  📁 orders/repository.ts
\`\`\`

## 실행 순서

함수 트리의 리프 노드(의존성 없는 것)부터 루트를 향해 구현한다. 각 함수는 **테스트 코드를 먼저 작성**한 뒤 구현한다 (TDD). 테스트 코드 관련 스킬이 있으면 반드시 사용한다.

1. **Step 1**: {대상 함수들}
   - 테스트 작성 → 구현 → 테스트 통과 확인
2. **Step 2**: {대상 함수들}
   - 테스트 작성 → 구현 → 테스트 통과 확인
...

## Phase 4: 저장

### 저장 경로

프로젝트 루트의 `.agents/plans/` 디렉토리에 저장합니다.

```bash
mkdir -p .agents/plans
```

### 파일 이름 규칙

`{YYYYMMDD}_{slug}.md` 형식을 사용합니다.

- 날짜: 생성 시점 기준
- slug: 작업 내용을 영문 kebab-case로 요약 (3~5단어)
- 예: `20260302_add-user-auth.md`, `20260302_fix-payment-timeout.md`

## Phase 5: 실행 여부 확인

플랜 저장 후 `question` 도구로 사용자에게 확인합니다:

- **"플랜대로 실행"** — 플랜의 Step 1부터 순서대로 코딩 시작
- **"플랜 수정"** — 수정할 부분을 말해달라고 요청, 수정 후 다시 저장
- **"나중에 실행"** — 플랜만 저장하고 종료

### "플랜대로 실행" 선택 시

저장된 플랜 파일을 참조하며 각 Step을 순서대로 실행합니다. 각 Step 완료 후 검증 항목을 확인하고 다음 Step으로 넘어갑니다.
