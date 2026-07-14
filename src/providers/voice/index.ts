import { logger } from '@/lib/observability/logger';
import type { VoiceRuntimeProvider } from './types';

export type VoiceProviderName = 'ultravox' | 'retell' | 'mock';

let cached: VoiceRuntimeProvider | null = null;

export function getVoiceProvider(name?: VoiceProviderName): VoiceRuntimeProvider {
  if (cached) return cached;

  const resolved = name ?? (process.env.VOICE_PROVIDER as VoiceProviderName | undefined) ?? 'ultravox';

  logger.info('voice: initializing provider', { provider: resolved });

  switch (resolved) {
    case 'ultravox': {
      const { createUltravoxProvider } = require('./ultravox/adapter') as typeof import('./ultravox/adapter');
      cached = createUltravoxProvider();
      break;
    }
    case 'retell': {
      const { createRetellProvider } = require('./retell/adapter') as typeof import('./retell/adapter');
      cached = createRetellProvider();
      break;
    }
    case 'mock': {
      const { createMockVoiceProvider } = require('./mock/adapter') as typeof import('./mock/adapter');
      cached = createMockVoiceProvider();
      break;
    }
    default:
      throw new Error(`Unknown voice provider: ${resolved}`);
  }

  return cached;
}

export function resetVoiceProvider(): void {
  cached = null;
}

export type { VoiceRuntimeProvider } from './types';
