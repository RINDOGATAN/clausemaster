#!/usr/bin/env node
/**
 * Weekly page-view totals of the public pages (src/lib/visits.ts), as one
 * JSON object.
 *
 * Usage:
 *   COUNT_DATABASE_URL=<postgres url> node scripts/count-visits.mjs [--weeks=N] [--out=DIR]
 *
 * The connection string is taken from COUNT_DATABASE_URL, or DATABASE_URL, in
 * the process environment only. A .env file is never read. Pointed at a
 * production database, run it only with authorisation.
 *
 * Prints ONE JSON object and nothing else:
 *   product, unit, weeks[], first_day_in_range, as_of, source (and note, when
 *   the table does not exist yet).
 * --weeks: how many weeks back, the current one included (default 8, at most 104).
 * With --out=DIR it also writes DIR/clausemaster-visits.json (DIR is created if needed).
 *
 * Read-only by construction: the only statement sent is the one constant
 * SELECT in collectVisitCounts(), through Prisma `$queryRaw`, on the daily
 * totals (page_views_daily, which hold a day, a public path, up to three
 * campaign labels and a count, and nothing about a person). Its one
 * parameter is a date computed here.
 *
 * Definitions:
 *   views       page views of the public pages in the allow-list, counted by
 *               the browser on each page shown, robots dropped by their user
 *               agent at count time. Views, not visitors: nothing links two
 *               views of the same person.
 *   week        Monday to Sunday by UTC day; `partial` marks the current week.
 *   by_day      the views of each of the seven days of the week.
 *   campaign    utm_source / utm_medium / utm_campaign of the page address;
 *               views without any label are "direct or unlabelled".
 *   counting    on the hosted production deployment only, from the day the
 *               counter shipped (first_day_in_range is the first day with a row).
 * Before the table exists (schema not pushed) every figure is null and `note`
 * says why. On failure it prints {"error": "<error class>"} to stderr and exits 1.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const PRODUCT = "CLAUSEMASTER";
export const OUT_FILE = "clausemaster-visits.json";
const DAY_MS = 24 * 60 * 60 * 1000;

export const LABEL_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

export const SOURCE =
  "Clausemaster PostgreSQL database (schema clausemaster), read-only, one SELECT on page_views_daily, the daily " +
  "page-view totals the app keeps itself (no cookie, no address, no user agent stored; robots dropped at count " +
  "time). Public pages in the allow-list only (/, /sign-in, /verify-request and the /docs pages), counted on the " +
  "production deployment only. " +
  "Views, not visitors. Weeks run Monday to Sunday by UTC day.";

export const NOTE_NO_TABLE =
  "The page_views_daily table does not exist yet (schema not pushed), so nothing has been counted.";

const SAFE_LABEL = /^[A-Za-z0-9 ._\-+:/|()]{1,100}$/;
/** The public pages (src/lib/visits.ts): a second guard, so no other path is ever printed. */
export const SAFE_PATHS = [
  "/",
  "/sign-in",
  "/verify-request",
  "/docs",
  "/docs/analysis",
  "/docs/client",
  "/docs/guide",
  "/docs/internal",
  "/docs/publisher",
  "/docs/reviews",
];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

class SafeError extends Error {}

const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** The Monday (UTC) of a day, as YYYY-MM-DD. */
export function mondayOf(day) {
  const t = Date.parse(`${day}T00:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  return new Date(t - dow * DAY_MS).toISOString().slice(0, 10);
}

/** ISO week label (2026-W45) of a Monday. */
export function isoWeek(monday) {
  const d = new Date(`${monday}T00:00:00Z`);
  const thursday = new Date(d.getTime() + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS;
  const n = Math.round((d.getTime() - week1Monday) / (7 * DAY_MS)) + 1;
  return `${year}-W${String(n).padStart(2, "0")}`;
}

/** The Mondays of the range, oldest first, the current week last. */
export function mondaysOf(now, weeks) {
  const thisMonday = mondayOf(now.toISOString().slice(0, 10));
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) out.push(addDays(thisMonday, -7 * i));
  return out;
}

function labelsOf(row) {
  const out = {};
  for (const k of LABEL_KEYS) {
    const v = row[k];
    if (typeof v === "string" && SAFE_LABEL.test(v)) out[k] = v;
  }
  return out;
}

const keyOf = (labels) => JSON.stringify(LABEL_KEYS.map((k) => labels[k] ?? null));

function viewsOf(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * The weekly totals, from the daily rows. With `rows` null (no table yet),
 * every figure is null.
 *
 * @param {{ day: unknown, path: unknown, utm_source?: unknown, utm_medium?: unknown, utm_campaign?: unknown, views: unknown }[] | null} rows
 */
export function summarise(rows, now, weeks) {
  const mondays = mondaysOf(now, weeks);
  const thisMonday = mondays[mondays.length - 1];
  const byWeek = new Map(
    mondays.map((m) => [
      m,
      { views: 0, byDay: new Map(Array.from({ length: 7 }, (_, i) => [addDays(m, i), 0])), byPath: new Map(), byCampaign: new Map() },
    ]),
  );
  let firstDay = null;
  for (const row of rows ?? []) {
    const day = typeof row.day === "string" && DAY.test(row.day) ? row.day : null;
    const p = typeof row.path === "string" && SAFE_PATHS.includes(row.path) ? row.path : null;
    const n = viewsOf(row.views);
    if (!day || !p || !n) continue;
    if (!firstDay || day < firstDay) firstDay = day;
    const w = byWeek.get(mondayOf(day));
    if (!w) continue;
    w.views += n;
    w.byDay.set(day, (w.byDay.get(day) ?? 0) + n);
    w.byPath.set(p, (w.byPath.get(p) ?? 0) + n);
    const labels = labelsOf(row);
    const k = keyOf(labels);
    const entry = w.byCampaign.get(k) ?? { labels, views: 0 };
    entry.views += n;
    w.byCampaign.set(k, entry);
  }
  const list = mondays.map((monday) => {
    const w = byWeek.get(monday);
    const base = { week: isoWeek(monday), from: monday, to: addDays(monday, 6), partial: monday === thisMonday };
    if (rows === null) {
      return {
        ...base,
        views: null,
        views_from_campaigns: null,
        views_direct_or_unlabelled: null,
        by_day: Object.fromEntries([...w.byDay.keys()].map((d) => [d, null])),
        by_path: null,
        by_campaign: null,
      };
    }
    const byPath = Object.fromEntries([...w.byPath.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
    const byCampaign = [...w.byCampaign.values()].sort(
      (a, b) => b.views - a.views || keyOf(a.labels).localeCompare(keyOf(b.labels)),
    );
    const labelled = byCampaign.filter((c) => Object.keys(c.labels).length).reduce((s, c) => s + c.views, 0);
    return {
      ...base,
      views: w.views,
      views_from_campaigns: labelled,
      views_direct_or_unlabelled: w.views - labelled,
      by_day: Object.fromEntries(w.byDay),
      by_path: byPath,
      by_campaign: byCampaign,
    };
  });
  return { weeks: list, first_day: firstDay };
}

/** True when the query failed because the table does not exist yet (Prisma P2010 carrying 42P01). */
export function isMissingTable(err) {
  if (!err || typeof err !== "object") return false;
  return err.code === "42P01" || err.code === "P2021" || (err.code === "P2010" && err.meta?.code === "42P01");
}

/** @param {any} client a Prisma client; only `$queryRaw` is ever called on it, once. */
export async function collectVisitCounts(client, now = new Date(), weeks = 8) {
  const fromDay = mondaysOf(now, weeks)[0];
  let rows = null;
  try {
    rows = await client.$queryRaw`SELECT to_char(v."day", 'YYYY-MM-DD') AS day, v."path" AS path, v."utm_source" AS utm_source, v."utm_medium" AS utm_medium, v."utm_campaign" AS utm_campaign, v."views" AS views FROM "clausemaster"."page_views_daily" v WHERE v."day" >= ${fromDay}::date`;
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }
  const { weeks: list, first_day } = summarise(rows, now, weeks);
  return {
    product: PRODUCT,
    unit: "page views",
    weeks: list,
    first_day_in_range: first_day,
    as_of: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: SOURCE,
    ...(rows === null ? { note: NOTE_NO_TABLE } : {}),
  };
}

export function parseWeeks(argv) {
  const arg = argv.find((a) => a.startsWith("--weeks="));
  if (!arg) return 8;
  const n = Number(arg.slice("--weeks=".length));
  if (!Number.isInteger(n) || n < 1 || n > 104) throw new SafeError("--weeks needs a whole number from 1 to 104");
  return n;
}

/** The class name of an error, and nothing else from it. */
export function errorClass(err) {
  const name =
    err && typeof err === "object" && err.constructor && typeof err.constructor.name === "string"
      ? err.constructor.name
      : "";
  return /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name) ? name : "UnknownError";
}

class MissingDatabaseUrl extends Error {}

async function createClient() {
  const url = process.env.COUNT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new MissingDatabaseUrl();
  const { PrismaClient } = (await import("@prisma/client")).default;
  return new PrismaClient({ datasources: { db: { url } }, log: [] });
}

/**
 * @param {string[]} argv
 * @param {{
 *   createClient?: () => Promise<any>,
 *   now?: () => Date,
 *   stdout?: (s: string) => void,
 *   stderr?: (s: string) => void,
 * }} [deps]
 * @returns {Promise<number>} exit code
 */
export async function main(argv, deps = {}) {
  const stdout = deps.stdout ?? ((s) => process.stdout.write(s));
  const stderr = deps.stderr ?? ((s) => process.stderr.write(s));
  const now = deps.now ?? (() => new Date());

  let client;
  try {
    const weeks = parseWeeks(argv);
    const outArg = argv.find((a) => a.startsWith("--out="));
    const outDir = outArg ? outArg.slice("--out=".length) : null;
    if (outArg && !outDir) throw new SafeError("--out needs a directory: --out=DIR");
    client = await (deps.createClient ?? createClient)();
    const json = JSON.stringify(await collectVisitCounts(client, now(), weeks), null, 2) + "\n";
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, OUT_FILE), json);
    }
    stdout(json);
    return 0;
  } catch (err) {
    const error = err instanceof SafeError ? err.message : errorClass(err);
    stderr(JSON.stringify({ error }) + "\n");
    return 1;
  } finally {
    try {
      await client?.$disconnect?.();
    } catch {
      // nothing to report: the counts are already printed or the error already classed
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
