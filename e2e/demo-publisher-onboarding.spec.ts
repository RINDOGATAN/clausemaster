/**
 * Demo: Full publisher onboarding via Expert Directory
 *
 * Records a video of the entire flow:
 *   1. E2E login (auto-creates user) → redirected to /onboarding
 *   2. Onboarding → "I'm in the Expert Directory" → auto-verify
 *   3. Publisher setup wizard (profile → stripe → API key → ready)
 *
 * Prerequisites:
 *   - E2E_CREDENTIALS_SECRET must be set on the target Clausemaster instance.
 *   - The test email must exist in the Dealroom Expert Directory
 *     with a LawyerProfile that has a title or specializations.
 *   - DEALROOM_API_URL and DEALROOM_API_KEY must be set on Clausemaster.
 *
 * Usage:
 *   # Against production
 *   BASE_URL=https://clausemaster.todo.law \
 *   TEST_EMAIL=sergio.dejuandreix@croma.legal \
 *     npx playwright test e2e/demo-publisher-onboarding.spec.ts
 *
 *   # Against local dev
 *   TEST_EMAIL=sergio.dejuandreix@croma.legal \
 *     npx playwright test e2e/demo-publisher-onboarding.spec.ts
 *
 * Video + screenshots saved to e2e/results/
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// ── Config ─────────────────────────────────────────────────────────

const TEST_EMAIL = process.env.TEST_EMAIL || "sergio.dejuandreix@croma.legal";

// Demo profile data
const DEMO_PROFILE = {
  firmName: "Croma Legal",
  specialties: "Privacy, Data Protection, GDPR",
  bio: "Boutique law firm specializing in technology law, data protection, and digital compliance across EU jurisdictions.",
  website: "https://croma.legal",
};

// ── Helpers ─────────────────────────────────────────────────────────

async function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function screenshot(page: Page, name: string) {
  await pause(500);
  await page.screenshot({ path: `e2e/results/screenshots/${name}.png`, fullPage: true });
}

// ── Test ────────────────────────────────────────────────────────────

test.describe("Publisher Onboarding Demo", () => {
  test("Full flow: login → expert directory → publisher wizard", async ({ page }) => {
    // ────────────────────────────────────────────────────────────────
    // SCENE 1: Authenticate via E2E credentials
    // ────────────────────────────────────────────────────────────────
    await test.step("Login as test user", async () => {
      await loginAs(page, TEST_EMAIL);
      await pause(1500);
      await screenshot(page, "01-authenticated");
    });

    // ────────────────────────────────────────────────────────────────
    // SCENE 2: Onboarding — Expert Directory verification
    // ────────────────────────────────────────────────────────────────
    await test.step("Onboarding: click Expert Directory button", async () => {
      // Should be on /onboarding (new user, not yet onboarded)
      await page.waitForURL("**/onboarding", { timeout: 15_000 });
      await expect(page.locator("h1")).toBeVisible();
      await pause(1000);
      await screenshot(page, "02-onboarding-page");

      // Scroll to see the Expert Directory option
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
      await pause(800);

      // Click "I'm in the Expert Directory"
      const expertBtn = page.getByRole("button", { name: /expert directory/i });
      await expect(expertBtn).toBeVisible();
      await screenshot(page, "03-expert-directory-option");
      await expertBtn.click();

      // Wait for redirect to publisher-setup
      await page.waitForURL("**/publisher-setup**", { timeout: 15_000 });
      await pause(1500);
      await screenshot(page, "04-publisher-setup-start");
    });

    // ────────────────────────────────────────────────────────────────
    // SCENE 3: Publisher Setup Wizard — Step 1: Profile
    // ────────────────────────────────────────────────────────────────
    await test.step("Wizard Step 1: Fill in profile", async () => {
      await expect(page.locator("h2")).toContainText(/profile|perfil/i);
      await pause(500);

      // Fill firm name (first input)
      const inputs = page.locator("input");
      await inputs.first().click();
      await inputs.first().pressSequentially(DEMO_PROFILE.firmName, { delay: 40 });
      await pause(300);

      // Fill specialties (second input)
      await inputs.nth(1).click();
      await inputs.nth(1).pressSequentially(DEMO_PROFILE.specialties, { delay: 30 });
      await pause(300);

      // Fill bio (textarea)
      await page.locator("textarea").click();
      await page.locator("textarea").pressSequentially(DEMO_PROFILE.bio, { delay: 20 });
      await pause(300);

      // Fill website (last input)
      await inputs.last().click();
      await inputs.last().pressSequentially(DEMO_PROFILE.website, { delay: 30 });
      await pause(500);

      await screenshot(page, "05-profile-filled");

      // Save & Continue
      await page.getByRole("button", { name: /save|guardar/i }).click();
      await pause(2000);
      await screenshot(page, "06-profile-saved");
    });

    // ────────────────────────────────────────────────────────────────
    // SCENE 4: Publisher Setup Wizard — Step 2: Stripe Connect
    // ────────────────────────────────────────────────────────────────
    await test.step("Wizard Step 2: Stripe Connect (skip for demo)", async () => {
      await expect(page.locator("text=70%")).toBeVisible();
      await pause(1500);
      await screenshot(page, "07-stripe-step");

      // Skip Stripe (don't redirect to external Stripe onboarding)
      await page.getByText(/skip|saltar|continue/i).last().click();
      await pause(1500);
      await screenshot(page, "08-stripe-skipped");
    });

    // ────────────────────────────────────────────────────────────────
    // SCENE 5: Publisher Setup Wizard — Step 3: API Key
    // ────────────────────────────────────────────────────────────────
    await test.step("Wizard Step 3: API Key (skip for demo)", async () => {
      await expect(page.locator("h2")).toContainText(/api|clave/i);
      await pause(1500);
      await screenshot(page, "09-api-key-step");

      // Skip
      await page.getByText(/skip|saltar/i).last().click();
      await pause(1500);
      await screenshot(page, "10-api-key-skipped");
    });

    // ────────────────────────────────────────────────────────────────
    // SCENE 6: Publisher Setup Wizard — Step 4: Ready
    // ────────────────────────────────────────────────────────────────
    await test.step("Wizard Step 4: Ready checklist", async () => {
      await expect(page.locator("h2")).toBeVisible();
      await pause(1500);
      await screenshot(page, "11-ready-checklist");
      await pause(2000);
      await screenshot(page, "12-final-state");
    });

    // ────────────────────────────────────────────────────────────────
    // SCENE 7: Navigate to dashboard
    // ────────────────────────────────────────────────────────────────
    await test.step("Go to dashboard", async () => {
      await page.getByRole("button", { name: /dashboard|panel/i }).click();
      await page.waitForURL("**/documents**", { timeout: 10_000 });
      await pause(2000);
      await screenshot(page, "13-dashboard");
    });
  });
});
