import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase-server';

// TODO: Full ed25519 signature verification requires the telnyx package or tweetnacl.
// For now we validate that the timestamp is within 5 minutes to prevent replay attacks.
function validateTelnyxTimestamp(timestamp: string | null): boolean {
  if (!timestamp) return false;
  const eventTime = parseInt(timestamp, 10);
  if (isNaN(eventTime)) return false;
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;
  return Math.abs(now - eventTime) <= fiveMinutes;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  // Validate signature / timestamp
  const telnyxSignature = request.headers.get('telnyx-signature-ed25519');
  const telnyxTimestamp = request.headers.get('telnyx-timestamp');
  const webhookSecret = process.env.TELNYX_WEBHOOK_SECRET;

  if (webhookSecret) {
    // TODO: Implement full ed25519 verification using telnyx package or tweetnacl.
    // For now, validate timestamp freshness to prevent replay attacks.
    if (!telnyxTimestamp || !validateTelnyxTimestamp(telnyxTimestamp)) {
      return NextResponse.json({ error: 'Invalid or missing timestamp' }, { status: 401 });
    }
    if (!telnyxSignature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
  } else {
    console.warn('[telnyx-webhook] TELNYX_WEBHOOK_SECRET not set — skipping signature validation');
  }

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
    body = await request.json();
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
  const { data: existing } = await supabase
    .from('audit_events' as any)
    .select('id')
    .eq('resource_id', callControlId)
    .eq('action', eventType)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  // Process events
  switch (eventType) {
    case 'call.initiated': {
      await supabase.from('calls' as any).upsert(
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
      await supabase
        .from('calls' as any)
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_call_id', callControlId);
      break;
    }

    case 'call.hangup': {
      const duration = typeof payload.duration_secs === 'number' ? payload.duration_secs : null;
      await supabase
        .from('calls' as any)
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
        await supabase
          .from('calls' as any)
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
  await supabase.from('audit_events' as any).insert({
    resource_id: callControlId,
    action: eventType,
    metadata: payload ?? {},
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
