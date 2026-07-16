import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/database/supabase-admin';
import { fromUntypedTable } from '@/lib/database/untyped-table';
import { withRetry } from '@/lib/jobs/retry';
import { moveToDeadLetter } from '@/lib/jobs/dead-letter';

function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  // Twilio signature = Base64(HMAC-SHA1(url + sorted param key-value pairs, authToken))
  const sortedKeys = Object.keys(params).sort();
  let dataString = url;
  for (const key of sortedKeys) {
    dataString += key + params[key];
  }
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(dataString)
    .digest('base64');
  return signature === expected;
}

function mapTwilioStatus(callStatus: string): string {
  switch (callStatus.toLowerCase()) {
    case 'initiated':
    case 'ringing':
      return callStatus.toLowerCase();
    case 'in-progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'busy':
      return 'busy';
    case 'no-answer':
      return 'no_answer';
    default:
      return callStatus.toLowerCase();
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  // Parse form data
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // Validate signature
  const twilioSignature = request.headers.get('x-twilio-signature');
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (authToken) {
    if (!twilioSignature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    // Behind Traefik/reverse-proxy, request.url reflects the internal
    // container URL (e.g. https://localhost:3000/...), not the public URL
    // Twilio actually signed against — reconstruct from the known app URL.
    const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${request.nextUrl.pathname}`;
    if (!validateTwilioSignature(authToken, requestUrl, params, twilioSignature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[twilio-webhook] TWILIO_AUTH_TOKEN not set — skipping signature validation (dev mode)');
  }

  const callSid = params.CallSid;
  const callStatus = params.CallStatus;

  if (!callSid || !callStatus) {
    return NextResponse.json({ error: 'Missing CallSid or CallStatus' }, { status: 400 });
  }

  // Idempotency check
  const eventKey = `${callStatus}`;
  const { data: existing } = await fromUntypedTable(supabase, 'audit_events')
    .select('id')
    .eq('resource_id', callSid)
    .eq('action', eventKey)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  const mappedStatus = mapTwilioStatus(callStatus);

  // Process based on status. Wrapped in withRetry: Supabase writes here are
  // usually reliable, but transient network/DB blips shouldn't cost us the
  // event — retry a couple of times with backoff before giving up.
  try {
    await withRetry(
      async () => {
        switch (callStatus.toLowerCase()) {
          case 'initiated':
          case 'ringing': {
            await fromUntypedTable(supabase, 'calls').upsert(
              {
                provider_call_id: callSid,
                status: mappedStatus,
                direction: params.Direction === 'outbound-api' ? 'outbound' : 'inbound',
                caller_number: params.From || null,
                called_number: params.To || null,
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'provider_call_id' }
            );
            break;
          }

          case 'in-progress': {
            await fromUntypedTable(supabase, 'calls')
              .update({
                status: 'in_progress',
                updated_at: new Date().toISOString(),
              })
              .eq('provider_call_id', callSid);
            break;
          }

          case 'completed': {
            const duration = params.Duration ? parseInt(params.Duration, 10) : null;
            await fromUntypedTable(supabase, 'calls')
              .update({
                status: 'completed',
                duration_seconds: duration,
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('provider_call_id', callSid);
            break;
          }

          case 'failed':
          case 'busy':
          case 'no-answer': {
            await fromUntypedTable(supabase, 'calls')
              .update({
                status: mappedStatus,
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('provider_call_id', callSid);
            break;
          }

          default:
            console.warn(`[twilio-webhook] Unhandled CallStatus: ${callStatus}`);
        }

        // Log to audit_events
        const { error: auditError } = await fromUntypedTable(supabase, 'audit_events').insert({
          resource_id: callSid,
          action: eventKey,
          metadata: params,
          created_at: new Date().toISOString(),
        });
        if (auditError) throw new Error(auditError.message);
      },
      { maxAttempts: 3, backoffMs: 250, label: 'twilio-webhook-process' }
    );
  } catch (err) {
    // Retries exhausted — durably queue for later reprocessing instead of
    // silently dropping the event. Best-effort tenant lookup since the
    // `calls` upsert above doesn't carry tenant_id from Twilio's payload.
    const { data: callRow } = await fromUntypedTable(supabase, 'calls')
      .select('tenant_id')
      .eq('provider_call_id', callSid)
      .maybeSingle();
    const tenantId = (callRow as { tenant_id?: string } | null)?.tenant_id;

    if (tenantId) {
      await moveToDeadLetter(tenantId, 'webhook:twilio', callStatus, params, err);
      return NextResponse.json({ status: 'queued_for_retry' }, { status: 202 });
    }

    console.error('[twilio-webhook] processing failed and no tenant_id resolvable for dead-letter', err);
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
