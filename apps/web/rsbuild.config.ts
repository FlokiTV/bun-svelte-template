import { defineConfig } from "@rsbuild/core";
import { pluginSvelte } from "@rsbuild/plugin-svelte";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";

export default defineConfig({
  plugins: [pluginSvelte(), pluginTailwindcss()],
  source: {
    alias: {
      "#lib": "./src/lib",
    },
    entry: {
      index: "./src/main.ts",
    },
  },
  html: {
    template: "./index.html",
  },
  output: {
    distPath: {
      root: "build",
    },
  },
  server: {
    publicDir: {
      name: "static",
      copyOnBuild: true,
      watch: true,
    },
    htmlFallback: "index",
  },
});
