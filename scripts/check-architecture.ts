import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const webSrc = join(root, "apps", "web", "src");
const apiSrc = join(root, "apps", "api", "src");
const forbiddenNames = [
  "+page.server.ts",
  "+page.server.js",
  "+layout.server.ts",
  "+layout.server.js",
  "+server.ts",
  "+server.js",
  "hooks.server.ts",
  "hooks.server.js",
];
const forbiddenWebImports = [
  "drizzle-orm",
  'from "postgres"',
  "from 'postgres'",
  "@vibe/api",
  "apps/api",
];
const sourceExtensions = [".ts", ".js", ".svelte"];
const failures: string[] = [];

async function walk(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

for (const file of await walk(webSrc)) {
  const name = file.split(/[\\/]/).pop() ?? "";
  if (forbiddenNames.includes(name)) {
    failures.push(`server-side Svelte file is forbidden: ${relative(root, file)}`);
  }
  if (!sourceExtensions.some((extension) => file.endsWith(extension))) continue;

  const content = await readFile(file, "utf8");
  for (const token of forbiddenWebImports) {
    if (content.includes(token)) {
      failures.push(`forbidden frontend dependency '${token}' in ${relative(root, file)}`);
    }
  }
}

for (const file of await walk(apiSrc)) {
  if (!file.endsWith(".ts")) continue;
  const rel = relative(root, file).replaceAll("\\", "/");
  const content = await readFile(file, "utf8");

  if (rel !== "apps/api/src/config.ts" && /\b(?:Bun\.env|process\.env)\b/.test(content)) {
    failures.push(`runtime env access outside config.ts: ${rel}`);
  }
  if (
    rel !== "apps/api/src/core/logger.ts" &&
    /console\.(?:log|warn|error|debug)\(/.test(content)
  ) {
    failures.push(`use structured logger instead of console.* in API source: ${rel}`);
  }
  if (
    rel.includes("/modules/") &&
    rel.endsWith(".routes.ts") &&
    /from ["']\.\.\/\.\.\/db\//.test(content)
  ) {
    failures.push(`route imports DB directly; use service/repository boundary: ${rel}`);
  }
}

const layout = await readFile(join(webSrc, "routes", "+layout.ts"), "utf8");
if (!layout.includes("export const ssr = false")) {
  failures.push("apps/web/src/routes/+layout.ts must export `ssr = false`");
}

const viteConfig = await readFile(join(root, "apps", "web", "vite.config.ts"), "utf8");
if (!viteConfig.includes("@sveltejs/adapter-static")) {
  failures.push("apps/web must use @sveltejs/adapter-static");
}
if (!viteConfig.includes('fallback: "200.html"')) {
  failures.push('apps/web must configure adapter-static fallback: "200.html"');
}

if (failures.length > 0) {
  console.error("Architecture check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Architecture check passed");
