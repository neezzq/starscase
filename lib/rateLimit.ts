type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

type Opts = { limit: number; windowMs: number };

/**
 * Simple in-memory rate limiter (works per Vercel instance).
 * Supports both call styles:
 *   rateLimit(key, {limit, windowMs})
 *   rateLimit(key, limit, windowMs)
 */
export function rateLimit(
  key: string,
  optsOrLimit: Opts | number,
  windowMs?: number
): { ok: true } | { ok: false; retryAfterMs: number } {
  const opts: Opts =
    typeof optsOrLimit === "number"
      ? { limit: optsOrLimit, windowMs: windowMs ?? 60_000 }
      : optsOrLimit;

  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }

  if (b.count >= opts.limit) {
    return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  }

  b.count += 1;
  buckets.set(key, b);
  return { ok: true };
}
