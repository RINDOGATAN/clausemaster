/**
 * Decides which NextAuth requests count as sign-in attempts for rate limiting.
 *
 * Counted (POST only):
 *   /api/auth/signin/<provider>    starts a magic-link send or an OAuth flow
 *   /api/auth/callback/<provider>  completes a credentials sign-in
 *
 * Not counted: session and CSRF reads, provider listing, sign-out, and the
 * OAuth callback the identity provider redirects to (a GET).
 */
const AUTH_ATTEMPT_PATH = /^\/api\/auth\/(signin|callback)\/[^/]+\/?$/;

export function isAuthAttempt(method: string, pathname: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  return AUTH_ATTEMPT_PATH.test(pathname);
}
