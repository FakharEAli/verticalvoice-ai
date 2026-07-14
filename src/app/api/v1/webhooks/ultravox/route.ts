import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@/lib/database/supabase-server';

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
  const { data: existing } = await supabase
    .from('audit_events' as any)
    .select('id')
    .eq('resource_id', call_id)
    .eq('action', event)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  // Process events
  switch (event) {
    case 'call.started': {
      await supabase.from('calls' as any).upsert(
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
      await supabase
        .from('calls' as any)
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
      await supabase
        .from('calls' as any)
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
        const { data: call } = await supabase
          .from('calls' as any)
          .select('id')
          .eq('provider_call_id', call_id)
          .single();

        if (call) {
          await supabase.from('transcripts' as any).insert({
            call_id: (call as any).id,
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
  await supabase.from('audit_events' as any).insert({
    resource_id: call_id,
    action: event,
    metadata: data ?? {},
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
