import { defineConfig } from "@playwright/test";
import { apiPort, webPort } from "./e2e/ports";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://127.0.0.1:${webPort}` },
  webServer: [
    {
      command: "pnpm --filter server exec tsx src/index.ts",
      cwd: "../..",
      port: apiPort,
      env: { PORT: String(apiPort), NODE_ENV: "test" },
      reuseExistingServer: false,
    },
    {
      command: `pnpm --filter web exec vite --port ${webPort} --strictPort --host 127.0.0.1`,
      cwd: "../..",
      port: webPort,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` },
      reuseExistingServer: false,
    },
  ],
});
