import { logger } from '@/lib/observability/logger';
import type { VoiceRuntimeProvider } from './types';
import { createUltravoxProvider } from './ultravox/adapter';
import { createRetellProvider } from './retell/adapter';
import { createMockVoiceProvider } from './mock/adapter';

export type VoiceProviderName = 'ultravox' | 'retell' | 'mock';

let cached: VoiceRuntimeProvider | null = null;

export function getVoiceProvider(name?: VoiceProviderName): VoiceRuntimeProvider {
  if (cached) return cached;

  const resolved = name ?? (process.env.VOICE_PROVIDER as VoiceProviderName | undefined) ?? 'ultravox';

  logger.info('voice: initializing provider', { provider: resolved });

  switch (resolved) {
    case 'ultravox': {
      cached = createUltravoxProvider();
      break;
    }
    case 'retell': {
      cached = createRetellProvider();
      break;
    }
    case 'mock': {
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
