export interface UltravoxCallResponse {
  callId: string;
  joinUrl: string | null;
}

/**
 * Creates an Ultravox call bridged over Twilio's media stream. Used both by
 * the inbound voice webhook (Twilio already has the caller on the line, we
 * need a joinUrl to <Connect><Stream> to) and by outbound calling (we create
 * the Ultravox call first, then hand Twilio the joinUrl when placing the call).
 */
export async function createUltravoxCall(
  systemPrompt: string,
  voiceId: string | null
): Promise<UltravoxCallResponse> {
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
