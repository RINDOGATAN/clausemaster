/**
 * POST /api/visit: one view of a public page, added to its daily total
 * (src/lib/visits.ts, src/lib/visit-record.ts). Body: the path and the three
 * campaign labels of the page address. Reads no cookie and sets none; the
 * user agent is read to drop robots and is not stored; the client address is
 * used only by the in-memory rate limiter, as a hash, and is not stored.
 * Always a quiet 204 for our own pages.
 */

import { handleVisit } from "@/lib/visit-record";
import { visitCountingEnabled } from "@/lib/visits";
import { dbVisitStore } from "@/lib/visits-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleVisit(request, { enabled: visitCountingEnabled(), store: dbVisitStore });
}
