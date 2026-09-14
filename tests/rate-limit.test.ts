import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TRACKED_KEYS,
  RATE_LIMITS,
  createRateLimiter,
  getClientIp,
  rateLimitResponse,
} from "../src/lib/rate-limit";

function clock(start = 1_000_000) {
  let now = start;
  return {
    now: () => now,
    advance(ms: number) {
      now += ms;
    },
  };
}

test("allows up to the limit inside one window and blocks the next hit", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 }, c.now);

  assert.equal(limiter.check("ip-1").allowed, true);
  assert.equal(limiter.check("ip-1").allowed, true);
  const third = limiter.check("ip-1");
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);

  const fourth = limiter.check("ip-1");
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.remaining, 0);
  assert.equal(fourth.limit, 3);
  assert.ok(fourth.retryAfterSeconds >= 1 && fourth.retryAfterSeconds <= 60);
});

test("keys are independent", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 }, clock().now);
  assert.equal(limiter.check("a").allowed, true);
  assert.equal(limiter.check("a").allowed, false);
  assert.equal(limiter.check("b").allowed, true);
});

test("the window resets after windowMs", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 }, c.now);
  assert.equal(limiter.check("a").allowed, true);
  assert.equal(limiter.check("a").allowed, false);
  c.advance(999);
  assert.equal(limiter.check("a").allowed, false);
  c.advance(1);
  assert.equal(limiter.check("a").allowed, true);
});

test("retryAfterSeconds counts down to the window reset", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 10_000 }, c.now);
  limiter.check("a");
  c.advance(2_500);
  assert.equal(limiter.check("a").retryAfterSeconds, 8);
});

test("tracked keys stay bounded when a flood of distinct keys arrives", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 }, c.now);
  for (let i = 0; i < MAX_TRACKED_KEYS + 500; i += 1) {
    limiter.check(`ip-${i}`);
  }
  assert.ok(limiter.size() <= MAX_TRACKED_KEYS);
  // Expired windows are pruned first when the map is full.
  c.advance(60_001);
  limiter.check("fresh");
  assert.equal(limiter.size(), 1);
});

test("getClientIp prefers the first forwarded address", () => {
  const req = new Request("http://localhost/x", {
    headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1", "x-real-ip": "10.0.0.2" },
  });
  assert.equal(getClientIp(req), "203.0.113.5");
  const real = new Request("http://localhost/x", { headers: { "x-real-ip": "10.0.0.2" } });
  assert.equal(getClientIp(real), "10.0.0.2");
  assert.equal(getClientIp(new Request("http://localhost/x")), "unknown");
});

test("rateLimitResponse is a JSON 429 with Retry-After", async () => {
  const res = rateLimitResponse(
    { allowed: false, limit: 10, remaining: 0, retryAfterSeconds: 42 },
    { url: "http://localhost/sign-in?error=TooManyRequests" }
  );
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "42");
  assert.equal(res.headers.get("X-RateLimit-Limit"), "10");
  const body = await res.json();
  assert.equal(typeof body.error, "string");
  assert.equal(body.url, "http://localhost/sign-in?error=TooManyRequests");
});

test("shared rules are sane", () => {
  for (const rule of Object.values(RATE_LIMITS)) {
    assert.ok(rule.limit > 0);
    assert.ok(rule.windowMs >= 60_000);
  }
});
