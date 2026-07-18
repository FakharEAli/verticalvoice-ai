import { NextRequest, NextResponse } from 'next/server';
import { createPublicKey, verify as verifyEd25519Signature } from 'crypto';
import { createAdminClient } from '@/lib/database/supabase-admin';
import { fromUntypedTable } from '@/lib/database/untyped-table';
import { withRetry } from '@/lib/jobs/retry';
import { moveToDeadLetter } from '@/lib/jobs/dead-letter';
import { logger } from '@/lib/observability/logger';

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

function validateTelnyxTimestamp(timestamp: string | null): boolean {
  if (!timestamp) return false;
  const eventTime = parseInt(timestamp, 10);
  if (isNaN(eventTime)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - eventTime) <= TIMESTAMP_TOLERANCE_SECONDS;
}

/**
 * Verify a Telnyx ed25519 webhook signature.
 *
 * Telnyx signs `${timestamp}|${rawBody}` with an ed25519 private key and
 * sends the base64-encoded signature via the `telnyx-signature-ed25519`
 * header. The matching public key (32 raw bytes, base64-encoded, as shown
 * in the Telnyx portal) is supplied via `TELNYX_WEBHOOK_SECRET`.
 *
 * Implemented with Node's built-in `crypto` — no new dependency. The raw
 * 32-byte public key is imported as a JWK (`kty: 'OKP', crv: 'Ed25519'`),
 * which Node has supported since v12, and verified with
 * `crypto.verify(null, message, keyObject, signature)`. This avoids adding
 * `tweetnacl` or the `telnyx` SDK for a single verification call.
 */
function verifyTelnyxSignature(
  rawBody: string,
  timestamp: string,
  signatureB64: string,
  publicKeyB64: string
): boolean {
  try {
    const publicKeyBytes = Buffer.from(publicKeyB64, 'base64');
    if (publicKeyBytes.length !== 32) {
      logger.error('telnyx-webhook: configured public key is not a 32-byte ed25519 key');
      return false;
    }

    const keyObject = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: publicKeyBytes.toString('base64url') },
      format: 'jwk',
    });

    const message = Buffer.from(`${timestamp}|${rawBody}`, 'utf8');
    const signature = Buffer.from(signatureB64, 'base64');

    // crypto.verify performs a constant-time comparison internally.
    return verifyEd25519Signature(null, message, keyObject, signature);
  } catch (error) {
    logger.warn('telnyx-webhook: signature verification threw', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Layer 3 — provider gate. This route is a standalone public Next.js API
  // route; it is NOT automatically disabled when another provider is
  // configured. Mirror the resolution logic in
  // src/providers/telephony/index.ts (defaults to 'twilio' when
  // TELEPHONY_PROVIDER is unset) so this route only accepts traffic when
  // Telnyx is actually the active provider. 404 (rather than 403) avoids
  // confirming the route's existence to callers when it's not in use.
  const resolvedProvider = process.env.TELEPHONY_PROVIDER ?? 'twilio';
  if (resolvedProvider !== 'telnyx') {
    logger.warn('telnyx-webhook: rejected, TELEPHONY_PROVIDER is not telnyx', {
      resolvedProvider,
    });
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Layer 1 — fail closed if signing is not configured. Never fall through
  // to "no validation": an unconfigured secret must reject traffic, not
  // silently accept it.
  const webhookPublicKey = process.env.TELNYX_WEBHOOK_SECRET;
  if (!webhookPublicKey) {
    logger.error('telnyx-webhook: TELNYX_WEBHOOK_SECRET not configured — rejecting webhook');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  const telnyxSignature = request.headers.get('telnyx-signature-ed25519');
  const telnyxTimestamp = request.headers.get('telnyx-timestamp');

  // Replay protection, in addition to (not instead of) signature verification.
  if (!telnyxTimestamp || !validateTelnyxTimestamp(telnyxTimestamp)) {
    return NextResponse.json({ error: 'Invalid or missing timestamp' }, { status: 401 });
  }
  if (!telnyxSignature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  // Layer 2 — read the RAW request body for signature verification. Do NOT
  // call request.json() first and re-stringify: JSON.stringify does not
  // guarantee the same byte sequence Telnyx signed (key order, whitespace,
  // number formatting can all differ), which would break verification.
  const rawBody = await request.text();

  if (!verifyTelnyxSignature(rawBody, telnyxTimestamp, telnyxSignature, webhookPublicKey)) {
    logger.warn('telnyx-webhook: signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const supabase = createAdminClient();

  let body: {
    data: {
      event_type: string;
      payload: {
        call_control_id: string;
        recording_url?: string;
        duration_secs?: number;
        direction?: string;
        from?: string;
        to?: string;
        [key: string]: unknown;
      };
    };
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = body?.data?.event_type;
  const payload = body?.data?.payload;
  const callControlId = payload?.call_control_id;

  if (!eventType || !callControlId) {
    return NextResponse.json({ error: 'Missing event_type or call_control_id' }, { status: 400 });
  }

  // Idempotency check
  const { data: existing } = await fromUntypedTable(supabase, 'audit_events')
    .select('id')
    .eq('resource_id', callControlId)
    .eq('action', eventType)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  // Process events. Wrapped in withRetry so transient DB blips don't cost us
  // the event; on final failure the event is durably queued for later
  // reprocessing via the dead letter queue instead of being dropped.
  try {
    await withRetry(
      async () => {
        switch (eventType) {
          case 'call.initiated': {
            await fromUntypedTable(supabase, 'calls').upsert(
              {
                provider_call_id: callControlId,
                status: 'initiated',
                direction: payload.direction === 'outgoing' ? 'outbound' : 'inbound',
                caller_number: payload.from || null,
                called_number: payload.to || null,
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'provider_call_id' }
            );
            break;
          }

          case 'call.answered': {
            await fromUntypedTable(supabase, 'calls')
              .update({
                status: 'in_progress',
                updated_at: new Date().toISOString(),
              })
              .eq('provider_call_id', callControlId);
            break;
          }

          case 'call.hangup': {
            const duration = typeof payload.duration_secs === 'number' ? payload.duration_secs : null;
            await fromUntypedTable(supabase, 'calls')
              .update({
                status: 'completed',
                duration_seconds: duration,
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('provider_call_id', callControlId);
            break;
          }

          case 'call.recording.saved': {
            if (payload.recording_url) {
              await fromUntypedTable(supabase, 'calls')
                .update({
                  recording_url: payload.recording_url,
                  updated_at: new Date().toISOString(),
                })
                .eq('provider_call_id', callControlId);
            }
            break;
          }

          default:
            console.warn(`[telnyx-webhook] Unhandled event_type: ${eventType}`);
        }

        // Log to audit_events
        const { error: auditError } = await fromUntypedTable(supabase, 'audit_events').insert({
          resource_id: callControlId,
          action: eventType,
          metadata: payload ?? {},
          created_at: new Date().toISOString(),
        });
        if (auditError) throw new Error(auditError.message);
      },
      { maxAttempts: 3, backoffMs: 250, label: 'telnyx-webhook-process' }
    );
  } catch (err) {
    const { data: callRow } = await fromUntypedTable(supabase, 'calls')
      .select('tenant_id')
      .eq('provider_call_id', callControlId)
      .maybeSingle();
    const tenantId = (callRow as { tenant_id?: string } | null)?.tenant_id;

    if (tenantId) {
      await moveToDeadLetter(tenantId, 'webhook:telnyx', eventType, payload, err);
      return NextResponse.json({ status: 'queued_for_retry' }, { status: 202 });
    }

    console.error('[telnyx-webhook] processing failed and no tenant_id resolvable for dead-letter', err);
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
