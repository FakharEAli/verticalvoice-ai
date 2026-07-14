import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@/lib/database/supabase-server';
import { fromUntypedTable } from '@/lib/database/untyped-table';
import { withRetry } from '@/lib/jobs/retry';
import { moveToDeadLetter } from '@/lib/jobs/dead-letter';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  // Validate signature
  const signature = request.headers.get('x-ultravox-signature');
  const secret = process.env.ULTRAVOX_WEBHOOK_SECRET;

  const rawBody = await request.text();

  if (secret) {
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[ultravox-webhook] ULTRAVOX_WEBHOOK_SECRET not set — skipping signature validation');
  }

  let body: { event: string; call_id: string; data: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, call_id, data } = body;

  if (!event || !call_id) {
    return NextResponse.json({ error: 'Missing event or call_id' }, { status: 400 });
  }

  // Idempotency check
  const { data: existing } = await fromUntypedTable(supabase, 'audit_events')
    .select('id')
    .eq('resource_id', call_id)
    .eq('action', event)
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
        switch (event) {
          case 'call.started': {
            await fromUntypedTable(supabase, 'calls').upsert(
              {
                provider_call_id: call_id,
                status: 'in_progress',
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'provider_call_id' }
            );
            break;
          }

          case 'call.ended': {
            const duration = typeof data?.duration === 'number' ? data.duration : null;
            await fromUntypedTable(supabase, 'calls')
              .update({
                status: 'completed',
                duration_seconds: duration,
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('provider_call_id', call_id);
            break;
          }

          case 'call.failed': {
            await fromUntypedTable(supabase, 'calls')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString(),
              })
              .eq('provider_call_id', call_id);
            break;
          }

          case 'transcript.ready': {
            const transcript = data?.transcript as string | undefined;
            if (transcript) {
              // Look up the call to get its id
              const { data: call } = await fromUntypedTable(supabase, 'calls')
                .select('id')
                .eq('provider_call_id', call_id)
                .single();

              if (call) {
                const callId = (call as { id: string }).id;
                await fromUntypedTable(supabase, 'transcripts').insert({
                  call_id: callId,
                  content: transcript,
                  created_at: new Date().toISOString(),
                });
              }
            }
            break;
          }

          default:
            console.warn(`[ultravox-webhook] Unhandled event: ${event}`);
        }

        // Log to audit_events
        const { error: auditError } = await fromUntypedTable(supabase, 'audit_events').insert({
          resource_id: call_id,
          action: event,
          metadata: data ?? {},
          created_at: new Date().toISOString(),
        });
        if (auditError) throw new Error(auditError.message);
      },
      { maxAttempts: 3, backoffMs: 250, label: 'ultravox-webhook-process' }
    );
  } catch (err) {
    const { data: callRow } = await fromUntypedTable(supabase, 'calls')
      .select('tenant_id')
      .eq('provider_call_id', call_id)
      .maybeSingle();
    const tenantId = (callRow as { tenant_id?: string } | null)?.tenant_id;

    if (tenantId) {
      await moveToDeadLetter(tenantId, 'webhook:ultravox', event, { call_id, data }, err);
      return NextResponse.json({ status: 'queued_for_retry' }, { status: 202 });
    }

    console.error('[ultravox-webhook] processing failed and no tenant_id resolvable for dead-letter', err);
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
