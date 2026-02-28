import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set currency cookie based on Vercel geolocation (same logic as todo.law)
  const hasCurrency = request.cookies.has("currency");
  if (!hasCurrency) {
    const country = request.headers.get("x-vercel-ip-country") ?? "";
    const currency = country === "US" || country === "GB" ? "USD" : "EUR";
    response.cookies.set("currency", currency, {
      path: "/",
      maxAge: 2592000, // 30 days
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|favicon).*)"],
};
