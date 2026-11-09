import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  PUBLIC_VISIT_PATHS,
  cleanLabel,
  isBotUserAgent,
  isCountedPath,
  labelsFromSearch,
  normalisePath,
  visitCountingEnabled,
} from "../src/lib/visits";
import { VISIT_LIMIT, handleVisit, recordVisit, visitRateLimiter, type VisitRow } from "../src/lib/visit-record";
import { visitBody } from "../src/lib/visit-client";
import { isMissingTable } from "../src/lib/visits-db";
import { SAFE_PATHS } from "../scripts/count-visits.mjs";

const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
const NOW = new Date("2026-11-08T12:00:00.000Z");

function memoryStore() {
  const rows: VisitRow[] = [];
  return { rows, store: async (row: VisitRow) => void rows.push(row) };
}

function post(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/visit", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": BROWSER, "x-forwarded-for": "203.0.113.7", ...headers },
    body,
  });
}

/** The URL paths of the pages under a route group of src/app. */
function pagesUnder(group: string): string[] {
  const root = path.join(__dirname, "..", "src", "app", group);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "page.tsx") {
        const rel = path.relative(root, dir).split(path.sep).filter(Boolean).join("/");
        out.push(rel ? `/${rel}` : "/");
      }
    }
  };
  walk(root);
  return out.sort();
}

test("counts the landing page, the sign-in pages and every public docs page, by exact path", () => {
  // The auth-error page is left out on purpose: it is an error screen, not a visit.
  const expected = ["/", ...pagesUnder("(public)"), ...pagesUnder("(auth)").filter((p) => p !== "/auth-error")].sort();
  assert.deepEqual([...PUBLIC_VISIT_PATHS].sort(), expected);
  for (const p of PUBLIC_VISIT_PATHS) assert.equal(isCountedPath(p), true, p);
});

test("never counts an app page or a path with an id", () => {
  for (const p of ["/documents", "/documents/abc123", "/documents/abc/report", "/reviews/x", "/admin", "/settings", "/api/visit", "/docs/nope", "/auth-error"]) {
    assert.equal(isCountedPath(p), false, p);
  }
});

test("the count script prints only the allow-listed paths", () => {
  assert.deepEqual([...SAFE_PATHS], [...PUBLIC_VISIT_PATHS]);
});

test("normalises a path: no query, no fragment, no trailing slash", () => {
  assert.equal(normalisePath("/docs/guide/?x=1"), "/docs/guide");
  assert.equal(normalisePath("/sign-in?callbackUrl=%2Fdocuments#top"), "/sign-in");
  assert.equal(normalisePath("/"), "/");
  assert.equal(normalisePath("//evil.example"), null);
  assert.equal(normalisePath("https://evil.example/"), null);
  assert.equal(normalisePath("/" + "a".repeat(300)), null);
  assert.equal(normalisePath(42), null);
});

test("keeps a safe label and drops an address, markup or an over-long one", () => {
  assert.equal(cleanLabel("  linkedin  ads "), "linkedin ads");
  assert.equal(cleanLabel("person@private.example"), null);
  assert.equal(cleanLabel("<script>"), null);
  assert.equal(cleanLabel("a".repeat(101)), null);
  assert.deepEqual(labelsFromSearch("?utm_source=linkedin&utm_medium=paid&utm_campaign=nov&utm_term=x&gclid=y"), {
    utm_source: "linkedin",
    utm_medium: "paid",
    utm_campaign: "nov",
  });
});

test("drops robots by user agent", () => {
  assert.equal(isBotUserAgent(BROWSER), false);
  for (const ua of [null, "", "curl/8.0", "Googlebot/2.1", "Mozilla/5.0 HeadlessChrome", "node-fetch/1.0"]) {
    assert.equal(isBotUserAgent(ua), true, String(ua));
  }
});

test("counts on the hosted production deployment only", () => {
  assert.equal(visitCountingEnabled({ VERCEL_ENV: "production" }), true);
  assert.equal(visitCountingEnabled({ VERCEL_ENV: "production", VISIT_COUNTS: "off" }), false);
  assert.equal(visitCountingEnabled({ VERCEL_ENV: "preview" }), false);
  assert.equal(visitCountingEnabled({ VERCEL_ENV: "preview", VISIT_COUNTS: "on" }), false);
  assert.equal(visitCountingEnabled({ VERCEL_ENV: "development", VISIT_COUNTS: "on" }), false);
  assert.equal(visitCountingEnabled({}), false);
  assert.equal(visitCountingEnabled({ VISIT_COUNTS: "on" }), true);
});

test("the browser sends the path and the address labels for a counted page, nothing for another", () => {
  assert.deepEqual(JSON.parse(visitBody("/", "?utm_source=linkedin&fbclid=abc")!), { path: "/", utm_source: "linkedin" });
  assert.deepEqual(JSON.parse(visitBody("/docs/guide/", "")!), { path: "/docs/guide" });
  assert.equal(visitBody("/documents/abc", "?utm_source=x"), null);
  assert.equal(visitBody("/settings", ""), null);
});

test("adds one view to the day's row with the labels, and nothing about the person", async () => {
  const { rows, store } = memoryStore();
  const out = await recordVisit(store, JSON.stringify({ path: "/docs", utm_source: "linkedin", ip: "1.2.3.4" }), BROWSER, true, NOW);
  assert.deepEqual(out, { status: 204, counted: true });
  assert.deepEqual(rows, [{ day: "2026-11-08", path: "/docs", utmSource: "linkedin", utmMedium: "", utmCampaign: "" }]);
});

test("writes nothing for an uncounted page, a robot, a bad body or when counting is off", async () => {
  const { rows, store } = memoryStore();
  assert.deepEqual(await recordVisit(store, JSON.stringify({ path: "/documents/abc" }), BROWSER, true), { status: 204, counted: false });
  assert.deepEqual(await recordVisit(store, JSON.stringify({ path: "/" }), "curl/8.0", true), { status: 204, counted: false });
  assert.equal((await recordVisit(store, "not json", BROWSER, true)).status, 400);
  assert.equal((await recordVisit(store, JSON.stringify({ path: "nope" }), BROWSER, true)).status, 400);
  assert.equal((await recordVisit(store, "x".repeat(1_001), BROWSER, true)).status, 413);
  assert.equal((await recordVisit(store, JSON.stringify({ path: "/" }), BROWSER, false)).status, 404);
  assert.deepEqual(rows, []);
});

test("POST /api/visit answers 204, sets no cookie, and counts", async () => {
  visitRateLimiter.reset();
  const { rows, store } = memoryStore();
  const res = await handleVisit(post(JSON.stringify({ path: "/" })), { enabled: true, store, now: NOW });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.equal(rows.length, 1);
});

test("POST /api/visit touches nothing when counting is off", async () => {
  let called = false;
  const res = await handleVisit(post(JSON.stringify({ path: "/" })), {
    enabled: false,
    store: async () => {
      called = true;
    },
  });
  assert.equal(res.status, 204);
  assert.equal(called, false);
});

test("POST /api/visit stops counting one caller over the hourly limit, quietly", async () => {
  visitRateLimiter.reset();
  const { rows, store } = memoryStore();
  for (let i = 0; i < VISIT_LIMIT.limit + 5; i += 1) {
    const res = await handleVisit(post(JSON.stringify({ path: "/" })), { enabled: true, store, now: NOW });
    assert.equal(res.status, 204);
  }
  assert.equal(rows.length, VISIT_LIMIT.limit);
  visitRateLimiter.reset();
});

test("POST /api/visit answers 204 when the store fails (a page view never breaks a page)", async () => {
  visitRateLimiter.reset();
  const original = console.error;
  console.error = () => {};
  try {
    const res = await handleVisit(post(JSON.stringify({ path: "/" })), {
      enabled: true,
      store: async () => {
        throw new Error("db down");
      },
    });
    assert.equal(res.status, 204);
  } finally {
    console.error = original;
  }
});

test("the route is off outside production and reaches no database", async () => {
  const saved = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  try {
    const { POST } = await import("../src/app/api/visit/route");
    const res = await POST(post(JSON.stringify({ path: "/" })));
    assert.equal(res.status, 204);
  } finally {
    if (saved === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = saved;
  }
});

test("a missing table is recognised in the shapes the driver reports it", () => {
  assert.equal(isMissingTable({ code: "P2010", meta: { code: "42P01" } }), true);
  assert.equal(isMissingTable({ code: "42P01" }), true);
  assert.equal(isMissingTable({ code: "P2010", meta: { code: "23505" } }), false);
  assert.equal(isMissingTable(new Error("x")), false);
});
