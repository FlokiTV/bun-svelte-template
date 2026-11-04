import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // The shared Rsbuild dev server can drop lazy E2E imports under a large cold-start burst.
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: [
    {
      command: "bun run dev:api",
      url: "http://localhost:3000/api/v1/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "bun run dev:web",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
