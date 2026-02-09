import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Simple pass-through middleware for future auth protection
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match dashboard routes only
    "/documents/:path*",
  ],
};
