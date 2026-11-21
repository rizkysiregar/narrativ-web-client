import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against a deployed environment (dev by default), run by Jenkins after each deploy. They sign in with a
 * real test account and touch the real backend, so they cover what the unit tests cannot: ingress, cookies, CORS,
 * CSP and the API itself.
 *
 *   E2E_USERNAME=... E2E_PASSWORD=... E2E_CHANNEL=chrome npm run e2e
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["junit", { outputFile: "e2e-results/junit.xml" }]] : "list",
  outputDir: "e2e-results/artifacts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://app-dev-narrativ.rizkysiregar.my.id",
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // E2E_CHANNEL=chrome uses the installed Google Chrome instead of downloading Playwright's browser
    ...(process.env.E2E_CHANNEL && { channel: process.env.E2E_CHANNEL }),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
