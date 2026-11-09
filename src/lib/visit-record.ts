/**
 * Adds one view of a public page to its daily total (src/lib/visits.ts), and
 * the answer of POST /api/visit. No database import: the store is passed in
 * (src/lib/visits-db.ts in production), so the tests need no database.
 */

import { createHash } from "node:crypto";
import { createRateLimiter, getClientIp } from "./rate-limit";
import { dayOf, isBotUserAgent, isCountedPath, normalisePath, visitLabels } from "./visits";

/** One row of the daily totals; absent labels are "" (they are part of the key). */
export type VisitRow = {
  day: string;
  path: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

/** Adds one to the row's count, creating the row at 1. */
export type VisitStore = (row: VisitRow) => Promise<void>;

/** The longest body read: a path and three labels of 100 characters fit well inside. */
export const MAX_VISIT_BODY = 1_000;

/** Per client and instance, in memory only (no database write for the limiter). */
export const VISIT_LIMIT = { limit: 120, windowMs: 60 * 60_000 };

export const visitRateLimiter = createRateLimiter(VISIT_LIMIT);

/** The limiter key: a hash of the client address, never the address itself. */
export function visitLimitKey(request: Request): string {
  return createHash("sha256").update(`visit:${getClientIp(request)}`).digest("hex");
}

export type VisitStatus = 204 | 400 | 404 | 413;

export interface VisitOutcome {
  status: VisitStatus;
  /** Whether a view was added. A robot or a page that is not counted gets 204 and nothing is added. */
  counted: boolean;
}

export async function recordVisit(
  store: VisitStore,
  rawBody: string,
  userAgent: string | null,
  enabled: boolean,
  now: Date = new Date(),
): Promise<VisitOutcome> {
  if (!enabled) return { status: 404, counted: false };
  if (rawBody.length > MAX_VISIT_BODY) return { status: 413, counted: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, counted: false };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: 400, counted: false };
  const path = normalisePath((parsed as Record<string, unknown>).path);
  if (!path) return { status: 400, counted: false };
  // A page outside the allow-list and a robot are answered like a count, so
  // the answer tells a caller nothing; nothing is written for either.
  if (!isCountedPath(path)) return { status: 204, counted: false };
  if (isBotUserAgent(userAgent)) return { status: 204, counted: false };

  const labels = visitLabels(parsed);
  await store({
    day: dayOf(now),
    path,
    utmSource: labels.utm_source ?? "",
    utmMedium: labels.utm_medium ?? "",
    utmCampaign: labels.utm_campaign ?? "",
  });
  return { status: 204, counted: true };
}

const NOTHING = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/**
 * The answer of POST /api/visit.
 *
 *   204 handled: counted, or nothing written (counting off on previews and
 *       local runs; a robot; an uncounted page; over the rate limit; the
 *       table not created yet; a database error). The browser sends the view
 *       without waiting, and a 204 leaves nothing in its console.
 *   400 no valid path (our own pages never send one)
 *   413 body too long
 *
 * Reads no cookie and sets none.
 */
export async function handleVisit(
  request: Request,
  deps: { enabled: boolean; store: VisitStore; now?: Date },
): Promise<Response> {
  // Off (previews, local runs): answered before the limiter or the store is touched.
  if (!deps.enabled) return NOTHING();
  // Over the limit: nothing written, and the same quiet answer (a page view is never worth an error).
  if (!visitRateLimiter.check(visitLimitKey(request)).allowed) return NOTHING();
  try {
    const raw = await request.text();
    const out = await recordVisit(deps.store, raw, request.headers.get("user-agent"), true, deps.now);
    return out.status === 204 ? NOTHING() : new Response(null, { status: out.status });
  } catch (error) {
    console.error(`[visit] page view not recorded: ${error instanceof Error ? error.name : "Error"}`);
    return NOTHING();
  }
}
