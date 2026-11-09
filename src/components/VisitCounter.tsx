"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendVisit, visitBody } from "@/lib/visit-client";

/**
 * Counts a view of a public page (src/lib/visits.ts): on each page shown, when
 * the path is one that is counted, sends the path and the three campaign
 * labels of the address to this app's own /api/visit (src/lib/visit-client.ts).
 * Nothing else is sent, nothing is stored, no cookie is read or set, and no
 * other site is called. Mounted once, in the root layout. Renders nothing.
 */
export function VisitCounter() {
  const pathname = usePathname();
  useEffect(() => {
    const body = visitBody(pathname ?? window.location.pathname, window.location.search);
    if (body) sendVisit(body);
  }, [pathname]);
  return null;
}
