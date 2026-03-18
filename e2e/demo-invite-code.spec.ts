/**
 * Demo: Publisher onboarding via invite code
 *
 * Records a video of:
 *   1. E2E login (auto-creates user) → redirected to /onboarding
 *   2. Onboarding → enter invite code → verify → publisher access
 *   3. Publisher setup wizard walkthrough
 *
 * Usage:
 *   BASE_URL=https://clausemaster.todo.law \
 *   TEST_EMAIL=newlawyer@example.com \
 *   INVITE_CODE=PUBLISHER-BETA-2026 \
 *     npx playwright test e2e/demo-invite-code.spec.ts
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const TEST_EMAIL = process.env.TEST_EMAIL || "demo-invite@clausemaster.test";
const INVITE_CODE = process.env.INVITE_CODE || "PUBLISHER-BETA-2026";

test.describe("Invite Code Onboarding Demo", () => {
  test("Full flow: login → invite code → publisher wizard", async ({ page }) => {
    // ── Login ──
    await test.step("Login as new user", async () => {
      await loginAs(page, TEST_EMAIL);
      await page.waitForURL("**/onboarding", { timeout: 15_000 });
      await page.waitForTimeout(1000);
    });

    // ── Enter invite code ──
    await test.step("Enter invite code", async () => {
      const codeInput = page.locator('input[type="text"]');
      await expect(codeInput).toBeVisible();
      await codeInput.pressSequentially(INVITE_CODE, { delay: 50 });
      await page.waitForTimeout(500);

      await page.getByRole("button", { name: /verify|verificar/i }).click();

      // Should redirect to publisher-setup
      await page.waitForURL("**/publisher-setup**", { timeout: 15_000 });
      await page.waitForTimeout(1500);
    });

    // ── Wizard walkthrough (skip all for brevity) ──
    await test.step("Walk through publisher wizard", async () => {
      // Step 1: Profile — skip
      await expect(page.locator("h2")).toBeVisible();
      await page.waitForTimeout(1000);
      await page.getByText(/skip|saltar/i).last().click();
      await page.waitForTimeout(1000);

      // Step 2: Stripe — skip
      await expect(page.locator("text=70%")).toBeVisible();
      await page.waitForTimeout(1000);
      await page.getByText(/skip|saltar|continue/i).last().click();
      await page.waitForTimeout(1000);

      // Step 3: API Key — skip
      await page.waitForTimeout(1000);
      await page.getByText(/skip|saltar/i).last().click();
      await page.waitForTimeout(1000);

      // Step 4: Ready
      await expect(page.locator("h2")).toBeVisible();
      await page.waitForTimeout(2000);
    });
  });
});
