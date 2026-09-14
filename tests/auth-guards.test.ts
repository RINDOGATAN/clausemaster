import { test } from "node:test";
import assert from "node:assert/strict";
import { isDevCredentialsEnabled, isE2ECredentialsEnabled } from "../src/lib/auth-guards";

test("dev credentials only under next dev", () => {
  assert.equal(isDevCredentialsEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isDevCredentialsEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isDevCredentialsEnabled({ NODE_ENV: "test" }), false);
  assert.equal(isDevCredentialsEnabled({}), false);
});

test("e2e credentials need the secret and a non-production build", () => {
  assert.equal(isE2ECredentialsEnabled({ NODE_ENV: "development", E2E_CREDENTIALS_SECRET: "s" }), true);
  assert.equal(isE2ECredentialsEnabled({ NODE_ENV: "test", E2E_CREDENTIALS_SECRET: "s" }), true);
  assert.equal(isE2ECredentialsEnabled({ E2E_CREDENTIALS_SECRET: "s" }), true);
  assert.equal(isE2ECredentialsEnabled({ NODE_ENV: "development" }), false);
  assert.equal(isE2ECredentialsEnabled({ NODE_ENV: "development", E2E_CREDENTIALS_SECRET: "" }), false);
  assert.equal(isE2ECredentialsEnabled({ NODE_ENV: "production", E2E_CREDENTIALS_SECRET: "s" }), false);
});
