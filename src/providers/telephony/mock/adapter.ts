import { logger } from '@/lib/observability/logger';
import type {
  TelephonyProvider,
  PhoneNumberRef,
  ProvisionNumberInput,
  InboundRouteInput,
  TransferInput,
  SmsInput,
  MessageRef,
  CostEstimateInput,
  MoneyEstimate,
} from '../types';

const PROVIDER_NAME = 'mock-telephony';

let numberCounter = 0;
let messageCounter = 0;

export const mockTelephonyAdapter: TelephonyProvider = {
  name: PROVIDER_NAME,

  async provisionNumber(input: ProvisionNumberInput): Promise<PhoneNumberRef> {
    numberCounter++;
    const sid = `mock-pn-${numberCounter}`;
    const areaCode = input.areaCode ?? '555';
    const number = `+1${areaCode}${String(1000000 + numberCounter).slice(1)}`;

    logger.info('mock-telephony: provisioning number', {
      sid,
      number,
      country: input.country,
      capabilities: input.capabilities,
    });

    return {
      id: sid,
      number,
      provider: PROVIDER_NAME,
      providerSid: sid,
    };
  },

  async configureInboundRoute(input: InboundRouteInput): Promise<void> {
    logger.info('mock-telephony: configuring inbound route', {
      phoneNumberSid: input.phoneNumberSid,
      webhookUrl: input.webhookUrl,
    });
  },

  async transferCall(input: TransferInput): Promise<void> {
    logger.info('mock-telephony: transferring call', {
      callSid: input.callSid,
      to: input.toNumber,
      announce: input.announceMessage,
    });
  },

  async sendSms(input: SmsInput): Promise<MessageRef> {
    messageCounter++;
    const id = `mock-msg-${messageCounter}`;

    logger.info('mock-telephony: sending SMS', {
      id,
      to: input.to,
      from: input.from,
      bodyLength: input.body.length,
    });

    return {
      id,
      status: 'sent',
    };
  },

  async validateWebhook(_request: Request): Promise<boolean> {
    void _request;
    logger.debug('mock-telephony: validating webhook (always returns true)');
    return true;
  },

  async estimateCost(input: CostEstimateInput): Promise<MoneyEstimate> {
    logger.debug('mock-telephony: estimating cost', { ...input });

    const perMinute = input.direction === 'inbound' ? 0.005 : 0.01;
    const voiceCost = perMinute * input.durationMinutes;

    return {
      amount: Math.round(voiceCost * 10000) / 10000,
      currency: 'USD',
      breakdown: [
        { item: `${input.direction} voice (${input.durationMinutes} min)`, amount: voiceCost },
      ],
    };
  },
};

export function createMockTelephonyProvider(): TelephonyProvider {
  return mockTelephonyAdapter;
}
