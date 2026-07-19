/**
 * Compatibility-evaluation fixture run (cm-compat-eval campaign, 2026-07).
 *
 * Drives the REAL authoring pipeline end to end against local dev:
 *   login → upload → analysis (client-driven steps) → generate skill draft →
 *   draft generation (client-driven steps) → export to LEGALSKILLS_DIR.
 *
 * Records per-stage wall-clock metrics to the campaign results dir — these are
 * the "Arm A" numbers for the authoring-comparison study.
 *
 * Usage:
 *   BASE_URL=http://localhost:3002 npx playwright test e2e/compat-fixture-run.spec.ts
 *
 * Requires: E2E_CREDENTIALS_SECRET on the server; the eval user must be
 * INTERNAL + onboarded; LEGALSKILLS_DIR pointed at the campaign export dir.
 */

import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { loginAs } from "./helpers/auth";

const EVAL_EMAIL = process.env.EVAL_EMAIL || "eval@privacycloud.com";
const RESULTS_DIR =
  process.env.COMPAT_RESULTS_DIR || "/Users/sme/NEL/cm-compat-eval/results";

test.use({
  headless: true,
  video: "off",
  trace: "off",
  launchOptions: { slowMo: 0 },
});

interface StageMetric {
  stage: string;
  ms: number;
  note?: string;
}

async function runFixture(
  page: Page,
  opts: { label: string; file: string; expectAssessment: boolean }
) {
  const metrics: StageMetric[] = [];
  const t0 = Date.now();
  let last = t0;
  const mark = (stage: string, note?: string) => {
    const now = Date.now();
    metrics.push({ stage, ms: now - last, note });
    last = now;
  };

  await loginAs(page, EVAL_EMAIL);
  mark("login");

  // Upload
  await page.goto("/documents/new");
  await page.setInputFiles('input[type="file"]', opts.file);
  mark("upload-submitted");

  // Analysis: UploadProgress drives runAnalysisStep, then redirects to /documents/{id}
  // cuid ids are 20+ chars — must not match the literal "/documents/new"
  await page.waitForURL(/\/documents\/[a-z0-9]{20,}$/, { timeout: 1_200_000 });
  const docUrl = page.url();
  mark("analysis-complete", docUrl);

  // Generate skill draft
  const generateBtn = page.getByRole("button", {
    name: /Generate (Dealroom|Assessment) Skill|Generate Skill/i,
  });
  await expect(generateBtn).toBeVisible({ timeout: 30_000 });
  const btnLabel = (await generateBtn.textContent())?.trim() || "";
  if (opts.expectAssessment) {
    expect(btnLabel, "classifier should route this doc to the assessment path").toMatch(/Assessment/i);
  }
  await generateBtn.click();
  await page.waitForURL(/\/skill-draft$/, { timeout: 60_000 });
  mark("draft-created", btnLabel);

  // Draft generation: useSkillDraftDriver loops runStep until REVIEW
  await expect(page.getByText("Ready for Review")).toBeVisible({ timeout: 1_200_000 });
  mark("draft-generated");

  // Export (INTERNAL-only button)
  const exportBtn = page.getByRole("button", { name: /Export to Dealroom/i });
  await expect(exportBtn).toBeVisible({ timeout: 30_000 });
  await exportBtn.click();
  await expect(page.getByText(/Exported successfully|Exported to:/i).first()).toBeVisible({
    timeout: 120_000,
  });
  mark("exported");

  const result = {
    label: opts.label,
    file: opts.file,
    docUrl,
    generateButtonLabel: btnLabel,
    totalMs: Date.now() - t0,
    stages: metrics,
    ranAt: new Date().toISOString(),
  };
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    `${RESULTS_DIR}/phase1-metrics-${opts.label}.json`,
    JSON.stringify(result, null, 2)
  );
  return result;
}

test.describe("compat fixture generation", () => {
  test("contract skill from Series A term sheet", async ({ page }) => {
    test.setTimeout(2_700_000);
    const r = await runFixture(page, {
      label: "contract",
      file: "manual-samples/Series A Term Sheet.pdf",
      expectAssessment: false,
    });
    console.log("contract fixture:", JSON.stringify(r));
  });

  test("assessment skill from vendor DPIA questionnaire", async ({ page }) => {
    test.setTimeout(2_700_000);
    const r = await runFixture(page, {
      label: "assessment",
      file: "/Users/sme/NEL/cm-compat-eval/fixtures/source-docs/vendor-dpia-questionnaire.txt",
      expectAssessment: true,
    });
    console.log("assessment fixture:", JSON.stringify(r));
  });
});
