import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/database/supabase-admin';
import { validateTwilioSignature } from '@/lib/webhooks/signature';
import { createUltravoxCall } from '@/lib/telephony/ultravox';
import { buildSelectedTools } from '@/lib/telephony/ultravox-tools';
import { withCurrentDateContext } from '@/lib/telephony/prompt-context';
import { logger } from '@/lib/observability/logger';
import '@/industries';
import { getIndustryPack } from '@/industries/core/registry';
import type { IndustryId } from '@/industries/core/industry-pack';

function twiml(xmlBody: string, status = 200) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`,
    { status, headers: { 'Content-Type': 'text/xml' } }
  );
}

function sayAndHangup(message: string) {
  return twiml(`<Response><Say>${message}</Say><Hangup/></Response>`);
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
  // Set by the Test Center's Live Test Call feature (Twilio Voice SDK
  // device.connect({params: {..., IsTestCall: 'true'}})) — Twilio forwards
  // Client custom params straight through to this webhook. Absent for any
  // real inbound PSTN call, so this only ever fires for genuine test calls.
  const isTestCall = params.IsTestCall === 'true';

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

    const [{ data: tenantRow }, { data: bizProfile }] = await Promise.all([
      supabase.from('tenants').select('industry').eq('id', tenantId).single(),
      supabase.from('business_profiles').select('timezone').eq('tenant_id', tenantId).maybeSingle(),
    ]);
    const industry = tenantRow?.industry as IndustryId | undefined;

    // Give the agent the current date/time so "today"/"tonight" resolve to
    // real (future) dates instead of a hallucinated past date.
    const datedSystemPrompt = withCurrentDateContext(systemPrompt, bizProfile?.timezone);

    // Record the call row first so we have an internal call.id to scope
    // this call's tools to before creating the Ultravox call.
    const { data: callRow } = await supabase
      .from('calls')
      .upsert(
        {
          tenant_id: tenantId,
          provider_call_id: callSid,
          status: 'ringing',
          direction: 'inbound',
          caller_number: fromNumber ?? null,
          called_number: toNumber,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_test: isTestCall,
        },
        { onConflict: 'provider_call_id' }
      )
      .select('id')
      .single();

    const pack = industry ? getIndustryPack(industry) : undefined;
    const selectedTools =
      pack && callRow
        ? buildSelectedTools(pack, { callId: callRow.id, tenantId, industry: pack.id, isTest: isTestCall })
        : undefined;

    // Create the Ultravox call bridged to this Twilio call
    const ultravoxCall = await createUltravoxCall(datedSystemPrompt, voiceId, selectedTools);

    if (!ultravoxCall.joinUrl) {
      logger.error('twilio-voice-webhook: Ultravox call created without joinUrl', {
        ultravoxCallId: ultravoxCall.callId,
      });
      return sayAndHangup('We could not connect you to our assistant right now. Please try again later.');
    }

    // Remember which Ultravox call this is so the post-call reconciler can
    // poll it later for the transcript, recording, duration, and summary.
    if (callRow) {
      await supabase
        .from('calls')
        .update({ ultravox_call_id: ultravoxCall.callId })
        .eq('id', callRow.id);
    }

    logger.info('twilio-voice-webhook: bridging call to Ultravox', {
      tenantId,
      callSid,
      ultravoxCallId: ultravoxCall.callId,
      toolsAttached: selectedTools?.length ?? 0,
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
