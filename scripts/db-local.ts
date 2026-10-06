import { spawnSync } from "node:child_process";

const command = process.argv[2];
const argsByCommand = {
  up: ["compose", "up", "-d", "postgres"],
  down: ["compose", "down"],
  reset: ["compose", "down", "-v"],
};
type DbCommand = keyof typeof argsByCommand;

function isDbCommand(value: string | undefined): value is DbCommand {
  return value !== undefined && value in argsByCommand;
}

if (!isDbCommand(command)) {
  console.error("Usage: bun scripts/db-local.ts <up|down|reset>");
  process.exit(1);
}

function run(args: string[]) {
  const result = spawnSync("docker", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(argsByCommand[command]);
if (command === "reset") run(argsByCommand.up);
