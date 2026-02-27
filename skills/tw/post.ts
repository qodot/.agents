#!/usr/bin/env npx tsx

import OAuth from "oauth-1.0a";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Types ───────────────────────────────────────────────────────────────────

interface Config {
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_SECRET?: string;
  X_USERNAME?: string;
  THREADS_USER_ID?: string;
  THREADS_ACCESS_TOKEN?: string;
  THREADS_USERNAME?: string;
  [key: string]: string | undefined;
}

interface PostResult {
  id: string;
  url: string;
}

interface PostError {
  error: string;
  message: string;
}

type PostOutcome = PostResult | PostError;

// ── Config ──────────────────────────────────────────────────────────────────

function loadConfig(): Config {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env not found. Configure credentials first.");
    process.exit(1);
  }
  const config: Config = {};
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) config[m[1].trim()] = m[2].trim();
  }
  return config;
}

// ── Args ────────────────────────────────────────────────────────────────────

function parseArgs(): { text: string; image: string | null } {
  const args = process.argv.slice(2);
  let text: string | null = null;
  let image: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) text = args[++i];
    else if (args[i] === "--image" && args[i + 1]) image = args[++i];
  }

  if (!text) {
    console.error('Usage: npx tsx post.ts --text "..." [--image /path/to/image]');
    process.exit(1);
  }
  return { text, image };
}

// ── URL Image Download ──────────────────────────────────────────────────────

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

async function downloadImage(url: string): Promise<string> {
  console.log(`📥 Downloading image from URL...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);

  const contentType = res.headers.get("content-type") || "";
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png",
    "image/gif": ".gif", "image/webp": ".webp",
  };
  const ext = extMap[contentType] || path.extname(new URL(url).pathname) || ".jpg";
  const tmpPath = path.join(os.tmpdir(), `tw-img-${Date.now()}${ext}`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmpPath, buf);
  console.log(`  ✅ Downloaded: ${tmpPath} (${(buf.length / 1024).toFixed(0)}KB)`);
  return tmpPath;
}

// ── Temp Image Host (for Threads) ───────────────────────────────────────────

function uploadToTempHost(imagePath: string): string {
  console.log("📤 Uploading image to temp host for Threads...");
  const absPath = path.resolve(imagePath);
  try {
    const result = execFileSync(
      "curl",
      ["-s", "-F", "reqtype=fileupload", "-F", `fileToUpload=@${absPath}`, "https://catbox.moe/user/api.php"],
      { encoding: "utf-8", timeout: 60000 },
    );
    const url = result.trim();
    if (!url.startsWith("http")) throw new Error(`Unexpected response: ${url}`);
    console.log(`  ✅ Uploaded: ${url}`);
    return url;
  } catch (e) {
    throw new Error(`Image temp upload failed: ${(e as Error).message}`);
  }
}

// ── Twitter / X ─────────────────────────────────────────────────────────────

async function postToTwitter(text: string, imagePath: string | null, config: Config): Promise<PostResult> {
  console.log("\n🐦 Posting to X (Twitter)...");

  const oauth = new OAuth({
    consumer: { key: config.X_API_KEY!, secret: config.X_API_SECRET! },
    signature_method: "HMAC-SHA1",
    hash_function: (base: string, key: string) =>
      crypto.createHmac("sha1", key).update(base).digest("base64"),
  });
  const token = { key: config.X_ACCESS_TOKEN!, secret: config.X_ACCESS_SECRET! };

  let mediaId: string | null = null;

  // Upload media (v1.1)
  if (imagePath) {
    const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
    const base64Data = fs.readFileSync(imagePath, "base64");
    const authData = { url: uploadUrl, method: "POST", data: { media_data: base64Data } };
    const auth = oauth.toHeader(oauth.authorize(authData, token));

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ media_data: base64Data }),
    });
    if (!res.ok) throw new Error(`Media upload failed (${res.status}): ${await res.text()}`);

    const data = (await res.json()) as { media_id_string: string };
    mediaId = data.media_id_string;
    console.log(`  📷 Media uploaded: ${mediaId}`);
  }

  // Post tweet (v2)
  const tweetUrl = "https://api.twitter.com/2/tweets";
  const auth = oauth.toHeader(oauth.authorize({ url: tweetUrl, method: "POST" }, token));

  const body: Record<string, unknown> = { text };
  if (mediaId) body.media = { media_ids: [mediaId] };

  const res = await fetch(tweetUrl, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Tweet failed (${res.status}): ${await res.text()}`);

  const result = (await res.json()) as { data: { id: string } };
  const id = result.data.id;
  const url = `https://x.com/${config.X_USERNAME}/status/${id}`;
  console.log(`  ✅ Posted: ${url}`);
  return { id, url };
}

// ── Threads ─────────────────────────────────────────────────────────────────

async function postToThreads(text: string, publicImageUrl: string | null, config: Config): Promise<PostResult> {
  console.log("\n🧵 Posting to Threads...");

  const userId = config.THREADS_USER_ID!;
  const accessToken = config.THREADS_ACCESS_TOKEN!;
  const base = "https://graph.threads.net/v1.0";

  // 1. Create container
  const containerParams: Record<string, string> = {
    access_token: accessToken,
    text,
    media_type: publicImageUrl ? "IMAGE" : "TEXT",
  };
  if (publicImageUrl) containerParams.image_url = publicImageUrl;

  const cRes = await fetch(`${base}/${userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(containerParams),
  });
  if (!cRes.ok) throw new Error(`Container failed (${cRes.status}): ${await cRes.text()}`);

  const container = (await cRes.json()) as { id: string };
  console.log(`  📦 Container: ${container.id}`);

  // 2. Poll status (max 30s)
  for (let i = 0; i < 15; i++) {
    await new Promise<void>((r) => setTimeout(r, 2000));
    const sRes = await fetch(`${base}/${container.id}?fields=status,error_message&access_token=${accessToken}`);
    const status = (await sRes.json()) as { status: string; error_message?: string };

    if (status.status === "FINISHED") break;
    if (status.status === "ERROR") throw new Error(`Container error: ${status.error_message}`);
    if (i === 14) throw new Error("Container processing timed out");
    console.log(`  ⏳ ${status.status}...`);
  }

  // 3. Publish
  const pRes = await fetch(`${base}/${userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: accessToken, creation_id: container.id }),
  });
  if (!pRes.ok) throw new Error(`Publish failed (${pRes.status}): ${await pRes.text()}`);

  const result = (await pRes.json()) as { id: string };

  // 4. Get permalink
  let url = `https://www.threads.net/@${config.THREADS_USERNAME}`;
  try {
    const pLink = await fetch(`${base}/${result.id}?fields=permalink&access_token=${accessToken}`);
    if (pLink.ok) {
      const pData = (await pLink.json()) as { permalink?: string };
      if (pData.permalink) url = pData.permalink;
    }
  } catch {
    // permalink fetch is best-effort
  }

  console.log(`  ✅ Posted: ${url}`);
  return { id: result.id, url };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { text, image: rawImage } = parseArgs();
  const config = loadConfig();

  // Resolve image: URL → download, path → validate
  let image = rawImage;
  let tmpImage: string | null = null;
  if (image) {
    if (isUrl(image)) {
      image = await downloadImage(image);
      tmpImage = image;
    }
    if (!fs.existsSync(image)) {
      console.error(`❌ Image not found: ${image}`);
      process.exit(1);
    }
    const stat = fs.statSync(image);
    if (stat.size > 5 * 1024 * 1024) {
      console.error(`❌ Image too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`);
      process.exit(1);
    }
  }

  // Check platforms
  const hasX = !!(config.X_API_KEY && config.X_API_SECRET && config.X_ACCESS_TOKEN && config.X_ACCESS_SECRET);
  const hasThreads = !!(config.THREADS_USER_ID && config.THREADS_ACCESS_TOKEN);

  if (!hasX && !hasThreads) {
    console.error("❌ No platform credentials configured. Set up .env first.");
    process.exit(1);
  }

  // Upload image to temp host for Threads
  let publicImageUrl: string | null = null;
  if (image && hasThreads) {
    publicImageUrl = uploadToTempHost(image);
  }

  console.log(`\n📝 Posting: "${text}"${image ? " + 📷 image" : ""}`);

  // Post in parallel
  const promises: Promise<PostOutcome>[] = [];
  if (hasX)
    promises.push(postToTwitter(text, image, config).catch((e): PostError => ({ error: "X", message: (e as Error).message })));
  if (hasThreads)
    promises.push(postToThreads(text, publicImageUrl, config).catch((e): PostError => ({ error: "Threads", message: (e as Error).message })));

  const results = await Promise.all(promises);

  // Summary
  console.log("\n" + "─".repeat(50));
  console.log("📊 Summary:");
  let hasError = false;
  for (const r of results) {
    if ("error" in r) {
      console.log(`  ❌ ${r.error}: ${r.message}`);
      hasError = true;
    } else {
      console.log(`  ✅ ${r.url}`);
    }
  }

  // Cleanup temp file
  if (tmpImage && fs.existsSync(tmpImage)) fs.unlinkSync(tmpImage);

  if (hasError) process.exit(1);
}

main();
