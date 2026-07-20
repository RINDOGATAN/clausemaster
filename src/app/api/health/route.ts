import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DB-touching health check (OPEN-ISSUES #9a prevention): "pages render" must
// never again mask "database unreachable" — point post-deploy smoke here.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
