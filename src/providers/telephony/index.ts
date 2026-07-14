import { logger } from '@/lib/observability/logger';
import type { TelephonyProvider } from './types';

export type TelephonyProviderName = 'twilio' | 'telnyx' | 'mock';

let cached: TelephonyProvider | null = null;

export function getTelephonyProvider(name?: TelephonyProviderName): TelephonyProvider {
  if (cached) return cached;

  const resolved = name ?? (process.env.TELEPHONY_PROVIDER as TelephonyProviderName | undefined) ?? 'twilio';

  logger.info('telephony: initializing provider', { provider: resolved });

  switch (resolved) {
    case 'twilio': {
      const { createTwilioProvider } = require('./twilio/adapter') as typeof import('./twilio/adapter');
      cached = createTwilioProvider();
      break;
    }
    case 'telnyx': {
      const { createTelnyxProvider } = require('./telnyx/adapter') as typeof import('./telnyx/adapter');
      cached = createTelnyxProvider();
      break;
    }
    case 'mock': {
      const { createMockTelephonyProvider } = require('./mock/adapter') as typeof import('./mock/adapter');
      cached = createMockTelephonyProvider();
      break;
    }
    default:
      throw new Error(`Unknown telephony provider: ${resolved}`);
  }

  return cached;
}

export function resetTelephonyProvider(): void {
  cached = null;
}

export type { TelephonyProvider } from './types';
