import { logger } from '@/lib/observability/logger';
import type { TelephonyProvider } from './types';
import { createTwilioProvider } from './twilio/adapter';
import { createTelnyxProvider } from './telnyx/adapter';
import { createMockTelephonyProvider } from './mock/adapter';

export type TelephonyProviderName = 'twilio' | 'telnyx' | 'mock';

let cached: TelephonyProvider | null = null;

export function getTelephonyProvider(name?: TelephonyProviderName): TelephonyProvider {
  if (cached) return cached;

  const resolved = name ?? (process.env.TELEPHONY_PROVIDER as TelephonyProviderName | undefined) ?? 'twilio';

  logger.info('telephony: initializing provider', { provider: resolved });

  switch (resolved) {
    case 'twilio': {
      cached = createTwilioProvider();
      break;
    }
    case 'telnyx': {
      cached = createTelnyxProvider();
      break;
    }
    case 'mock': {
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
