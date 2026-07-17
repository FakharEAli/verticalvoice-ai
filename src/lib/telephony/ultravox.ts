export interface UltravoxCallResponse {
  callId: string;
  joinUrl: string | null;
}

/**
 * The onboarding wizard's voice picker (step-5-personality.tsx) uses short
 * marketing names ("sophia", "james", ...) as its option ids — these are
 * NOT real Ultravox voice catalog ids (which are UUIDs), so passing one
 * straight through to Ultravox 400s with "Voice X does not exist". Map our
 * internal names to real voices (picked from `GET /api/voices` for a
 * matching character/description) before calling Ultravox.
 */
const ONBOARDING_VOICE_TO_ULTRAVOX_ID: Record<string, string> = {
  sophia: '4c8d6eb4-c021-4d56-aec9-656bf6ca6046', // Kai — warm southern woman
  james: '5f8e97b1-cd48-431a-b6a1-3b94306d8914', // Grant — reliable, clear male, professional
  luna: 'aa601962-1cbd-4bbd-9d96-3c7a93c3414a', // Jacqueline — confident, upbeat young adult female
  marcus: 'ef6757de-79b1-497b-ad54-c6bef635e2b7', // David — steady, neutral American male
  aria: '33175488-b0f9-4f11-a0c6-3f4edd47353e', // Gabrielle — polished American female
  noah: '199c9635-edbe-4f9c-a626-ca31fb151d15', // Troy — natural, approachable American male
};

function resolveUltravoxVoiceId(voiceId: string | null): string | null {
  if (!voiceId) return null;
  return ONBOARDING_VOICE_TO_ULTRAVOX_ID[voiceId] ?? voiceId;
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

  const resolvedVoiceId = resolveUltravoxVoiceId(voiceId);

  const res = await fetch(`${baseUrl}/calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      systemPrompt,
      ...(resolvedVoiceId ? { voice: resolvedVoiceId } : {}),
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
