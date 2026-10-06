import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const webRoot = join(root, "apps", "web");
const webSrc = join(webRoot, "src");
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
  'from "node:',
  "from 'node:",
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

const rsbuildConfig = await readFile(join(webRoot, "rsbuild.config.ts"), "utf8");
for (const requirement of [
  ["@rsbuild/plugin-svelte", "apps/web must use @rsbuild/plugin-svelte"],
  ["@rsbuild/plugin-tailwindcss", "apps/web must use @rsbuild/plugin-tailwindcss"],
  ['root: "build"', 'apps/web Rsbuild output must use root: "build"'],
  ['htmlFallback: "index"', 'apps/web Rsbuild dev server must use htmlFallback: "index"'],
] as const) {
  if (!rsbuildConfig.includes(requirement[0])) failures.push(requirement[1]);
}

const webPackage = JSON.parse(await readFile(join(webRoot, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const allWebDeps = { ...webPackage.dependencies, ...webPackage.devDependencies };
for (const name of [
  "@sveltejs/kit",
  "@sveltejs/adapter-static",
  "@sveltejs/vite-plugin-svelte",
  "vite",
  "vitest",
]) {
  if (name in allWebDeps) failures.push(`apps/web must not depend on ${name}`);
}
for (const name of [
  "@rsbuild/core",
  "@rsbuild/plugin-svelte",
  "@rsbuild/plugin-tailwindcss",
  "@rstest/core",
]) {
  if (!(name in allWebDeps)) failures.push(`apps/web must depend on ${name}`);
}
if (!webPackage.scripts?.dev?.startsWith("rsbuild dev")) {
  failures.push("apps/web dev script must use rsbuild dev");
}
if (!webPackage.scripts?.build?.startsWith("rsbuild build")) {
  failures.push("apps/web build script must use rsbuild build");
}
if (!webPackage.scripts?.test?.startsWith("rstest")) {
  failures.push("apps/web test script must use rstest");
}

const redirects = await readFile(join(webRoot, "static", "_redirects"), "utf8");
if (!redirects.includes("/* /200.html 200")) {
  failures.push("apps/web static/_redirects must preserve the SPA 200.html fallback");
}

if (failures.length > 0) {
  console.error("Architecture check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Architecture check passed");
