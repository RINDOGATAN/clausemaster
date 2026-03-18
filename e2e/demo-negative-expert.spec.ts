/**
 * Demo: Negative test — email NOT in Expert Directory
 *
 * Records a video showing the error when a non-expert tries to
 * use the Expert Directory path.
 *
 * Usage:
 *   BASE_URL=https://clausemaster.todo.law \
 *   TEST_EMAIL=notanexpert@example.com \
 *     npx playwright test e2e/demo-negative-expert.spec.ts
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const TEST_EMAIL = process.env.TEST_EMAIL || "notanexpert@clausemaster.test";

test.describe("Expert Directory — Negative Test", () => {
  test("Non-expert email shows error toast", async ({ page }) => {
    // ── Login ──
    await test.step("Login as non-expert user", async () => {
      await loginAs(page, TEST_EMAIL);
      await page.waitForURL("**/onboarding", { timeout: 15_000 });
      await page.waitForTimeout(1000);
    });

    // ── Try Expert Directory ──
    await test.step("Click Expert Directory and expect error", async () => {
      const expertBtn = page.getByRole("button", { name: /expert directory/i });
      await expect(expertBtn).toBeVisible();
      await expertBtn.click();

      // Should show an error toast (not redirect)
      const toast = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(toast).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(2000);

      // Should still be on /onboarding
      expect(page.url()).toContain("/onboarding");
    });
  });
});
