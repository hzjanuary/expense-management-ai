import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-visual",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    actionTimeout: 15_000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    locale: "vi-VN",
    screenshot: "only-on-failure",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
    viewport: {
      height: 900,
      width: 1440,
    },
  },
  reporter: [["list"]],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
