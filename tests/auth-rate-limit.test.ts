import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthAttempt } from "../src/lib/auth-rate-limit";

test("counts magic-link sends, credentials callbacks and OAuth starts", () => {
  assert.equal(isAuthAttempt("POST", "/api/auth/signin/email"), true);
  assert.equal(isAuthAttempt("POST", "/api/auth/signin/google"), true);
  assert.equal(isAuthAttempt("POST", "/api/auth/callback/e2e-credentials"), true);
  assert.equal(isAuthAttempt("POST", "/api/auth/callback/dev-credentials"), true);
  assert.equal(isAuthAttempt("post", "/api/auth/callback/dev-credentials/"), true);
});

test("ignores reads, sign-out and the OAuth redirect callback", () => {
  assert.equal(isAuthAttempt("GET", "/api/auth/session"), false);
  assert.equal(isAuthAttempt("GET", "/api/auth/csrf"), false);
  assert.equal(isAuthAttempt("GET", "/api/auth/providers"), false);
  assert.equal(isAuthAttempt("POST", "/api/auth/signout"), false);
  assert.equal(isAuthAttempt("GET", "/api/auth/callback/google"), false);
  assert.equal(isAuthAttempt("GET", "/api/auth/signin/email"), false);
  assert.equal(isAuthAttempt("POST", "/api/auth/signin"), false);
});
