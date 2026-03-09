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

## 핵심 원칙

**이 세 가지는 플랜 전체를 관통하는 최우선 원칙이다. 모든 설계 결정에서 이 원칙을 먼저 적용한다.**

### 1. 함수형 프로그래밍

- **순수 함수 우선**: 같은 입력에 항상 같은 출력. 부수효과(I/O, DB, API 호출 등)는 최외곽으로 밀어낸다
- **불변성**: 데이터를 직접 변경하지 않는다. 새로운 값을 만들어 반환한다
- **부수효과 격리**: 순수한 비즈니스 로직과 부수효과를 명확히 분리한다. 순수 함수가 코어, 부수효과가 셸
- **선언적 표현**: 어떻게(how)가 아닌 무엇을(what) 기술. map/filter/reduce 등 선언적 조합을 우선한다

### 2. 조합 가능한 인터페이스로서의 함수 시그니처

- **단일 책임**: 한 함수는 한 가지 일만 한다. 이름만으로 무엇을 하는지 알 수 있어야 한다
- **입출력 일관성**: 한 함수의 출력 타입이 다른 함수의 입력 타입과 자연스럽게 연결되도록 설계한다 (pipe/compose 가능)
- **작은 함수, 넓은 조합**: 작고 명확한 함수들을 조합하여 복잡한 동작을 만든다. 큰 함수 하나보다 작은 함수 여러 개의 조합이 낫다
- **의존성 주입**: 외부 의존성(DB, API 등)은 인자로 받는다. 함수 내부에서 전역 상태에 접근하지 않는다

### 3. TDD (Red-Green-Refactor)

- **테스트가 설계를 이끈다**: 구현 전에 테스트를 먼저 작성한다. 테스트가 함수의 계약(contract)을 정의한다
- **Red → Green → Refactor**: 실패하는 테스트 작성 → 최소한의 코드로 통과 → 리팩토링. 이 사이클을 엄격히 지킨다
- **리프 노드부터**: 의존성 없는 순수 함수를 먼저 테스트하고 구현한다. 상위 함수는 이미 검증된 하위 함수를 조합한다
- **경계 케이스 우선**: 정상 케이스뿐 아니라 빈 입력, 에러, 엣지 케이스를 테스트에 반드시 포함한다

## 함수 설계

플랜의 핵심. 위 세 가지 원칙에 따라 함수들의 시그니처와 호출 트리를 설계한다.

### 시그니처 목록

각 함수의 시그니처와 역할을 정의한다. 신규 함수는 `[NEW]`, 수정 함수는 `[MOD]`로 표시한다. 각 함수에 순수/부수효과를 표시하여 어디에 부수효과가 있는지 한눈에 보이게 한다.

\`\`\`ts
// 📁 path/to/file.ts
[NEW] async function processOrder(order: Order): Promise<OrderResult>  // ⚡ 부수효과 (orchestrator)
// 주문을 검증하고 결제를 실행한 뒤 결과를 반환한다

[NEW] function validateOrder(order: Order): ValidationResult  // ✅ 순수
// 주문 데이터의 유효성을 검증한다

[MOD] async function executePayment(amount: number, method: PaymentMethod): Promise<PaymentResult>  // ⚡ 부수효과
// 기존: 카드만 지원 → 변경: 계좌이체 추가
\`\`\`

### 호출 트리

함수 간 호출 관계를 트리로 표현한다. 어떤 함수가 내부에서 어떤 헬퍼/모델 함수를 호출하는지 한눈에 보여준다. 각 함수에 입력 타입과 반환 타입을 명시하여 시그니처 목록을 참조하지 않아도 데이터 흐름을 파악할 수 있게 한다. 순수 함수(✅)와 부수효과 함수(⚡)를 구분하여 부수효과의 경계를 시각적으로 드러낸다.

\`\`\`
processOrder(order: Order) -> OrderResult                      📁 orders/process.ts ⚡
├── validateOrder(order: Order) -> ValidationResult            📁 orders/validate.ts ✅
│   ├── checkStock(items: OrderItem[]) -> StockResult          📁 inventory/stock.ts ✅
│   └── validateAddress(address: Address) -> bool              📁 shipping/address.ts ✅
├── executePayment(amount: number, method: PaymentMethod) -> PaymentResult  📁 payments/execute.ts ⚡ [MOD]
│   ├── chargeCard(card: Card, amount: number) -> PaymentResult             📁 payments/card.ts ⚡
│   └── transferBank(account: BankAccount, amount: number) -> PaymentResult 📁 payments/bank.ts ⚡ [NEW]
└── createOrderRecord(order: Order, paymentResult: PaymentResult) -> OrderRecord  📁 orders/repository.ts ⚡
\`\`\`

## 실행 순서

함수 트리의 리프 노드(의존성 없는 순수 함수)부터 루트를 향해 구현한다. **순수 함수 → 조합 함수 → 부수효과 함수** 순서로, 각 함수마다 **Red-Green-Refactor** 사이클을 엄격히 따른다. 테스트 코드 관련 스킬이 있으면 반드시 사용한다.

1. **Step 1**: {리프 순수 함수들} ✅
   - 🔴 Red: 실패하는 테스트 작성 (정상 + 경계 케이스)
   - 🟢 Green: 테스트를 통과하는 최소한의 구현
   - 🔵 Refactor: 중복 제거, 명확성 개선
2. **Step 2**: {조합/상위 함수들} ✅
   - 🔴 Red → 🟢 Green → 🔵 Refactor
3. **Step N**: {부수효과 함수들} ⚡
   - 🔴 Red → 🟢 Green → 🔵 Refactor (외부 의존성은 mock/stub)
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
