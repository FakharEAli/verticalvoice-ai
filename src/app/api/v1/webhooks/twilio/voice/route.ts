import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/database/supabase-admin';
import { validateTwilioSignature } from '@/lib/webhooks/signature';
import { createUltravoxCall } from '@/lib/telephony/ultravox';
import { buildSelectedTools, loadTenantToolSettings } from '@/lib/telephony/ultravox-tools';
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

/**
 * Move a call row out of the non-terminal 'ringing' state when the bridge to
 * Ultravox never completes. Without this, a call that fails before it gets an
 * ultravox_call_id (e.g. Ultravox returns 402 "set up your subscription") is
 * stranded at 'ringing' forever: the post-call reconciler only sweeps rows
 * that already have an ultravox_call_id, so nothing else can finalize it. The
 * reason is stashed in outbound_context (null for a normal inbound call) so the
 * Test Center can tell the operator *why* instead of showing an endless spinner.
 */
async function markCallFailed(
  supabase: ReturnType<typeof createAdminClient>,
  callSid: string,
  reason: string
) {
  try {
    await supabase
      .from('calls')
      .update({
        status: 'failed',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        outbound_context: { failed_reason: reason },
      })
      .eq('provider_call_id', callSid)
      .in('status', ['ringing', 'initiated', 'initiating', 'in_progress']);
  } catch (e) {
    logger.error('twilio-voice-webhook: could not mark call failed', {
      callSid,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Ultravox answers 402 when the account's included minutes are used up. This is
 * an account/billing state, not a code fault, so it deserves its own clear
 * message rather than the generic "technical issue".
 */
function isUltravoxSubscriptionError(message: string): boolean {
  return message.includes('402') || /subscription/i.test(message);
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
      model?: string;
      temperature?: number;
      voice?: { voice_id?: string; speed?: number; language?: string } | null;
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
    // The tenant's own tool choices (disabled tools, reworded descriptions,
    // custom tools) are layered over the pack catalog here, so an inbound
    // caller reaches exactly the tools the dashboard says are on.
    const toolSettings =
      pack && callRow ? await loadTenantToolSettings(supabase, tenantId) : undefined;
    const selectedTools =
      pack && callRow
        ? buildSelectedTools(
            pack,
            { callId: callRow.id, tenantId, industry: pack.id, isTest: isTestCall },
            toolSettings
          )
        : undefined;

    // Create the Ultravox call bridged to this Twilio call
    // Engine settings the tenant chose. These are stored and shown on the agent
    // dashboard, so they have to actually reach the call — until now they were
    // dropped here and the displayed values meant nothing.
    const ultravoxCall = await createUltravoxCall(datedSystemPrompt, voiceId, selectedTools, {
      temperature: snapshot?.temperature,
      model: snapshot?.model,
      speed: snapshot?.voice?.speed,
      language: snapshot?.voice?.language,
    });

    if (!ultravoxCall.joinUrl) {
      logger.error('twilio-voice-webhook: Ultravox call created without joinUrl', {
        ultravoxCallId: ultravoxCall.callId,
      });
      await markCallFailed(supabase, callSid, 'Assistant did not return a join URL.');
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
    const message = error instanceof Error ? error.message : String(error);
    logger.error('twilio-voice-webhook: unhandled error', { error: message });

    // The call row (if we got far enough to insert it) is still 'ringing' —
    // finalize it as failed so it doesn't spin forever in the Test Center, and
    // record why so the operator can see it was a subscription/billing issue.
    const subscription = isUltravoxSubscriptionError(message);
    await markCallFailed(
      supabase,
      callSid,
      subscription
        ? 'AI calling service needs its subscription set up (Ultravox returned 402).'
        : `Could not connect the assistant: ${message}`
    );

    return sayAndHangup(
      subscription
        ? 'The A I calling service is not active yet. The account subscription needs to be set up before test calls can connect. Goodbye.'
        : 'We are experiencing a technical issue. Please try again shortly.'
    );
  }
}
