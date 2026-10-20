import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run start --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    env: {
      // Synthetic OAuth configuration makes sign-in render without contacting GitHub.
      NEXTAUTH_URL: "https://repodoc.example.test",
      AUTH_URL: "https://repodoc.example.test",
      NEXTAUTH_SECRET: "e2e-only-session-secret-do-not-use-in-production",
      AUTH_SECRET: "e2e-only-session-secret-do-not-use-in-production",
      GITHUB_CLIENT_ID: "e2e-oauth-client",
      GITHUB_CLIENT_SECRET: "e2e-oauth-secret",
      AUTH_GITHUB_ID: "e2e-oauth-client",
      AUTH_GITHUB_SECRET: "e2e-oauth-secret",
      GITHUB_TOKEN: "",
      AUTH_REDIRECT_PROXY_URL: "",
    },
  },
});
