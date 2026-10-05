import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const env = loadEnv("test", process.cwd(), "");
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
    // Set PLAYWRIGHT_CHANNEL=msedge (or chrome) to use an installed browser
    // instead of running `npx playwright install chromium`.
    channel: env.PLAYWRIGHT_CHANNEL || undefined,
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: env.TEST_DATABASE_URL ?? "",
      DEV_USER_EMAIL: "e2e@routine.local",
    },
  },
});
