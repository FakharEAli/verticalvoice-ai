/**
 * In-memory fixed-window rate limiter.
 *
 * No external dependency (no Redis) — appropriate for this project's current
 * scale (single Node.js process per deployment). Each unique `key` gets its
 * own fixed window counter. When the app is horizontally scaled across
 * multiple instances, this limiter is per-instance only (each instance
 * enforces its own limit independently) — see docs/runbooks/incident-response.md
 * for the note on moving to a shared store (e.g. Redis) if/when that becomes
 * necessary.
 */

import { logger } from '@/lib/observability/logger';

interface WindowEntry {
  count: number;
  windowStart: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

const buckets = new Map<string, WindowEntry>();

// Periodic sweep so the map doesn't grow unbounded with one-off keys
// (e.g. per-IP keys from scanners). Runs lazily, only when checkRateLimit
// is called, and never blocks the request path with a timer.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweepExpired(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of buckets) {
    // A window is definitely stale if it hasn't been touched in a while.
    // We don't know each key's configured window length here, so use a
    // conservative bound based on the sweep interval itself.
    if (now - entry.windowStart > SWEEP_INTERVAL_MS) {
      buckets.delete(key);
    }
  }
}

/**
 * Check (and consume) one request against a fixed-window rate limit.
 *
 * @param key       Unique identifier for the caller (e.g. `ip:1.2.3.4` or
 *                   `tenant:<id>:tool-call`).
 * @param limit     Maximum number of requests allowed per window.
 * @param windowMs  Window length in milliseconds.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    // Start a new window
    buckets.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
      limit,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  const remaining = Math.max(0, limit - existing.count);
  const resetAt = existing.windowStart + windowMs;

  if (!allowed) {
    logger.warn('rate_limit_exceeded', { key, limit, windowMs, count: existing.count });
  }

  return { allowed, remaining, resetAt, limit };
}

/** Reset all rate limit state. Intended for tests only. */
export function __resetRateLimitStateForTests(): void {
  buckets.clear();
  lastSweep = Date.now();
}
