import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@/lib/database/supabase-server';

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
  const supabase = await createServerClient();

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
    const requestUrl = request.url;
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
  const { data: existing } = await supabase
    .from('audit_events' as any)
    .select('id')
    .eq('resource_id', callSid)
    .eq('action', eventKey)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  const mappedStatus = mapTwilioStatus(callStatus);

  // Process based on status
  switch (callStatus.toLowerCase()) {
    case 'initiated':
    case 'ringing': {
      await supabase.from('calls' as any).upsert(
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
      await supabase
        .from('calls' as any)
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_call_id', callSid);
      break;
    }

    case 'completed': {
      const duration = params.Duration ? parseInt(params.Duration, 10) : null;
      await supabase
        .from('calls' as any)
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
      await supabase
        .from('calls' as any)
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
  await supabase.from('audit_events' as any).insert({
    resource_id: callSid,
    action: eventKey,
    metadata: params,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
