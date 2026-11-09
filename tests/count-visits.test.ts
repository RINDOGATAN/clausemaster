import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  NOTE_NO_TABLE,
  OUT_FILE,
  collectVisitCounts,
  isoWeek,
  main,
  mondayOf,
  parseWeeks,
  summarise,
} from "../scripts/count-visits.mjs";

// Sunday 8 November 2026, so the current week is Monday 2 to Sunday 8 November (2026-W45).
const NOW = new Date("2026-11-08T12:00:00.000Z");
const SECRET_URL = "postgres://role:s3cret-pass@db.internal.example/prod";

type Row = Record<string, unknown>;

/** A Prisma client on which every method but `$queryRaw` throws. */
function mockClient(rows: Row[] | Error) {
  const calls: { text: string; values: unknown[] }[] = [];
  let disconnected = false;
  const client = new Proxy(
    {
      $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push({ text: strings.join("$"), values });
        return rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows);
      },
      $disconnect: async () => {
        disconnected = true;
      },
    } as Record<string, unknown>,
    {
      get(target, prop) {
        if (typeof prop === "string" && prop in target) return target[prop];
        if (prop === "then") return undefined;
        throw new Error(`unexpected client access: ${String(prop)}`);
      },
    },
  );
  return { client, calls, isDisconnected: () => disconnected };
}

const ROWS: Row[] = [
  { day: "2026-11-02", path: "/", utm_source: "", utm_medium: "", utm_campaign: "", views: 5 },
  { day: "2026-11-02", path: "/", utm_source: "linkedin", utm_medium: "paid", utm_campaign: "nov", views: 3 },
  { day: "2026-11-04", path: "/docs/guide", utm_source: "", utm_medium: "", utm_campaign: "", views: 2 },
  { day: "2026-11-08", path: "/sign-in", utm_source: "linkedin", utm_medium: "paid", utm_campaign: "nov", views: 1 },
  { day: "2026-10-27", path: "/", utm_source: "", utm_medium: "", utm_campaign: "", views: 4 },
  // A path outside the allow-list and a bad count are dropped; a label with an address is
  // never printed (the view stays, unlabelled).
  { day: "2026-11-03", path: "/documents/abc123", utm_source: "", utm_medium: "", utm_campaign: "", views: 9 },
  { day: "2026-11-03", path: "/", utm_source: "person@private.example", utm_medium: "", utm_campaign: "", views: 1 },
  { day: "2026-11-03", path: "/", utm_source: "", utm_medium: "", utm_campaign: "", views: "many" },
];

test("uses Monday-to-Sunday weeks by UTC day and ISO week labels", () => {
  assert.equal(mondayOf("2026-11-08"), "2026-11-02");
  assert.equal(mondayOf("2026-11-02"), "2026-11-02");
  assert.equal(isoWeek("2026-11-02"), "2026-W45");
  assert.equal(isoWeek("2026-12-28"), "2026-W53");
  assert.equal(isoWeek("2027-01-04"), "2027-W01");
});

test("returns the weekly fields, oldest week first, the current one partial", async () => {
  const { client } = mockClient(ROWS);
  const result = await collectVisitCounts(client, NOW, 2);

  assert.deepEqual(Object.keys(result), ["product", "unit", "weeks", "first_day_in_range", "as_of", "source"]);
  assert.equal(result.product, "CLAUSEMASTER");
  assert.equal(result.unit, "page views");
  assert.equal(result.as_of, "2026-11-08T12:00:00Z");
  assert.equal(result.first_day_in_range, "2026-10-27");
  assert.deepEqual(
    result.weeks.map((w: { week: string }) => w.week),
    ["2026-W44", "2026-W45"],
  );
  const [last, current] = result.weeks;
  assert.equal(last.views, 4);
  assert.equal(last.partial, false);
  assert.deepEqual(current, {
    week: "2026-W45",
    from: "2026-11-02",
    to: "2026-11-08",
    partial: true,
    views: 12,
    views_from_campaigns: 4,
    views_direct_or_unlabelled: 8,
    by_day: {
      "2026-11-02": 8,
      "2026-11-03": 1,
      "2026-11-04": 2,
      "2026-11-05": 0,
      "2026-11-06": 0,
      "2026-11-07": 0,
      "2026-11-08": 1,
    },
    by_path: { "/": 9, "/docs/guide": 2, "/sign-in": 1 },
    by_campaign: [
      { labels: {}, views: 8 },
      { labels: { utm_source: "linkedin", utm_medium: "paid", utm_campaign: "nov" }, views: 4 },
    ],
  });
});

test("sends one constant SELECT, with the first day of the range as its only value", async () => {
  const { client, calls } = mockClient([]);
  await collectVisitCounts(client, NOW, 8);

  assert.equal(calls.length, 1);
  const { text, values } = calls[0];
  assert.match(text, /^SELECT .* FROM "clausemaster"\."page_views_daily" v WHERE v\."day" >= \$::date$/);
  assert.doesNotMatch(text, /\b(insert|update|delete|drop|alter|create|truncate|grant|copy|into)\b|;/i);
  assert.deepEqual(values, ["2026-09-14"]);
});

test("gives every figure as null with a note before the table exists, without failing", async () => {
  const missing = Object.assign(new Error("raw query failed"), { code: "P2010", meta: { code: "42P01" } });
  const { client } = mockClient(missing);
  const result = await collectVisitCounts(client, NOW, 1);

  assert.equal(result.note, NOTE_NO_TABLE);
  assert.equal(result.first_day_in_range, null);
  const [week] = result.weeks;
  assert.equal(week.views, null);
  assert.equal(week.by_path, null);
  assert.equal(week.by_campaign, null);
  assert.deepEqual(Object.values(week.by_day), [null, null, null, null, null, null, null]);
});

test("an empty table gives measured zeros, not nulls", () => {
  const { weeks } = summarise([], NOW, 1);
  assert.equal(weeks[0].views, 0);
  assert.deepEqual(weeks[0].by_path, {});
  assert.deepEqual(Object.values(weeks[0].by_day), [0, 0, 0, 0, 0, 0, 0]);
});

test("checks --weeks", () => {
  assert.equal(parseWeeks([]), 8);
  assert.equal(parseWeeks(["--weeks=12"]), 12);
  assert.throws(() => parseWeeks(["--weeks=0"]));
  assert.throws(() => parseWeeks(["--weeks=105"]));
  assert.throws(() => parseWeeks(["--weeks=x"]));
});

test("prints one object, writes DIR/clausemaster-visits.json with --out, and disconnects", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "cm-visits-"));
  try {
    const { client, isDisconnected } = mockClient(ROWS);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await main([`--out=${dir}`, "--weeks=2"], {
      createClient: async () => client,
      now: () => NOW,
      stdout: (s) => stdout.push(s),
      stderr: (s) => stderr.push(s),
    });

    assert.equal(code, 0);
    assert.equal(isDisconnected(), true);
    assert.deepEqual(stderr, []);
    assert.equal(OUT_FILE, "clausemaster-visits.json");
    assert.equal(await readFile(path.join(dir, OUT_FILE), "utf8"), stdout[0]);
    for (const s of ["person@private.example", "/documents", "abc123", SECRET_URL]) {
      assert.ok(!stdout[0].includes(s), s);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("prints the error class only when the query fails for another reason", async () => {
  class ConnectionRefused extends Error {}
  const { client } = mockClient(new ConnectionRefused(`connect failed for ${SECRET_URL}`));
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await main([], {
    createClient: async () => client,
    stdout: (s) => stdout.push(s),
    stderr: (s) => stderr.push(s),
  });

  assert.equal(code, 1);
  assert.deepEqual(stdout, []);
  assert.deepEqual(stderr, ['{"error":"ConnectionRefused"}\n']);
});

test("stops before connecting when no database URL is set", async () => {
  const saved = { a: process.env.COUNT_DATABASE_URL, b: process.env.DATABASE_URL };
  delete process.env.COUNT_DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await main([], { stdout: (s) => stdout.push(s), stderr: (s) => stderr.push(s) });
    assert.equal(code, 1);
    assert.deepEqual(stdout, []);
    assert.deepEqual(stderr, ['{"error":"MissingDatabaseUrl"}\n']);
  } finally {
    if (saved.a !== undefined) process.env.COUNT_DATABASE_URL = saved.a;
    if (saved.b !== undefined) process.env.DATABASE_URL = saved.b;
  }
});
