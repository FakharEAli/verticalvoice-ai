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

const PROVIDER_NAME = 'ultravox';

function getConfig() {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  const baseUrl = process.env.ULTRAVOX_BASE_URL ?? 'https://api.ultravox.ai/api';
  if (!apiKey) throw new Error('ULTRAVOX_API_KEY is not configured');
  return { apiKey, baseUrl };
}

const ultravoxAgentResponseSchema = z.object({
  agentId: z.string(),
});

const ultravoxCallResponseSchema = z.object({
  callId: z.string(),
  status: z.string(),
  created: z.string().optional(),
});

const ultravoxCallDetailSchema = z.object({
  callId: z.string(),
  status: z.string(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  phoneNumber: z.string().optional(),
  endUser: z.string().optional(),
  duration: z.number().optional(),
  created: z.string().optional(),
  ended: z.string().optional(),
  recordingUrl: z.string().optional(),
  transcript: z
    .array(
      z.object({
        role: z.enum(['agent', 'caller']),
        content: z.string(),
        timestamp: z.string(),
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

  logger.debug('ultravox request', { method, url });

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('ultravox request failed', { status: res.status, url, body: text });
    throw new Error(`Ultravox API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

function mapStatus(raw: string): NormalizedCall['status'] {
  const map: Record<string, NormalizedCall['status']> = {
    ringing: 'ringing',
    'in-progress': 'in_progress',
    in_progress: 'in_progress',
    active: 'in_progress',
    completed: 'completed',
    ended: 'completed',
    failed: 'failed',
    error: 'failed',
  };
  return map[raw.toLowerCase()] ?? 'in_progress';
}

export const ultravoxAdapter: VoiceRuntimeProvider = {
  name: PROVIDER_NAME,

  async createAgent(config) {
    logger.info('ultravox: creating agent', { greeting: config.greeting });

    const raw = await request<Record<string, unknown>>('/agents', {
      method: 'POST',
      body: {
        systemPrompt: config.systemPrompt,
        voice: config.voice,
        tools: config.tools,
        greeting: config.greeting,
        maxDuration: config.maxDurationSeconds,
        silenceTimeout: config.silenceTimeoutSeconds,
      },
    });

    const parsed = ultravoxAgentResponseSchema.parse(raw);

    const ref: ProviderAgentRef = {
      providerId: parsed.agentId,
      providerName: PROVIDER_NAME,
      externalId: parsed.agentId,
    };

    logger.info('ultravox: agent created', { agentId: parsed.agentId });
    return ref;
  },

  async updateAgent(ref, config) {
    logger.info('ultravox: updating agent', { agentId: ref.externalId });

    await request(`/agents/${ref.externalId}`, {
      method: 'PATCH',
      body: {
        systemPrompt: config.systemPrompt,
        voice: config.voice,
        tools: config.tools,
        greeting: config.greeting,
        maxDuration: config.maxDurationSeconds,
        silenceTimeout: config.silenceTimeoutSeconds,
      },
    });

    logger.info('ultravox: agent updated', { agentId: ref.externalId });
  },

  async startOutboundCall(input: OutboundCallInput): Promise<CallRef> {
    logger.info('ultravox: starting outbound call', {
      to: input.toNumber,
      from: input.fromNumber,
    });

    const raw = await request<Record<string, unknown>>('/calls', {
      method: 'POST',
      body: {
        agentId: input.agentRef.externalId,
        phoneNumber: input.toNumber,
        fromNumber: input.fromNumber,
        metadata: input.metadata,
      },
    });

    const parsed = ultravoxCallResponseSchema.parse(raw);

    logger.info('ultravox: outbound call started', { callId: parsed.callId });
    return {
      callId: parsed.callId,
      providerCallId: parsed.callId,
      providerName: PROVIDER_NAME,
    };
  },

  async getCall(callId: string): Promise<NormalizedCall> {
    logger.debug('ultravox: getting call', { callId });

    const raw = await request<Record<string, unknown>>(`/calls/${callId}`);
    const parsed = ultravoxCallDetailSchema.parse(raw);

    return {
      callId: parsed.callId,
      providerCallId: parsed.callId,
      direction: parsed.direction ?? 'outbound',
      status: mapStatus(parsed.status),
      callerNumber: parsed.phoneNumber,
      calledNumber: parsed.endUser,
      durationSeconds: parsed.duration,
      startedAt: parsed.created ?? new Date().toISOString(),
      endedAt: parsed.ended,
      recordingUrl: parsed.recordingUrl,
      transcript: parsed.transcript,
    };
  },

  async getRecording(callId: string): Promise<RecordingRef | null> {
    logger.debug('ultravox: getting recording', { callId });

    const raw = await request<Record<string, unknown>>(`/calls/${callId}/recording`).catch(
      () => null
    );
    if (!raw) return null;

    const url = typeof raw.url === 'string' ? raw.url : null;
    if (!url) return null;

    return {
      url,
      durationSeconds: typeof raw.duration === 'number' ? raw.duration : 0,
      format: typeof raw.format === 'string' ? raw.format : 'wav',
    };
  },

  async terminateCall(callId: string): Promise<void> {
    logger.info('ultravox: terminating call', { callId });
    await request(`/calls/${callId}`, { method: 'DELETE' });
    logger.info('ultravox: call terminated', { callId });
  },
};

export function createUltravoxProvider(): VoiceRuntimeProvider {
  return ultravoxAdapter;
}
