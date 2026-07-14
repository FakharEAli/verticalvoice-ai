import { z } from 'zod';
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

const PROVIDER_NAME = 'twilio';

function getConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured');
  }
  return { accountSid, authToken };
}

function basicAuth(): string {
  const { accountSid, authToken } = getConfig();
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

function apiUrl(path: string): string {
  const { accountSid } = getConfig();
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}.json`;
}

async function twilioRequest<T>(
  path: string,
  options: { method?: string; formData?: Record<string, string> } = {}
): Promise<T> {
  const url = apiUrl(path);
  const method = options.method ?? 'GET';

  logger.debug('twilio request', { method, url });

  const headers: Record<string, string> = {
    Authorization: basicAuth(),
  };

  let body: string | undefined;
  if (options.formData) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(options.formData).toString();
  }

  const res = await fetch(url, { method, headers, body });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('twilio request failed', { status: res.status, url, body: text });
    throw new Error(`Twilio API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

const twilioNumberSchema = z.object({
  sid: z.string(),
  phone_number: z.string(),
  friendly_name: z.string().optional(),
});

const twilioMessageSchema = z.object({
  sid: z.string(),
  status: z.string(),
});

export const twilioAdapter: TelephonyProvider = {
  name: PROVIDER_NAME,

  async provisionNumber(input: ProvisionNumberInput): Promise<PhoneNumberRef> {
    logger.info('twilio: provisioning number', { country: input.country, areaCode: input.areaCode });

    // Search for available numbers
    const searchParams = new URLSearchParams({
      VoiceEnabled: input.capabilities.includes('voice') ? 'true' : 'false',
      SmsEnabled: input.capabilities.includes('sms') ? 'true' : 'false',
    });

    if (input.areaCode) {
      searchParams.set('AreaCode', input.areaCode);
    }

    type AvailableNumbersResponse = {
      available_phone_numbers: Array<{ phone_number: string; friendly_name: string }>;
    };

    const available = await twilioRequest<AvailableNumbersResponse>(
      `/AvailablePhoneNumbers/${input.country}/Local?${searchParams.toString()}`
    );

    if (!available.available_phone_numbers?.length) {
      throw new Error(`No available numbers found for country=${input.country} areaCode=${input.areaCode ?? 'any'}`);
    }

    const chosen = available.available_phone_numbers[0];

    // Purchase the number
    const raw = await twilioRequest<Record<string, unknown>>('/IncomingPhoneNumbers', {
      method: 'POST',
      formData: { PhoneNumber: chosen.phone_number },
    });

    const parsed = twilioNumberSchema.parse(raw);

    logger.info('twilio: number provisioned', { sid: parsed.sid, number: parsed.phone_number });
    return {
      id: parsed.sid,
      number: parsed.phone_number,
      provider: PROVIDER_NAME,
      providerSid: parsed.sid,
    };
  },

  async configureInboundRoute(input: InboundRouteInput): Promise<void> {
    logger.info('twilio: configuring inbound route', {
      phoneNumberSid: input.phoneNumberSid,
      webhookUrl: input.webhookUrl,
    });

    const formData: Record<string, string> = {
      VoiceUrl: input.webhookUrl,
      VoiceMethod: 'POST',
    };

    if (input.statusCallbackUrl) {
      formData.StatusCallback = input.statusCallbackUrl;
      formData.StatusCallbackMethod = 'POST';
    }

    await twilioRequest(`/IncomingPhoneNumbers/${input.phoneNumberSid}`, {
      method: 'POST',
      formData,
    });

    logger.info('twilio: inbound route configured');
  },

  async transferCall(input: TransferInput): Promise<void> {
    logger.info('twilio: transferring call', { callSid: input.callSid, to: input.toNumber });

    // Build TwiML for call transfer
    let twiml = '<Response>';
    if (input.announceMessage) {
      twiml += `<Say>${input.announceMessage}</Say>`;
    }
    twiml += `<Dial>${input.toNumber}</Dial></Response>`;

    await twilioRequest(`/Calls/${input.callSid}`, {
      method: 'POST',
      formData: { Twiml: twiml },
    });

    logger.info('twilio: call transferred');
  },

  async sendSms(input: SmsInput): Promise<MessageRef> {
    logger.info('twilio: sending SMS', { to: input.to, from: input.from });

    const raw = await twilioRequest<Record<string, unknown>>('/Messages', {
      method: 'POST',
      formData: {
        To: input.to,
        From: input.from,
        Body: input.body,
      },
    });

    const parsed = twilioMessageSchema.parse(raw);
    const statusMap: Record<string, MessageRef['status']> = {
      queued: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      undelivered: 'failed',
    };

    logger.info('twilio: SMS sent', { sid: parsed.sid, status: parsed.status });
    return {
      id: parsed.sid,
      status: statusMap[parsed.status] ?? 'queued',
    };
  },

  async validateWebhook(request: Request): Promise<boolean> {
    // Twilio webhook validation: check X-Twilio-Signature header
    // using HMAC-SHA1 of (url + sorted POST params) with auth token.
    const signature = request.headers.get('X-Twilio-Signature');
    if (!signature) {
      logger.warn('twilio: webhook missing X-Twilio-Signature header');
      return false;
    }

    const { authToken } = getConfig();
    const url = request.url;

    // Parse form body for signature computation
    const body = await request.clone().text();
    const params = new URLSearchParams(body);
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('');

    const data = url + sortedParams;

    // HMAC-SHA1 validation
    const { createHmac } = await import('crypto');
    const expected = createHmac('sha1', authToken).update(data).digest('base64');

    const valid = expected === signature;
    if (!valid) {
      logger.warn('twilio: webhook signature mismatch');
    }
    return valid;
  },

  async estimateCost(input: CostEstimateInput): Promise<MoneyEstimate> {
    logger.debug('twilio: estimating cost', { ...input });

    // Twilio rate estimates (USD) - simplified per-minute rates
    const rates: Record<string, { inbound: number; outbound: number }> = {
      US: { inbound: 0.0085, outbound: 0.014 },
      GB: { inbound: 0.01, outbound: 0.02 },
      CA: { inbound: 0.0085, outbound: 0.014 },
    };

    const countryRates = rates[input.country] ?? { inbound: 0.015, outbound: 0.025 };
    const perMinute = input.direction === 'inbound' ? countryRates.inbound : countryRates.outbound;
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

export function createTwilioProvider(): TelephonyProvider {
  return twilioAdapter;
}
