import "server-only";

/**
 * Minimal in-memory sliding-window rate limiter.
 * Single-instance deployments (this project ships as one standalone
 * server) get brute-force protection without external infrastructure.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

function prune(now: number, windowMs: number, bucket: Bucket) {
  // drop hits older than the window
  while (bucket.hits.length && now - bucket.hits[0] > windowMs) {
    bucket.hits.shift();
  }
}

/**
 * Consume one slot for `key`. Returns true when allowed.
 * @param key        unique identifier, e.g. `reqcode:ip:1.2.3.4`
 * @param limit      max hits inside the window
 * @param windowMs   window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) buckets.clear(); // hard reset guard
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  prune(now, windowMs, bucket);
  if (bucket.hits.length >= limit) return false;
  bucket.hits.push(now);
  return true;
}

/** Remaining hits inside the current window (for countdown UX). */
export function rateLimitRemaining(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) return limit;
  prune(now, windowMs, bucket);
  return Math.max(0, limit - bucket.hits.length);
}

/** Periodic sweep so idle buckets don't linger forever. */
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (!b.hits.length || now - b.hits[b.hits.length - 1] > 10 * 60_000) {
        buckets.delete(k);
      }
    }
  }, 5 * 60_000);
  // don't hold the event loop open (Next standalone server)
  (timer as unknown as { unref?: () => void }).unref?.();
}
