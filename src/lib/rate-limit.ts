/**
 * In-memory sliding-window rate limiter for serverless.
 * NOTE: This resets on cold starts — adequate for launch burst protection.
 * Upgrade to Upstash (@upstash/ratelimit) for cross-instance limiting.
 */

const windowMs = 60_000; // 1 minute window

const hits = new Map<string, number[]>();

// Clean old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - windowMs;
  for (const [key, timestamps] of hits) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) hits.delete(key);
    else hits.set(key, filtered);
  }
}, 300_000);

/**
 * Check if a request should be rate-limited.
 * @param key   Unique identifier (e.g. IP address)
 * @param limit Max requests per window (default 30)
 * @returns { success: true } if allowed, { success: false } if blocked
 */
export function rateLimit(key: string, limit = 30): { success: boolean } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (hits.get(key) || []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    return { success: false };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { success: true };
}

/** Extract client IP from request headers */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
