import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 3,
  workers: process.env.CI ? 1 : 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  /* Snapshot testing configuration */
  snapshotDir: "./e2e/__snapshots__",
  snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      /* Threshold for pixel difference (0-1, lower = stricter) */
      maxDiffPixelRatio: 0.001,
      /* Animation stabilization timeout */
      animations: "disabled",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      /* Exclude visual tests from firefox for consistent snapshots */
      testIgnore: /visual\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      /* Exclude visual tests from webkit for consistent snapshots */
      testIgnore: /visual\.spec\.ts/,
    },
  ],
  // We assume the server is already running for this task to avoid conflicts
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
