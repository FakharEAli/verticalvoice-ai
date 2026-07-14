import { logger } from '@/lib/observability/logger';
import type {
  VoiceRuntimeProvider,
  ProviderAgentRef,
  CallRef,
  NormalizedCall,
  OutboundCallInput,
  RecordingRef,
} from '../types';

const PROVIDER_NAME = 'mock-voice';

let callCounter = 0;
let agentCounter = 0;

const activeCalls = new Map<string, NormalizedCall>();

export const mockVoiceAdapter: VoiceRuntimeProvider = {
  name: PROVIDER_NAME,

  async createAgent(config) {
    agentCounter++;
    const agentId = `mock-agent-${agentCounter}`;
    logger.info('mock-voice: creating agent', { agentId, greeting: config.greeting });

    return {
      providerId: agentId,
      providerName: PROVIDER_NAME,
      externalId: agentId,
    } satisfies ProviderAgentRef;
  },

  async updateAgent(ref, config) {
    logger.info('mock-voice: updating agent', {
      agentId: ref.externalId,
      greeting: config.greeting,
    });
  },

  async startOutboundCall(input: OutboundCallInput): Promise<CallRef> {
    callCounter++;
    const callId = `mock-call-${callCounter}`;

    logger.info('mock-voice: starting outbound call', {
      callId,
      to: input.toNumber,
      from: input.fromNumber,
    });

    const call: NormalizedCall = {
      callId,
      providerCallId: callId,
      direction: 'outbound',
      status: 'ringing',
      callerNumber: input.fromNumber,
      calledNumber: input.toNumber,
      startedAt: new Date().toISOString(),
    };

    activeCalls.set(callId, call);

    return {
      callId,
      providerCallId: callId,
      providerName: PROVIDER_NAME,
    };
  },

  async getCall(callId: string): Promise<NormalizedCall> {
    logger.debug('mock-voice: getting call', { callId });

    const existing = activeCalls.get(callId);
    if (existing) return existing;

    return {
      callId,
      providerCallId: callId,
      direction: 'outbound',
      status: 'completed',
      callerNumber: '+15551234567',
      calledNumber: '+15559876543',
      durationSeconds: 127,
      startedAt: new Date(Date.now() - 130_000).toISOString(),
      endedAt: new Date(Date.now() - 3_000).toISOString(),
      recordingUrl: `https://mock-recordings.test/${callId}.wav`,
      transcript: [
        { role: 'agent', content: 'Hello, this is a test call.', timestamp: new Date().toISOString() },
        { role: 'caller', content: 'Hi, thanks for calling.', timestamp: new Date().toISOString() },
      ],
    };
  },

  async getRecording(callId: string): Promise<RecordingRef | null> {
    logger.debug('mock-voice: getting recording', { callId });
    return {
      url: `https://mock-recordings.test/${callId}.wav`,
      durationSeconds: 127,
      format: 'wav',
    };
  },

  async terminateCall(callId: string): Promise<void> {
    logger.info('mock-voice: terminating call', { callId });
    const existing = activeCalls.get(callId);
    if (existing) {
      existing.status = 'completed';
      existing.endedAt = new Date().toISOString();
    }
  },
};

export function createMockVoiceProvider(): VoiceRuntimeProvider {
  return mockVoiceAdapter;
}
