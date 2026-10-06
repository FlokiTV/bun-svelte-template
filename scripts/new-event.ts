import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const raw = Bun.argv[2];
if (!raw || !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(raw)) {
  console.error("Usage: bun run gen:event notification.created");
  process.exit(1);
}
const safe = raw.replaceAll(".", "-");
const typeName = `${raw
  .split(".")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join("")}Event`;
const dir = join(import.meta.dir, "..", "packages", "contracts", "src", "events");
await mkdir(dir, { recursive: true });
await Bun.write(
  join(dir, `${safe}.ts`),
  `export type ${typeName} = {
  type: "${raw}";
  payload: Record<string, unknown>;
};
`,
);
console.log(
  `Created event contract ${raw}. Export it from packages/contracts/src/index.ts when ready.`,
);
