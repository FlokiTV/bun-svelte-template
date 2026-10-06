import { spawnSync } from "node:child_process";

const steps = [
  ["architecture", ["bun", "run", "architecture:check"]],
  ["secrets", ["bun", "run", "secrets:check"]],
  ["lint", ["bun", "run", "lint"]],
  ["typecheck", ["bun", "run", "check"]],
  ["tests", ["bun", "run", "test"]],
  ["openapi", ["bun", "run", "openapi:check"]],
  ["build", ["bun", "run", "build"]],
] as const;

for (const [label, command] of steps) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command[0], command.slice(1), { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nverify failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nverify passed");
