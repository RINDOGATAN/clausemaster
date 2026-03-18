import { type Page, type Browser } from "@playwright/test";

const E2E_SECRET = process.env.E2E_CREDENTIALS_SECRET || "e2e-test-secret";
const DEFAULT_BASE_URL = process.env.BASE_URL || "http://localhost:3002";

/**
 * Sign in as a specific email via the E2E credentials provider.
 * Requires E2E_CREDENTIALS_SECRET to be set on the target environment.
 */
export async function loginAs(page: Page, email: string, baseURL?: string) {
  const base = baseURL || DEFAULT_BASE_URL;

  // Fetch CSRF token
  const context = page.context();
  const csrfRes = await context.request.get(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  // POST to the e2e-credentials callback
  const loginRes = await context.request.post(
    `${base}/api/auth/callback/e2e-credentials`,
    {
      form: {
        email,
        secret: E2E_SECRET,
        csrfToken,
      },
    }
  );

  // NextAuth returns a redirect — the session cookie is now set on the context
  if (loginRes.status() >= 400) {
    throw new Error(
      `E2E login failed (${loginRes.status()}). ` +
      `Is E2E_CREDENTIALS_SECRET set on the server?`
    );
  }

  // Sync cookies from API context to the browser page
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(
    (c) => c.name === "next-auth.session-token" || c.name === "__Secure-next-auth.session-token"
  );
  if (!sessionCookie) {
    throw new Error("No session cookie after E2E login — check E2E_CREDENTIALS_SECRET");
  }

  // Navigate to trigger the authenticated layout
  await page.goto("/documents");
  // May redirect to /onboarding for new users
  await page.waitForLoadState("networkidle");
}

/**
 * Default test login — uses a standard test email.
 */
export async function testLogin(page: Page) {
  await loginAs(page, "e2e-test@clausemaster.test");
}

/**
 * Create a second browser context logged in as a different user.
 * Useful for multi-user scenarios.
 */
export async function createSecondUser(
  browser: Browser,
  baseURL: string,
  email: string
) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await loginAs(page, email);
  return { context, page };
}
