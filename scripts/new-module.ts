import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const rawName = Bun.argv[2];
if (!rawName) {
  console.error("Usage: bun run gen:module <module-name>");
  process.exit(1);
}

const name = rawName.trim().toLowerCase();
if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("Module name must match /^[a-z][a-z0-9-]*$/");
  process.exit(1);
}

const camel = name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
const root = join(import.meta.dir, "..");
const dir = join(root, "apps", "api", "src", "modules", name);
await mkdir(dir, { recursive: true });

const files = {
  [`${name}.model.ts`]: `import { t } from "elysia";

export const ${camel}Input = t.Object({
  name: t.String({ minLength: 1 }),
});
`,
  [`${name}.service.ts`]: `export function ${camel}Service() {
  return { ok: true as const };
}
`,
  [`${name}.routes.ts`]: `import { Elysia } from "elysia";
import { ${camel}Service } from "./${name}.service";

export const ${camel}Routes = new Elysia({ prefix: "/${name}" }).get("/", () => ${camel}Service(), {
  detail: { tags: ["${name}"], summary: "Replace with a real endpoint" },
});
`,
  [`${name}.test.ts`]: `import { describe, expect, test } from "bun:test";
import { ${camel}Service } from "./${name}.service";

describe("${name}", () => {
  test("service has a deterministic baseline", () => {
    expect(${camel}Service()).toEqual({ ok: true });
  });
});
`,
};

for (const [file, content] of Object.entries(files)) await Bun.write(join(dir, file), content);

const indexPath = join(root, "apps", "api", "src", "modules", "index.ts");
let index = await readFile(indexPath, "utf8");
const importLine = `import { ${camel}Routes } from "./${name}/${name}.routes";
`;
if (!index.includes(importLine.trim())) {
  const lines = index.split("\n");
  const lastImport = lines.reduce(
    (position, line, i) => (line.startsWith("import ") ? i : position),
    -1,
  );
  lines.splice(lastImport + 1, 0, importLine.trimEnd());
  index = lines.join("\n");
}
if (!index.includes(`.use(${camel}Routes)`)) {
  index = index.replace(/;\s*$/, `\n  .use(${camel}Routes);\n`);
}
await writeFile(indexPath, index);

console.log(`Created and registered API module: ${name}`);
