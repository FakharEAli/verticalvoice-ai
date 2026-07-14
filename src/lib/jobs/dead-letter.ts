/**
 * Dead letter queue for events/jobs that failed after exhausting retries.
 *
 * Writes to the `dead_letter_events` table (see src/lib/database/types.ts,
 * `dead_letter_events` Row: id, tenant_id, source, event_type, payload,
 * error_message, retry_count, max_retries, status, created_at, resolved_at).
 * Consumers (webhook route handlers, background jobs) call `moveToDeadLetter`
 * when `withRetry` (./retry.ts) exhausts all attempts, so the event isn't
 * silently dropped and can be inspected/replayed later via `retryDeadLetter`.
 */

import { createClient } from '@/lib/database/supabase-server';
import { logger } from '@/lib/observability/logger';
import type { Json } from '@/lib/database/types';

export type DeadLetterStatus = 'pending' | 'resolved' | 'abandoned';

export interface DeadLetterEvent {
  id: string;
  tenant_id: string;
  source: string;
  event_type: string;
  payload: Json;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

/**
 * Persist a failed event to the dead letter queue.
 *
 * @param tenantId  Owning tenant. Required by the table schema — callers
 *                   that cannot resolve a tenant (e.g. a webhook for a call
 *                   that was never persisted) should log the failure via
 *                   `logger.error` instead of calling this function.
 * @param source    Where the event came from (e.g. `webhook:twilio`, `webhook:ultravox`).
 * @param eventType The provider event type / job type (e.g. `call.completed`).
 * @param payload   The original event payload, for replay.
 * @param error     The error that caused the final failure.
 */
export async function moveToDeadLetter(
  tenantId: string,
  source: string,
  eventType: string,
  payload: Record<string, unknown>,
  error: unknown,
  opts: { maxRetries?: number } = {},
): Promise<DeadLetterEvent | null> {
  const supabase = await createClient();
  const errorMessage = error instanceof Error ? error.message : String(error);

  const { data, error: insertError } = await supabase
    .from('dead_letter_events')
    .insert({
      tenant_id: tenantId,
      source,
      event_type: eventType,
      payload: payload as unknown as Json,
      error_message: errorMessage,
      retry_count: 0,
      max_retries: opts.maxRetries ?? 3,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    // Last resort: we couldn't even persist the failure. Log loudly so it
    // shows up in monitoring/alerting — this is the one case we cannot
    // recover from automatically.
    logger.error('dead_letter_insert_failed', {
      tenantId,
      source,
      eventType,
      error: insertError.message,
      originalError: errorMessage,
    });
    return null;
  }

  logger.warn('moved_to_dead_letter', { tenantId, source, eventType, id: data.id });
  return data;
}

/**
 * Mark a dead-letter event as resolved (e.g. after a successful manual or
 * automated replay). Does not re-run the original handler — callers should
 * call `retryDeadLetter` to fetch the payload and re-invoke the appropriate
 * handler themselves, then call this to close it out on success.
 */
export async function resolveDeadLetter(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('dead_letter_events')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('dead_letter_resolve_failed', { id, error: error.message });
    throw new Error(`Failed to resolve dead letter event: ${error.message}`);
  }

  logger.info('dead_letter_resolved', { id });
}

/**
 * Fetch a dead-letter event and increment its retry count, ready for the
 * caller to re-dispatch `payload` to the appropriate handler based on
 * `source`/`event_type`. Marks the event `abandoned` once `max_retries` is
 * exceeded so it stops showing up as retryable.
 *
 * Returns `null` if the event doesn't exist, isn't pending, or has been
 * abandoned.
 */
export async function retryDeadLetter(id: string): Promise<DeadLetterEvent | null> {
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('dead_letter_events')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    logger.warn('dead_letter_not_found', { id });
    return null;
  }

  if (existing.status !== 'pending') {
    logger.warn('dead_letter_not_pending', { id, status: existing.status });
    return null;
  }

  const nextRetryCount = existing.retry_count + 1;

  if (nextRetryCount > existing.max_retries) {
    await supabase
      .from('dead_letter_events')
      .update({ status: 'abandoned', retry_count: nextRetryCount })
      .eq('id', id);
    logger.error('dead_letter_abandoned', { id, retryCount: nextRetryCount, maxRetries: existing.max_retries });
    return null;
  }

  const { data: updated, error: updateError } = await supabase
    .from('dead_letter_events')
    .update({ retry_count: nextRetryCount })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    logger.error('dead_letter_retry_update_failed', { id, error: updateError?.message });
    return null;
  }

  logger.info('dead_letter_retry_dispatched', { id, retryCount: nextRetryCount });
  return updated;
}

/**
 * List pending dead-letter events for a tenant (for an ops dashboard or
 * manual triage). Ordered oldest-first so the longest-stuck events surface.
 */
export async function listPendingDeadLetters(tenantId: string, limit = 50): Promise<DeadLetterEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dead_letter_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error('dead_letter_list_failed', { tenantId, error: error.message });
    throw new Error(`Failed to list dead letter events: ${error.message}`);
  }

  return data ?? [];
}
