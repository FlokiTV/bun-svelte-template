import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
let failures = 0;
const ok = (message: string) => console.log(`✓ ${message}`);
const warn = (message: string) => console.warn(`! ${message}`);
const fail = (message: string) => {
  failures += 1;
  console.error(`✗ ${message}`);
};

if (process.versions.bun) ok(`Bun ${process.versions.bun}`);
else fail("This template expects Bun. Run doctor with Bun.");

const requiredFiles = [
  "AGENTS.md",
  "PROJECT.md",
  "ai/project.json",
  "docker-compose.yml",
  "apps/web/svelte.config.js",
  "apps/api/src/app.ts",
];
for (const path of requiredFiles) {
  existsSync(join(root, path)) ? ok(path) : fail(`missing ${path}`);
}

const project = JSON.parse(await readFile(join(root, "ai", "project.json"), "utf8"));
if (project.frontend?.ssr === false) ok("frontend SSR disabled in ai/project.json");
else fail("ai/project.json must declare SSR=false");

if (existsSync(join(root, "node_modules"))) ok("dependencies installed");
else warn("node_modules not found; run `bun install`");

if (existsSync(join(root, "apps", "api", ".env"))) ok("apps/api/.env present");
else warn("apps/api/.env missing; copy apps/api/.env.example");

for (const [label, command] of [
  ["architecture constraints", ["bun", "run", "architecture:check"]],
  ["secret scan", ["bun", "run", "secrets:check"]],
] as const) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    stdio: "inherit",
  });
  result.status === 0 ? ok(label) : fail(label);
}

const docker = spawnSync("docker", ["--version"], {
  cwd: root,
  encoding: "utf8",
});
if (docker.status === 0) ok(docker.stdout.trim());
else warn("Docker not found; local PostgreSQL helper commands will be unavailable");

if (process.env.DOCTOR_DB === "1") {
  const db = spawnSync("bun", ["--filter", "@vibe/api", "db:check"], {
    cwd: root,
    stdio: "inherit",
  });
  db.status === 0 ? ok("PostgreSQL reachable") : fail("PostgreSQL check failed");
} else {
  warn("database connectivity skipped; run `DOCTOR_DB=1 bun run doctor` when needed");
}

if (failures > 0) process.exit(1);
console.log("Doctor completed without blocking issues");
