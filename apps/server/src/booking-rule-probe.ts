// Booking-rule probe, run by `mise run check`: breaks the half-open overlap rule in a
// throwaway copy of the Booking store, runs the one test that guards it, and passes only
// if that test fails. The source file is never written, so the rule is restored on exit.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const rule = "b.start < a.end";
const broken = "b.start <= a.end";
const guardingTest = "allows a start at 11:00 right after a 10:00–11:00 Booking";

const source = readFileSync(join(serverDir, "src/booking-store.ts"), "utf8");
if (source.split(rule).length !== 2) {
  throw new Error(`Probe expected exactly one "${rule}" in src/booking-store.ts`);
}

const work = mkdtempSync(join(tmpdir(), "booking-rule-probe-"));
try {
  const brokenStore = join(work, "booking-store.ts");
  writeFileSync(brokenStore, source.replace(rule, broken));
  const config = join(work, "vitest.config.mjs");
  writeFileSync(
    config,
    `export default ${JSON.stringify({
      root: serverDir,
      resolve: { alias: [{ find: "./booking-store.js", replacement: brokenStore }] },
      test: { env: { NODE_ENV: "test" } },
    })};\n`,
  );
  const report = join(work, "report.json");
  spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "src/bookings.test.ts",
      "--config",
      config,
      "--testNamePattern",
      guardingTest,
      "--reporter=json",
      "--outputFile",
      report,
    ],
    { cwd: serverDir, stdio: "ignore" },
  );
  const { numFailedTests, numPassedTests } = JSON.parse(readFileSync(report, "utf8")) as {
    numFailedTests: number;
    numPassedTests: number;
  };
  if (numFailedTests !== 1 || numPassedTests !== 0) {
    throw new Error(
      `Probe expected "${guardingTest}" alone to fail with the rule broken: ${numFailedTests} failed, ${numPassedTests} passed`,
    );
  }
  console.log(`Booking-rule probe: "${guardingTest}" fails when "${rule}" becomes "${broken}".`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
