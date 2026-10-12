import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthAttempt } from "@/lib/auth-rate-limit";
import { authRateLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { rejectBlockedMagicLink } from "@/lib/email-policy-server";

const handler = NextAuth(authOptions);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

/**
 * Sign-in attempts (magic-link sends, credentials callbacks, OAuth starts) are
 * rate limited per client IP. The 429 body carries a `url` so the NextAuth
 * browser client lands on the sign-in page with an error instead of throwing.
 */
async function guardedPost(request: Request, context: RouteContext) {
  const url = new URL(request.url);
  if (isAuthAttempt(request.method, url.pathname)) {
    const result = authRateLimiter.check(getClientIp(request));
    if (!result.allowed) {
      return rateLimitResponse(result, {
        url: `${url.origin}/sign-in?error=TooManyRequests`,
      });
    }
  }
  // Refuse blocked addresses before any sign-in e-mail is sent (400).
  const refused = await rejectBlockedMagicLink(request);
  if (refused) return refused;
  return handler(request, context);
}

export { handler as GET, guardedPost as POST };
