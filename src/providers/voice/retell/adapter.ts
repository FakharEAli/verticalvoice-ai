import { z } from 'zod';
import { logger } from '@/lib/observability/logger';
import type {
  VoiceRuntimeProvider,
  ProviderAgentRef,
  CallRef,
  NormalizedCall,
  OutboundCallInput,
  RecordingRef,
} from '../types';

const PROVIDER_NAME = 'retell';

function getConfig() {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY is not configured');
  return { apiKey, baseUrl: 'https://api.retellai.com' };
}

const retellAgentResponseSchema = z.object({
  agent_id: z.string(),
});

const retellCallResponseSchema = z.object({
  call_id: z.string(),
  call_status: z.string(),
});

const retellCallDetailSchema = z.object({
  call_id: z.string(),
  call_status: z.string(),
  call_type: z.enum(['inbound', 'outbound']).optional(),
  from_number: z.string().optional(),
  to_number: z.string().optional(),
  duration_ms: z.number().optional(),
  start_timestamp: z.number().optional(),
  end_timestamp: z.number().optional(),
  recording_url: z.string().optional(),
  transcript_object: z
    .array(
      z.object({
        role: z.enum(['agent', 'user']),
        content: z.string(),
        words: z.array(z.unknown()).optional(),
      })
    )
    .optional(),
});

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  const url = `${baseUrl}${path}`;
  const method = options.method ?? 'GET';

  logger.debug('retell request', { method, url });

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('retell request failed', { status: res.status, url, body: text });
    throw new Error(`Retell API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

function mapStatus(raw: string): NormalizedCall['status'] {
  const map: Record<string, NormalizedCall['status']> = {
    registered: 'ringing',
    ongoing: 'in_progress',
    ended: 'completed',
    error: 'failed',
  };
  return map[raw.toLowerCase()] ?? 'in_progress';
}

export const retellAdapter: VoiceRuntimeProvider = {
  name: PROVIDER_NAME,

  async createAgent(config) {
    logger.info('retell: creating agent', { greeting: config.greeting });

    const raw = await request<Record<string, unknown>>('/create-agent', {
      method: 'POST',
      body: {
        response_engine: {
          type: 'retell-llm',
        },
        agent_name: 'verticalvoice-agent',
        voice_id: config.voice.voiceId,
        voice_speed: config.voice.speed,
        begin_message: config.greeting,
        max_call_duration_ms: config.maxDurationSeconds * 1000,
        end_call_after_silence_ms: config.silenceTimeoutSeconds * 1000,
      },
    });

    const parsed = retellAgentResponseSchema.parse(raw);

    const ref: ProviderAgentRef = {
      providerId: parsed.agent_id,
      providerName: PROVIDER_NAME,
      externalId: parsed.agent_id,
    };

    logger.info('retell: agent created', { agentId: parsed.agent_id });
    return ref;
  },

  async updateAgent(ref, config) {
    logger.info('retell: updating agent', { agentId: ref.externalId });

    await request(`/update-agent/${ref.externalId}`, {
      method: 'PATCH',
      body: {
        voice_id: config.voice.voiceId,
        voice_speed: config.voice.speed,
        begin_message: config.greeting,
        max_call_duration_ms: config.maxDurationSeconds * 1000,
        end_call_after_silence_ms: config.silenceTimeoutSeconds * 1000,
      },
    });

    logger.info('retell: agent updated', { agentId: ref.externalId });
  },

  async startOutboundCall(input: OutboundCallInput): Promise<CallRef> {
    logger.info('retell: starting outbound call', {
      to: input.toNumber,
      from: input.fromNumber,
    });

    const raw = await request<Record<string, unknown>>('/create-phone-call', {
      method: 'POST',
      body: {
        agent_id: input.agentRef.externalId,
        to_number: input.toNumber,
        from_number: input.fromNumber,
        metadata: input.metadata,
      },
    });

    const parsed = retellCallResponseSchema.parse(raw);

    logger.info('retell: outbound call started', { callId: parsed.call_id });
    return {
      callId: parsed.call_id,
      providerCallId: parsed.call_id,
      providerName: PROVIDER_NAME,
    };
  },

  async getCall(callId: string): Promise<NormalizedCall> {
    logger.debug('retell: getting call', { callId });

    const raw = await request<Record<string, unknown>>(`/get-call/${callId}`);
    const parsed = retellCallDetailSchema.parse(raw);

    const startedAt = parsed.start_timestamp
      ? new Date(parsed.start_timestamp).toISOString()
      : new Date().toISOString();

    const endedAt = parsed.end_timestamp
      ? new Date(parsed.end_timestamp).toISOString()
      : undefined;

    const durationSeconds = parsed.duration_ms
      ? Math.round(parsed.duration_ms / 1000)
      : undefined;

    const transcript = parsed.transcript_object?.map((t) => ({
      role: (t.role === 'user' ? 'caller' : 'agent') as 'agent' | 'caller',
      content: t.content,
      timestamp: startedAt,
    }));

    return {
      callId: parsed.call_id,
      providerCallId: parsed.call_id,
      direction: parsed.call_type ?? 'outbound',
      status: mapStatus(parsed.call_status),
      callerNumber: parsed.from_number,
      calledNumber: parsed.to_number,
      durationSeconds,
      startedAt,
      endedAt,
      recordingUrl: parsed.recording_url,
      transcript,
    };
  },

  async getRecording(callId: string): Promise<RecordingRef | null> {
    logger.debug('retell: getting recording', { callId });

    try {
      const call = await request<Record<string, unknown>>(`/get-call/${callId}`);
      const url = typeof call.recording_url === 'string' ? call.recording_url : null;
      if (!url) return null;

      const durationMs = typeof call.duration_ms === 'number' ? call.duration_ms : 0;

      return {
        url,
        durationSeconds: Math.round(durationMs / 1000),
        format: 'wav',
      };
    } catch {
      return null;
    }
  },

  async terminateCall(callId: string): Promise<void> {
    logger.info('retell: terminating call', { callId });
    await request(`/end-call/${callId}`, { method: 'POST' });
    logger.info('retell: call terminated', { callId });
  },
};

export function createRetellProvider(): VoiceRuntimeProvider {
  return retellAdapter;
}
