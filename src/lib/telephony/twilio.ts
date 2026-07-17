export interface TwilioOutboundCallResponse {
  sid: string;
  status: string;
}

/**
 * Places a real outbound call via Twilio's REST API, connecting the callee
 * directly to an already-created Ultravox session via inline TwiML. Unlike
 * inbound (where Twilio hits our webhook to ask what to do), outbound calls
 * we initiate can be told what to do inline since we already know the
 * Ultravox joinUrl before Twilio ever dials.
 */
export async function placeOutboundCall(params: {
  to: string;
  from: string;
  ultravoxJoinUrl: string;
  statusCallbackUrl: string;
}): Promise<TwilioOutboundCallResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not configured');
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${params.ultravoxJoinUrl}" /></Connect></Response>`;

  const body = new URLSearchParams({
    To: params.to,
    From: params.from,
    Twiml: twiml,
    StatusCallback: params.statusCallbackUrl,
  });
  // Twilio expects repeated StatusCallbackEvent params, one per event.
  for (const event of ['initiated', 'ringing', 'answered', 'completed']) {
    body.append('StatusCallbackEvent', event);
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Twilio outbound call failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { sid: string; status: string };
  return { sid: data.sid, status: data.status };
}
