/**
 * Fixed-window rate limiter kept in process memory.
 *
 * Scope: one warm serverless instance. The host may run several instances at
 * once and recycles each one on cold start, so every ceiling here is per
 * instance, not global. That is enough to stop one client from hammering the
 * sign-in, invite and upload routes through a warm instance; it is not a
 * shared quota. docs/capacity.md describes the shared-store replacement.
 */

export interface RateLimitRule {
  /** Maximum number of hits allowed inside one window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets (never below 1). */
  retryAfterSeconds: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** Upper bound on tracked keys, so a flood of distinct IPs cannot grow memory without limit. */
export const MAX_TRACKED_KEYS = 10_000;

export function createRateLimiter(rule: RateLimitRule, now: () => number = Date.now) {
  const windows = new Map<string, WindowEntry>();

  function prune(current: number) {
    for (const [key, entry] of windows) {
      if (entry.resetAt <= current) windows.delete(key);
    }
    if (windows.size < MAX_TRACKED_KEYS) return;
    // Still full after dropping expired windows: evict the oldest entries.
    const excess = windows.size - MAX_TRACKED_KEYS + 1;
    let dropped = 0;
    for (const key of windows.keys()) {
      if (dropped >= excess) break;
      windows.delete(key);
      dropped += 1;
    }
  }

  return {
    rule,
    check(key: string): RateLimitResult {
      const current = now();
      let entry = windows.get(key);
      if (!entry || entry.resetAt <= current) {
        if (windows.size >= MAX_TRACKED_KEYS) prune(current);
        entry = { count: 0, resetAt: current + rule.windowMs };
        windows.set(key, entry);
      }
      entry.count += 1;
      return {
        allowed: entry.count <= rule.limit,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - entry.count),
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - current) / 1000)),
      };
    },
    reset() {
      windows.clear();
    },
    size() {
      return windows.size;
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

/** Client address as forwarded by the host; "unknown" when no header is present. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/** JSON 429 response with the standard Retry-After and X-RateLimit headers. */
export function rateLimitResponse(
  result: RateLimitResult,
  extraBody: Record<string, unknown> = {}
): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Try again later.", ...extraBody }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/** One rule per protected surface. Keys are the client IP or the user id. */
export const RATE_LIMITS = {
  /** Sign-in attempts per IP: magic-link sends, credentials callbacks, OAuth starts. */
  auth: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Invite-code checks per IP. */
  invite: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Uploads per signed-in user. */
  upload: { limit: 20, windowMs: 10 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export const authRateLimiter = createRateLimiter(RATE_LIMITS.auth);
export const inviteRateLimiter = createRateLimiter(RATE_LIMITS.invite);
export const uploadRateLimiter = createRateLimiter(RATE_LIMITS.upload);
