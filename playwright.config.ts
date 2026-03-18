import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || "https://clausemaster.todo.law",
    headless: false,
    viewport: { width: 1280, height: 800 },
    video: "on",
    screenshot: "on",
    trace: "on",
    launchOptions: {
      slowMo: 600, // Slow enough for a demo video
    },
  },
  outputDir: "e2e/results",
  reporter: [["html", { open: "never" }]],
});
