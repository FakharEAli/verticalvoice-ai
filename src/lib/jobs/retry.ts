/**
 * Generic retry wrapper with exponential backoff.
 *
 * Used to wrap flaky operations (external API calls, transient DB writes)
 * so a single blip doesn't fail the whole request. Callers that exhaust all
 * attempts should fall back to `moveToDeadLetter` (see ./dead-letter.ts) for
 * operations that must not be silently dropped.
 */

import { logger } from '@/lib/observability/logger';

export interface RetryOptions {
  /** Maximum number of attempts, including the first (non-retry) attempt. Must be >= 1. */
  maxAttempts: number;
  /** Base backoff in milliseconds. Actual delay is `backoffMs * 2^(attempt - 1)`, capped at 30s. */
  backoffMs: number;
  /** Optional label used in log lines to identify what's being retried. */
  label?: string;
  /** Optional predicate to decide whether an error is retryable. Defaults to "always retry". */
  isRetryable?: (error: unknown) => boolean;
}

const MAX_BACKOFF_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn`, retrying with exponential backoff on failure.
 * Throws the last error if all attempts are exhausted.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const { maxAttempts, backoffMs, label = 'operation', isRetryable } = opts;

  if (maxAttempts < 1) {
    throw new Error('withRetry: maxAttempts must be >= 1');
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = isRetryable ? isRetryable(err) : true;
      const isLastAttempt = attempt === maxAttempts;

      logger.warn('retry_attempt_failed', {
        label,
        attempt,
        maxAttempts,
        retryable,
        error: err instanceof Error ? err.message : String(err),
      });

      if (!retryable || isLastAttempt) {
        break;
      }

      const delay = Math.min(backoffMs * 2 ** (attempt - 1), MAX_BACKOFF_MS);
      await sleep(delay);
    }
  }

  logger.error('retry_exhausted', {
    label,
    maxAttempts,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });

  throw lastError;
}
