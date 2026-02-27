#!/usr/bin/env npx tsx

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, ".env");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));

async function main(): Promise<void> {
  console.log("🔧 tw — Social Media Credentials Setup\n");

  if (fs.existsSync(ENV_PATH)) {
    const ans = await ask(".env already exists. Overwrite? (y/n): ");
    if (ans.toLowerCase() !== "y") {
      console.log("Cancelled.");
      rl.close();
      return;
    }
  }

  console.log("\n━━━ X (Twitter) ━━━");
  console.log("📍 https://developer.x.com/en/portal/dashboard");
  console.log("   App > Keys and tokens\n");

  const xApiKey = await ask("  API Key: ");
  const xApiSecret = await ask("  API Key Secret: ");
  const xAccessToken = await ask("  Access Token: ");
  const xAccessSecret = await ask("  Access Token Secret: ");
  const xUsername = await ask("  Username (without @): ");

  console.log("\n━━━ Threads ━━━");
  console.log("📍 https://developers.facebook.com/apps/");
  console.log("   App > Use cases > threads_manage_content");
  console.log("   Generate long-lived token via Graph API Explorer\n");

  const threadsUserId = await ask("  User ID: ");
  const threadsAccessToken = await ask("  Access Token: ");
  const threadsUsername = await ask("  Username (without @): ");

  const env = `# X (Twitter)
X_API_KEY=${xApiKey}
X_API_SECRET=${xApiSecret}
X_ACCESS_TOKEN=${xAccessToken}
X_ACCESS_SECRET=${xAccessSecret}
X_USERNAME=${xUsername}

# Threads
THREADS_USER_ID=${threadsUserId}
THREADS_ACCESS_TOKEN=${threadsAccessToken}
THREADS_USERNAME=${threadsUsername}
`;

  fs.writeFileSync(ENV_PATH, env);
  console.log(`\n✅ Saved: ${ENV_PATH}`);
  rl.close();
}

main();
