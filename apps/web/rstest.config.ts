import { withRsbuildConfig } from "@rstest/adapter-rsbuild";
import { defineConfig } from "@rstest/core";

export default defineConfig({
  extends: withRsbuildConfig(),
  testEnvironment: "jsdom",
  setupFiles: ["./src/test/setup.ts"],
  restoreMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
});
