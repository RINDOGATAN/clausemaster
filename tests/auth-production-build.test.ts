import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Loads the real NextAuth options the way a production build would (NODE_ENV
 * set to production) with the e2e secret deliberately present, and checks that
 * neither credentials provider is registered. Nothing here opens a database
 * connection: the Prisma client connects lazily on first query.
 *
 * Needs `node -C import` (set in the npm test script): the Prisma adapter is
 * ESM-only and the auth module is loaded as CommonJS by tsx.
 */
test("production build registers no credentials provider", async () => {
  // NODE_ENV is typed read-only by Next's type augmentation; assign through a plain record.
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "production";
  env.E2E_CREDENTIALS_SECRET = "must-not-enable-anything";
  process.env.DATABASE_URL ??= "postgresql://unused:unused@localhost:5432/unused";

  const { authOptions } = await import("../src/lib/auth");
  const ids = authOptions.providers.map((p) => p.id);

  assert.ok(!ids.includes("dev-credentials"), `dev-credentials present: ${ids.join(", ")}`);
  assert.ok(!ids.includes("e2e-credentials"), `e2e-credentials present: ${ids.join(", ")}`);
  assert.ok(ids.includes("email"), `magic link provider missing: ${ids.join(", ")}`);
  assert.equal(authOptions.providers.some((p) => p.type === "credentials"), false);
});
