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
  { name: "Gemini 3 Flash", provider: "google-antigravity", id: "gemini-3-flash", thinking: "xhigh" as const },
  { name: "Claude Opus 4.6", provider: "anthropic", id: "claude-opus-4-6", thinking: "xhigh" as const },
];

const SYNTHESIS_MODEL = { provider: "anthropic", id: "claude-opus-4-6", thinking: "high" as const };

// ─── Types ──────────────────────────────────────────────

interface ReviewItem {
  id: number;
  severity: "critical" | "major" | "minor" | "suggestion";
  file: string;
  line?: string;
  title: string;
  description: string;
  suggestion: string;
  recommendation: "must-fix" | "recommended" | "optional";
  reporters: string[];
}

interface SynthesisResult {
  summary: string;
  score: number;
  verdict: "approve" | "request-changes";
  items: ReviewItem[];
}

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

function parseJsonFromOutput(output: string): SynthesisResult | null {
  const codeBlockMatch = output.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : output;
  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function formatReportMarkdown(result: SynthesisResult): string {
  const severityIcon: Record<string, string> = {
    critical: "🔴",
    major: "🟠",
    minor: "🟡",
    suggestion: "🔵",
  };

  const lines: string[] = [];

  lines.push(
    `**점수**: ${result.score}/10 | **판정**: ${result.verdict === "approve" ? "✅ 승인" : "🔄 변경 요청"}`,
  );
  lines.push("", result.summary, "");

  const groups = [
    { label: "🔴 반드시 수정", items: result.items.filter((i) => i.recommendation === "must-fix") },
    { label: "🟠 권장 수정", items: result.items.filter((i) => i.recommendation === "recommended") },
    { label: "🔵 선택 수정", items: result.items.filter((i) => i.recommendation === "optional") },
  ];

  for (const group of groups) {
    if (!group.items.length) continue;
    lines.push(`### ${group.label}`, "");
    for (const item of group.items) {
      const icon = severityIcon[item.severity] || "⚪";
      const loc = item.line ? `${item.file}:${item.line}` : item.file;
      lines.push(
        `#### ${icon} #${item.id} ${item.title}`,
        `- **심각도**: ${item.severity} | **위치**: \`${loc}\` | **지적**: ${item.reporters.join(", ")}`,
        "",
        item.description,
        "",
        `> **제안**: ${item.suggestion}`,
        "",
      );
    }
  }

  return lines.join("\n");
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

async function synthesize(
  reviews: { name: string; review: string }[],
): Promise<{ result: SynthesisResult | null; raw: string }> {
  const model = findModel(SYNTHESIS_MODEL.provider, SYNTHESIS_MODEL.id);
  if (!model) {
    log("⚠️  종합 모델을 찾을 수 없어 개별 리뷰를 그대로 출력합니다.");
    const raw = reviews.map((r) => `# ${r.name}\n\n${r.review}`).join("\n\n---\n\n");
    return { result: null, raw };
  }

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    model,
    thinkingLevel: SYNTHESIS_MODEL.thinking,
    authStorage,
    modelRegistry,
    resourceLoader: createMinimalResourceLoader(
      "당신은 시니어 테크 리드입니다. 여러 리뷰어의 코드 리뷰를 종합하여 구조화된 JSON을 출력합니다. 한국어로 응답합니다.",
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

  const prompt = `3명의 리뷰어가 작성한 코드 리뷰를 분석하여 종합 결과를 JSON으로 출력하세요.

${reviews.map((r) => `## ${r.name}의 리뷰\n\n${r.review}`).join("\n\n---\n\n")}

## 출력 형식

반드시 아래 JSON 형식만 출력하세요. JSON 외의 텍스트는 포함하지 마세요.

\`\`\`json
{
  "summary": "전체 코드 변경에 대한 종합 평가 (3-5문장으로 핵심 정리)",
  "score": 7,
  "verdict": "approve 또는 request-changes",
  "items": [
    {
      "id": 1,
      "severity": "critical | major | minor | suggestion 중 하나",
      "file": "파일 경로",
      "line": "라인 번호 또는 범위 (모르면 생략)",
      "title": "이슈 제목 (한 줄로 간결하게)",
      "description": "이슈 상세 설명. 왜 문제인지, 어떤 영향이 있는지 구체적으로.",
      "suggestion": "구체적인 수정 방법. 가능하면 수정 코드 예시 포함.",
      "recommendation": "must-fix | recommended | optional 중 하나",
      "reporters": ["이슈를 지적한 리뷰어 이름 배열"]
    }
  ]
}
\`\`\`

### 규칙
1. 2명 이상 지적한 이슈는 하나로 합치고 reporters에 모두 포함
2. severity: critical(버그/보안) > major(설계/성능) > minor(코드품질) > suggestion(개선제안)
3. recommendation: must-fix(반드시 수정) > recommended(권장) > optional(선택)
4. items는 severity 순으로 정렬 (critical이 먼저)
5. 중복 제거하여 핵심 이슈만 포함
6. suggestion은 최대한 구체적으로 — 어떤 코드를 어떻게 바꿔야 하는지`;

  try {
    await session.prompt(prompt);
  } finally {
    session.dispose();
  }

  const result = parseJsonFromOutput(output);
  if (!result) {
    log("⚠️  JSON 파싱 실패. 원본 텍스트로 저장합니다.");
  }
  return { result, raw: output };
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
  const { result: synthesisResult, raw: rawSynthesis } = await synthesize(successfulReviews);

  // 3. 파일 경로 생성
  const reviewsDir = join(process.cwd(), "reviews");
  mkdirSync(reviewsDir, { recursive: true });

  const branchName = (TARGET_BRANCH === "HEAD"
    ? execSync("git branch --show-current", { encoding: "utf-8" }).trim()
    : TARGET_BRANCH
  ).replaceAll("/", "-");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const baseName = `${branchName}_${timestamp}`;

  // 4. 리뷰 파일 저장
  const reportContent = synthesisResult ? formatReportMarkdown(synthesisResult) : rawSynthesis;

  const mdContent = [
    `# 코드 리뷰: ${TARGET_BRANCH === "HEAD" ? branchName : TARGET_BRANCH}`,
    `> 베이스: ${baseRef} | 생성: ${new Date().toISOString()}`,
    FOCUS ? `> 집중 영역: ${FOCUS}` : "",
    "",
    "---",
    "",
    ...successfulReviews.map((r) => [`## ${r.name}의 리뷰`, "", r.review, "", "---", ""].flat()),
    "## 종합 리포트",
    "",
    reportContent,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const mdPath = join(reviewsDir, `${baseName}.md`);
  writeFileSync(mdPath, mdContent, "utf-8");
  log(`📄 리뷰 저장: ${mdPath}`);

  // 5. 구조화된 항목 JSON 저장
  if (synthesisResult) {
    const jsonPath = join(reviewsDir, `${baseName}_items.json`);
    writeFileSync(jsonPath, JSON.stringify(synthesisResult, null, 2), "utf-8");
    log(`📋 리뷰 항목 저장: ${jsonPath}`);
    console.log(JSON.stringify({ reportPath: mdPath, itemsPath: jsonPath }));
  } else {
    console.log(JSON.stringify({ reportPath: mdPath, itemsPath: null }));
  }

  log("\n✅ 코드 리뷰 완료");
}

main().catch((err) => {
  log(`\n❌ 오류 발생: ${err}`);
  process.exit(1);
});
