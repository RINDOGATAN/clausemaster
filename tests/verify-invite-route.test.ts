import { test } from "node:test";
import assert from "node:assert/strict";
import { RATE_LIMITS, inviteRateLimiter } from "../src/lib/rate-limit";

function post(code: string, ip: string) {
  return new Request("http://localhost/api/verify-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ code }),
  });
}

test("invite checks are rate limited per client IP", async () => {
  process.env.INVITE_CODE = "correct-horse";
  inviteRateLimiter.reset();
  const { POST } = await import("../src/app/api/verify-invite/route");

  for (let i = 0; i < RATE_LIMITS.invite.limit; i += 1) {
    const res = await POST(post("wrong-guess", "198.51.100.7"));
    assert.equal(res.status, 200, `attempt ${i + 1} should pass the limiter`);
    assert.deepEqual(await res.json(), { valid: false });
  }

  // Even the correct code is refused once the window is exhausted.
  const blocked = await POST(post("correct-horse", "198.51.100.7"));
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("Retry-After")) >= 1);

  // Another client is unaffected.
  const other = await POST(post("correct-horse", "198.51.100.8"));
  assert.equal(other.status, 200);
  assert.deepEqual(await other.json(), { valid: true });

  inviteRateLimiter.reset();
});
