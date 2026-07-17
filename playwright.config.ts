import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Charge .env.local (non versionné) pour récupérer l'URL cible et les
// identifiants de test, sans dépendance externe.
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx);
    if (!(key in process.env)) {
      process.env[key] = trimmed.slice(idx + 1).replace(/^"|"$/g, "");
    }
  }
}

// Cible des tests : la prod par défaut aujourd'hui, un environnement de
// test dédié plus tard (E2E_BASE_URL dans .env.local ou en variable shell).
const baseURL = process.env.E2E_BASE_URL ?? "https://maintenance-velo.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "fr-FR",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
