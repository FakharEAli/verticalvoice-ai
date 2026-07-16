import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/database/supabase-admin';
import { validateTwilioSignature } from '@/lib/webhooks/signature';
import { logger } from '@/lib/observability/logger';

function twiml(xmlBody: string, status = 200) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`,
    { status, headers: { 'Content-Type': 'text/xml' } }
  );
}

function sayAndHangup(message: string) {
  return twiml(`<Response><Say>${message}</Say><Hangup/></Response>`);
}

interface UltravoxCallResponse {
  callId: string;
  joinUrl: string | null;
}

async function createUltravoxCall(systemPrompt: string, voiceId: string | null): Promise<UltravoxCallResponse> {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  const baseUrl = process.env.ULTRAVOX_BASE_URL ?? 'https://api.ultravox.ai/api';
  if (!apiKey) throw new Error('ULTRAVOX_API_KEY is not configured');

  const res = await fetch(`${baseUrl}/calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      systemPrompt,
      ...(voiceId ? { voice: voiceId } : {}),
      medium: { twilio: {} },
      recordingEnabled: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ultravox call creation failed: ${res.status} ${text}`);
  }

  return (await res.json()) as UltravoxCallResponse;
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioSignature = request.headers.get('x-twilio-signature');

  if (authToken) {
    // Behind Traefik/reverse-proxy, request.url reflects the internal
    // container URL (e.g. https://localhost:3000/...), not the public URL
    // Twilio actually signed against — reconstruct from the known app URL.
    const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${request.nextUrl.pathname}`;
    if (!twilioSignature || !validateTwilioSignature(requestUrl, params, twilioSignature, authToken)) {
      logger.warn('twilio-voice-webhook: invalid or missing signature');
      return new NextResponse('Forbidden', { status: 403 });
    }
  } else {
    logger.warn('twilio-voice-webhook: TWILIO_AUTH_TOKEN not set — skipping signature validation (dev mode)');
  }

  const toNumber = params.To;
  const fromNumber = params.From;
  const callSid = params.CallSid;

  if (!toNumber || !callSid) {
    return sayAndHangup('We are unable to process this call right now.');
  }

  try {
    // Resolve tenant by the dialed number
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('tenant_id')
      .eq('number', toNumber)
      .eq('status', 'active')
      .maybeSingle();

    if (!phoneNumber) {
      logger.warn('twilio-voice-webhook: no tenant found for dialed number', { toNumber });
      return sayAndHangup('This number is not currently configured. Goodbye.');
    }

    const tenantId = phoneNumber.tenant_id;

    // Resolve the active compiled agent config for this tenant
    const { data: activeConfig } = await supabase
      .from('active_agent_configs')
      .select('agent_config_version_id')
      .eq('tenant_id', tenantId)
      .order('activated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeConfig) {
      logger.warn('twilio-voice-webhook: no active agent config for tenant', { tenantId });
      return sayAndHangup('This business has not finished setting up their AI agent yet. Goodbye.');
    }

    const { data: version } = await supabase
      .from('agent_config_versions')
      .select('snapshot')
      .eq('id', activeConfig.agent_config_version_id)
      .single();

    const snapshot = version?.snapshot as {
      system_prompt?: string;
      voice?: { voice_id?: string } | null;
    } | null;

    const systemPrompt = snapshot?.system_prompt;
    if (!systemPrompt) {
      logger.error('twilio-voice-webhook: active config has no system_prompt', { tenantId });
      return sayAndHangup('This agent is not fully configured. Goodbye.');
    }

    const voiceId = snapshot?.voice?.voice_id ?? null;

    // Create the Ultravox call bridged to this Twilio call
    const ultravoxCall = await createUltravoxCall(systemPrompt, voiceId);

    if (!ultravoxCall.joinUrl) {
      logger.error('twilio-voice-webhook: Ultravox call created without joinUrl', {
        ultravoxCallId: ultravoxCall.callId,
      });
      return sayAndHangup('We could not connect you to our assistant right now. Please try again later.');
    }

    // Record the call row so it shows up in the dashboard immediately
    await supabase.from('calls').upsert(
      {
        tenant_id: tenantId,
        provider_call_id: callSid,
        status: 'ringing',
        direction: 'inbound',
        caller_number: fromNumber ?? null,
        called_number: toNumber,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_call_id' }
    );

    logger.info('twilio-voice-webhook: bridging call to Ultravox', {
      tenantId,
      callSid,
      ultravoxCallId: ultravoxCall.callId,
    });

    return twiml(
      `<Response><Connect><Stream url="${ultravoxCall.joinUrl}" /></Connect></Response>`
    );
  } catch (error) {
    logger.error('twilio-voice-webhook: unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return sayAndHangup('We are experiencing a technical issue. Please try again shortly.');
  }
}
