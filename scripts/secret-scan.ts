import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const ignored = new Set([
  "node_modules",
  ".git",
  "build",
  "dist",
  "playwright-report",
  "test-results",
]);
const allowedExamples = new Set(["apps/api/.env.example", "apps/web/.env.example"]);
const patterns = [
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Stripe live key", regex: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { name: "Resend key", regex: /\bre_[A-Za-z0-9_-]{30,}\b/ },
];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

const failures: string[] = [];
for (const file of await walk(root)) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const ignoredFile =
    allowedExamples.has(rel) ||
    rel.endsWith(".zip") ||
    rel.endsWith("bun.lock") ||
    rel.endsWith("bun.lockb");
  if (ignoredFile) continue;

  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch {
    continue;
  }

  for (const pattern of patterns) {
    if (pattern.regex.test(content)) failures.push(`${pattern.name}: ${rel}`);
  }
}

if (failures.length) {
  console.error("Potential secrets detected:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Secret scan passed");
