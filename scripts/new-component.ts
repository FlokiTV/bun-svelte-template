import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const name = Bun.argv[2];
if (!name || !/^[A-Z][A-Za-z0-9]*$/.test(name)) {
  console.error("Usage: bun run gen:component ComponentName");
  process.exit(1);
}

const dir = join(import.meta.dir, "..", "apps", "web", "src", "lib", "components");
await mkdir(dir, { recursive: true });
await Bun.write(
  join(dir, `${name}.svelte`),
  `<script lang="ts">
  let { title }: { title: string } = $props();
</script>

<div class="rounded-xl border p-4">
  {title}
</div>
`,
);
await Bun.write(
  join(dir, `${name}.test.ts`),
  `import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "@rstest/core";
import ${name} from "./${name}.svelte";

describe("${name}", () => {
  test("renders", () => {
    render(${name}, { title: "Example" });
    expect(screen.getByText("Example")).toBeTruthy();
  });
});
`,
);
console.log(`Created ${name}.svelte and ${name}.test.ts`);
