export interface RateLimiterOptions {
  /** Attempts allowed per key inside one window. */
  limit: number;
  /** The window's length, in milliseconds. It slides: each attempt ages out on its own. */
  windowMs: number;
  /** Keys remembered at once. Past this the least recently seen is forgotten, so memory stays bounded. */
  maxKeys?: number;
}

export interface RateLimiter {
  /** Records an attempt for `key` if it is within the limit, and says whether it was. */
  attempt: (key: string, now?: number) => boolean;
}

/**
 * A sliding-window limiter held in memory.
 *
 * **Best effort, and only per process.** Memory is not shared between serverless instances, and an
 * instance can be recycled at any moment, so this limits what one warm instance accepts — a naive
 * flood from one client — and nothing more. A limit that must hold across instances needs a shared
 * store (Upstash Redis, for one), which is infrastructure rather than code.
 *
 * A refused attempt is not recorded, so a client that keeps trying is let back in as its earlier
 * attempts age out rather than being locked out for as long as it persists.
 */
const createRateLimiter = ({ limit, windowMs, maxKeys = 5000 }: RateLimiterOptions): RateLimiter => {
  const attempts = new Map<string, number[]>();

  return {
    attempt: (key, now = Date.now()) => {
      const recent = (attempts.get(key) ?? []).filter((time) => now - time < windowMs);
      const allowed = recent.length < limit;
      if (allowed) {
        recent.push(now);
      }

      // Re-inserted so the map's iteration order is least recently seen first — the key to drop.
      attempts.delete(key);
      attempts.set(key, recent);
      if (attempts.size > maxKeys) {
        const [oldest] = attempts.keys();
        attempts.delete(oldest);
      }

      return allowed;
    }
  };
};

export default createRateLimiter;
