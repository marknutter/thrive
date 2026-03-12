import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3022",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3022",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      BETTER_AUTH_SECRET: "test-secret-do-not-use-in-production",
      BETTER_AUTH_URL: "http://localhost:3022",
      DATABASE_PATH: "./data/test-e2e.db",
    },
  },
});
