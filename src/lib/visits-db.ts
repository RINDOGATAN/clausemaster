import prisma from "@/lib/prisma";
import type { VisitStore } from "@/lib/visit-record";

/** True when the statement failed because the table does not exist yet (schema not pushed). */
export function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; meta?: { code?: string } } | null;
  return e?.code === "42P01" || e?.code === "P2021" || (e?.code === "P2010" && e?.meta?.code === "42P01");
}

/**
 * One statement per counted view: adds one to the day's total for the path
 * and labels, creating it at 1. No read. Two first views racing on the same
 * key are settled by the primary key (the second one adds to the first).
 * Before the table exists, nothing is written and the view is dropped quietly.
 */
export const dbVisitStore: VisitStore = async (row) => {
  try {
    await prisma.$executeRaw`
      INSERT INTO "clausemaster"."page_views_daily" ("day", "path", "utm_source", "utm_medium", "utm_campaign", "views")
      VALUES (${row.day}::date, ${row.path}, ${row.utmSource}, ${row.utmMedium}, ${row.utmCampaign}, 1)
      ON CONFLICT ("day", "path", "utm_source", "utm_medium", "utm_campaign")
      DO UPDATE SET "views" = "page_views_daily"."views" + 1`;
  } catch (err) {
    if (isMissingTable(err)) return;
    throw err;
  }
};
