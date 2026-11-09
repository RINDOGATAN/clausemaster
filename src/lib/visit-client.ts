/**
 * The browser side of the page-view counter (src/lib/visits.ts): which body to
 * send for a page, and how. Only the path and the three campaign labels of the
 * page address are sent, only to this app's own /api/visit, without waiting.
 * Nothing is stored in the browser, no cookie is set, and the server reads
 * none. No React import: the tests load this file directly.
 */

import { isCountedPath, labelsFromSearch, normalisePath } from "./visits";

export const VISIT_ENDPOINT = "/api/visit";

/** The body sent for a page, or null when the page is not counted. */
export function visitBody(pathname: string, search: string): string | null {
  const path = normalisePath(pathname);
  if (!path || !isCountedPath(path)) return null;
  return JSON.stringify({ path, ...labelsFromSearch(search) });
}

export function sendVisit(body: string): void {
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.(VISIT_ENDPOINT, blob)) return;
    void fetch(VISIT_ENDPOINT, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let a count break a page
  }
}
