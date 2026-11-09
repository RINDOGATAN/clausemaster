/**
 * Page-view counts of the public pages, kept by this app itself.
 *
 * What is counted: one view of a public, signed-out page, added to a daily
 * total for (day, path, utm_source, utm_medium, utm_campaign). Nothing else is
 * kept:
 *  - no cookie is read or set, and nothing is stored in the browser for this;
 *  - no IP address, no user agent, no referrer, no screen size and no
 *    identifier of any kind is stored. The user agent is read once, at count
 *    time, to drop obvious robots, and then discarded; the address is used
 *    only by the in-memory rate limiter, as a hash, and never written;
 *  - only the exact paths in the allow-list below are counted, so no
 *    dashboard page and no path that carries an id or a token can be recorded
 *    (the count script repeats the list as a second guard);
 *  - the three labels are the utm_* parameters of the page address, checked by
 *    the label rule below; utm_term, utm_content and click ids are ignored;
 *  - nothing is sent to anyone else.
 *
 * Counted on the hosted production deployment only (visitCountingEnabled).
 *
 * No database import: the browser and the tests load this file directly.
 */

/** The labels a daily total is split by. */
export const VISIT_LABEL_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

export type VisitLabelKey = (typeof VISIT_LABEL_KEYS)[number];

export type VisitLabels = Partial<Record<VisitLabelKey, string>>;

/**
 * The public pages whose views are counted. Exact paths only. A public page
 * added to the app is counted once it is listed here (a test compares this
 * list with the pages under src/app/(public) and src/app/(auth)).
 */
export const PUBLIC_VISIT_PATHS: readonly string[] = [
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

const PUBLIC_SET = new Set(PUBLIC_VISIT_PATHS);

/** A path as counted: no query, no fragment, no trailing slash (except "/"). */
export function normalisePath(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0 || input.length > 200) return null;
  if (!input.startsWith("/") || input.startsWith("//")) return null;
  let p = input.split(/[?#]/, 1)[0] ?? "";
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

/** Whether a path is one this site counts. */
export function isCountedPath(path: string): boolean {
  return PUBLIC_SET.has(path);
}

/**
 * A simple robot rule, applied at count time and never stored: an empty user
 * agent, or one that names itself a robot, a crawler, a preview fetcher, a
 * monitor or a script library.
 */
const BOT_UA =
  /bot|crawl|spider|slurp|scrap|fetch|preview|headless|lighthouse|pagespeed|monitor|uptime|pingdom|check|scan|curl|wget|python|java\/|go-http|okhttp|axios|node|httpclient|libwww|perl|ruby|php|facebookexternalhit|embedly|whatsapp|vercel/i;

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length < 10) return true;
  return BOT_UA.test(userAgent);
}

export const MAX_LABEL_LENGTH = 100;

/**
 * Letters, digits, space and `. _ - + : / | ( )`. No `@`, `=`, `&`, `?`,
 * `<`, `>`, quotes or control characters, so a label can hold neither an
 * e-mail address nor markup.
 */
const SAFE_LABEL = /^[A-Za-z0-9 ._\-+:/|()]+$/;

/** One label, trimmed with inner spaces collapsed, or null when it is absent or unsafe. */
export function cleanLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/\s+/g, " ");
  if (!v || v.length > MAX_LABEL_LENGTH || !SAFE_LABEL.test(v)) return null;
  return v;
}

/** The three labels of an object, cleaned by the label rule; absent ones are left out. */
export function visitLabels(input: unknown): VisitLabels {
  const out: VisitLabels = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  const raw = input as Record<string, unknown>;
  for (const key of VISIT_LABEL_KEYS) {
    const v = cleanLabel(raw[key]);
    if (v) out[key] = v;
  }
  return out;
}

/** The three labels of a query string (`?utm_source=...`). */
export function labelsFromSearch(search: string): VisitLabels {
  const params = new URLSearchParams(search);
  const raw: Record<string, string | null> = {};
  for (const key of VISIT_LABEL_KEYS) raw[key] = params.get(key);
  return visitLabels(raw);
}

/** The day of a view, as YYYY-MM-DD in UTC. */
export function dayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

type VisitEnv = { VERCEL_ENV?: string; VISIT_COUNTS?: string; [key: string]: string | undefined };

/**
 * Counting runs on the hosted production deployment only (`VISIT_COUNTS=off`
 * turns it off there). Previews and `vercel dev` may share the production
 * database, so they never count. `VISIT_COUNTS=on` turns it on for a local
 * run against a local database (never on a Vercel deployment other than
 * production).
 */
export function visitCountingEnabled(env: VisitEnv = process.env): boolean {
  if (env.VERCEL_ENV === "production") return env.VISIT_COUNTS !== "off";
  if (env.VERCEL_ENV) return false;
  return env.VISIT_COUNTS === "on";
}
