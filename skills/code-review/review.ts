import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getModel } from "@mariozechner/pi-ai";
import {
  AuthStorage,
  createAgentSession,
  createBashTool,
  createExtensionRuntime,
  createReadTool,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  type ResourceLoader,
} from "@mariozechner/pi-coding-agent";

// ─── Config ─────────────────────────────────────────────

const TARGET_BRANCH = process.argv[2] || "HEAD";
const BASE_BRANCH = process.argv[3] || "main";
const FOCUS = process.argv.slice(4).join(" ");

const REVIEW_MODELS = [
  { name: "Codex 5.3", provider: "openai", id: "gpt-5.3-codex", thinking: "xhigh" as const },
  { name: "Gemini 3 Pro", provider: "google-antigravity", id: "gemini-3-pro-high", thinking: "xhigh" as const },
  { name: "Claude Opus 4.6", provider: "anthropic", id: "claude-opus-4-6", thinking: "xhigh" as const },
];

const SYNTHESIS_MODEL = { provider: "anthropic", id: "claude-opus-4-6", thinking: "high" as const };

// ─── Helpers ────────────────────────────────────────────

function log(msg: string) {
  process.stderr.write(`${msg}\n`);
}

const authStorage = AuthStorage.create();
const modelRegistry = new ModelRegistry(authStorage);

function resolveRef(branch: string): string {
  try {
    execSync(`git rev-parse --verify ${branch}`, { encoding: "utf-8", stdio: "pipe" });
    return branch;
  } catch {
    try {
      execSync(`git rev-parse --verify origin/${branch}`, { encoding: "utf-8", stdio: "pipe" });
      return `origin/${branch}`;
    } catch {
      return branch;
    }
  }
}

function findModel(provider: string, id: string) {
  return getModel(provider, id) ?? modelRegistry.find(provider, id) ?? null;
}

function createMinimalResourceLoader(systemPrompt: string): ResourceLoader {
  return {
    getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => systemPrompt,
    getAppendSystemPrompt: () => [],
    getPathMetadata: () => new Map(),
    extendResources: () => {},
    reload: async () => {},
  };
}

// ─── Git ────────────────────────────────────────────────

function getGitInfo(baseRef: string, targetRef: string) {
  const opts = { encoding: "utf-8" as const, maxBuffer: 10 * 1024 * 1024 };
  const diff = execSync(`git diff ${baseRef}..${targetRef}`, opts);
  const stat = execSync(`git diff ${baseRef}..${targetRef} --stat`, opts);
  const commitLog = execSync(`git log ${baseRef}..${targetRef} --oneline`, opts);
  return { diff, stat, commitLog };
}

// ─── Prompts ────────────────────────────────────────────

function buildReviewPrompt(gitInfo: { diff: string; stat: string; commitLog: string }) {
  return `다음 git diff를 철저히 리뷰해주세요. 모든 리뷰 코멘트는 한국어로 작성합니다.

## 리뷰 관점
1. **버그 및 잠재적 이슈**: 런타임 에러, 엣지 케이스, null/undefined 처리, 타입 안전성
2. **설계 및 아키텍처**: SOLID 원칙, 의존성 방향, 책임 분리, 확장성
3. **코드 품질**: 네이밍, 가독성, 중복 코드, 복잡도
4. **성능**: 불필요한 연산, N+1 쿼리, 메모리 누수
5. **테스트**: 테스트 커버리지, 엣지 케이스 테스트 누락
${FOCUS ? `\n## 특별히 집중해야 할 부분\n${FOCUS}\n` : ""}
## 커밋 히스토리
${gitInfo.commitLog}
## 변경 파일 요약
${gitInfo.stat}
## Diff
\`\`\`diff
${gitInfo.diff}
\`\`\`

각 이슈는 다음 형식으로 보고:
- **파일:라인** — [Critical/Major/Minor/Suggestion] 설명

마지막에 전체 요약과 승인/변경요청 의견을 제시하세요.`;
}

// ─── Sub-agent: Review ──────────────────────────────────

async function runReview(
  modelDef: (typeof REVIEW_MODELS)[number],
  prompt: string,
): Promise<{ name: string; review: string }> {
  const model = findModel(modelDef.provider, modelDef.id);
  if (!model) {
    return { name: modelDef.name, review: `❌ 모델을 찾을 수 없습니다: ${modelDef.provider}/${modelDef.id}` };
  }

  const cwd = process.cwd();

  const { session } = await createAgentSession({
    cwd,
    model,
    thinkingLevel: modelDef.thinking,
    authStorage,
    modelRegistry,
    resourceLoader: createMinimalResourceLoader(
      "당신은 전문 시니어 소프트웨어 엔지니어이자 코드 리뷰어입니다. 코드를 철저히 리뷰하고 한국어로 응답합니다. 필요하면 read, bash 도구로 코드 컨텍스트를 추가 확인할 수 있습니다.",
    ),
    tools: [createReadTool(cwd), createBashTool(cwd)],
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory({
      compaction: { enabled: false },
      retry: { enabled: true, maxRetries: 2 },
    }),
  });

  let output = "";
  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      output += event.assistantMessageEvent.delta;
    }
  });

  try {
    await session.prompt(prompt);
  } finally {
    session.dispose();
  }

  return { name: modelDef.name, review: output };
}

// ─── Sub-agent: Synthesis ───────────────────────────────

async function synthesize(reviews: { name: string; review: string }[]): Promise<string> {
  const model = findModel(SYNTHESIS_MODEL.provider, SYNTHESIS_MODEL.id);
  if (!model) {
    log("⚠️  종합 모델을 찾을 수 없어 개별 리뷰를 그대로 출력합니다.");
    return reviews.map((r) => `# ${r.name}\n\n${r.review}`).join("\n\n---\n\n");
  }

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    model,
    thinkingLevel: SYNTHESIS_MODEL.thinking,
    authStorage,
    modelRegistry,
    resourceLoader: createMinimalResourceLoader(
      "당신은 시니어 테크 리드입니다. 여러 리뷰어의 코드 리뷰를 종합하여 명확하고 실행 가능한 최종 리포트를 작성합니다. 한국어로 응답합니다.",
    ),
    tools: [],
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
  });

  let output = "";
  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      output += event.assistantMessageEvent.delta;
    }
  });

  const prompt = `3명의 리뷰어가 작성한 코드 리뷰를 종합하여 최종 리뷰 리포트를 작성해주세요.

${reviews.map((r) => `## ${r.name}의 리뷰\n\n${r.review}`).join("\n\n---\n\n")}

## 종합 리포트 형식

1. **공통 지적사항** — 2명 이상이 지적한 이슈 (우선순위 높음)
2. **고유 발견사항** — 한 리뷰어만 발견한 중요 이슈
3. **최종 권고사항** — 반드시 수정 / 권장 / 선택 으로 분류
4. **전체 평가** — 코드 품질 점수(1-10)와 승인/변경요청 의견

중복 제거하고 핵심만 간결하게 정리하세요.`;

  try {
    await session.prompt(prompt);
  } finally {
    session.dispose();
  }

  return output;
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  const baseRef = resolveRef(BASE_BRANCH);
  const targetRef = resolveRef(TARGET_BRANCH);

  const gitInfo = getGitInfo(baseRef, targetRef);
  if (!gitInfo.diff.trim()) {
    log("변경사항이 없습니다.");
    process.exit(0);
  }

  const statSummary = gitInfo.stat.trim().split("\n").pop() ?? "";

  log("🔍 멀티 모델 코드 리뷰를 시작합니다...");
  log(`📌 베이스: ${baseRef} → 타겟: ${targetRef}`);
  log(`📊 ${statSummary}`);
  if (FOCUS) log(`🎯 집중 영역: ${FOCUS}`);
  log("");

  // 1. 3개 모델 병렬 리뷰
  const reviewPrompt = buildReviewPrompt(gitInfo);
  const reviewPromises = REVIEW_MODELS.map(async (m) => {
    log(`⏳ ${m.name} 리뷰 시작...`);
    try {
      const result = await runReview(m, reviewPrompt);
      log(`✅ ${m.name} 리뷰 완료`);
      return result;
    } catch (err) {
      log(`❌ ${m.name} 리뷰 실패: ${err}`);
      return { name: m.name, review: `❌ 리뷰 실패: ${err}` };
    }
  });

  const reviews = await Promise.all(reviewPromises);

  const successCount = reviews.filter((r) => !r.review.startsWith("❌")).length;
  if (successCount === 0) {
    log("\n❌ 모든 리뷰가 실패했습니다.");
    process.exit(1);
  }

  // 2. 종합 리포트 생성
  const successfulReviews = reviews.filter((r) => !r.review.startsWith("❌"));
  log(`\n📝 ${successCount}개 리뷰를 종합합니다...\n`);
  const report = await synthesize(successfulReviews);

  // 3. 리뷰 파일 저장
  const reviewsDir = join(process.cwd(), "reviews");
  mkdirSync(reviewsDir, { recursive: true });

  const branchName = (TARGET_BRANCH === "HEAD"
    ? execSync("git branch --show-current", { encoding: "utf-8" }).trim()
    : TARGET_BRANCH
  ).replaceAll("/", "-");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${branchName}_${timestamp}.md`;
  const filePath = join(reviewsDir, fileName);

  const fileContent = [
    `# 코드 리뷰: ${TARGET_BRANCH === "HEAD" ? branchName : TARGET_BRANCH}`,
    `> 베이스: ${baseRef} | 생성: ${new Date().toISOString()}`,
    FOCUS ? `> 집중 영역: ${FOCUS}` : "",
    "",
    "---",
    "",
    ...successfulReviews.map((r) => [`## ${r.name}의 리뷰`, "", r.review, "", "---", ""].flat()),
    "## 종합 리포트",
    "",
    report,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  writeFileSync(filePath, fileContent, "utf-8");
  log(`📄 리뷰 저장: ${filePath}`);

  // 4. 출력
  console.log(report);
  log("\n✅ 코드 리뷰 완료");
}

main().catch((err) => {
  log(`\n❌ 오류 발생: ${err}`);
  process.exit(1);
});
