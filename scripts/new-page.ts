import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const route = Bun.argv[2]?.replace(/^\/+|\/+$/g, "");
if (!route || !/^[A-Za-z0-9_[\]-][A-Za-z0-9_[\]/-]*$/.test(route) || route.includes("..")) {
  console.error("Usage: bun run gen:page settings/profile");
  process.exit(1);
}

const dir = join(import.meta.dir, "..", "apps", "web", "src", "routes", ...route.split("/"));
await mkdir(dir, { recursive: true });
await Bun.write(
  join(dir, "+page.svelte"),
  `<svelte:head>
  <title>${route}</title>
</svelte:head>

<main class="mx-auto w-full max-w-screen-lg p-4 sm:p-6">
  <h1 class="text-2xl font-semibold">${route}</h1>
</main>
`,
);
console.log(`Created static page route /${route}`);
