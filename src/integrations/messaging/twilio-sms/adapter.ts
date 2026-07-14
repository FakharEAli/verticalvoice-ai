// ---------------------------------------------------------------------------
// Twilio SMS adapter
// ---------------------------------------------------------------------------

import { z } from "zod";
import { logger } from "@/lib/observability/logger";
import type {
  MessagingAdapter,
  MessagingAdapterConfig,
  MessageRef,
  SendEmailInput,
  SendSmsInput,
} from "../types";

const TwilioMessageResponseSchema = z.object({
  sid: z.string(),
  status: z.string(),
  date_created: z.string(),
});

export class TwilioSmsAdapter implements MessagingAdapter {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly authHeader: string;

  constructor(private readonly config: MessagingAdapterConfig) {
    const { accountSid, authToken, fromNumber } = config.credentials;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        "TwilioSmsAdapter requires accountSid, authToken, and fromNumber in credentials.",
      );
    }

    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
    this.authHeader =
      "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  }

  async sendSms(input: SendSmsInput): Promise<MessageRef> {
    const from = input.from ?? this.fromNumber;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

    const params = new URLSearchParams({
      To: input.to,
      From: from,
      Body: input.body,
    });

    logger.debug("Sending SMS via Twilio", {
      to: input.to,
      from,
      connectionId: this.config.connectionId,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      logger.error("Twilio SMS send failed", {
        status: res.status,
        body: errorBody,
        to: input.to,
      });
      throw new Error(`Twilio API error ${res.status}: ${errorBody}`);
    }

    const json = await res.json();
    const parsed = TwilioMessageResponseSchema.parse(json);

    logger.info("SMS sent via Twilio", {
      sid: parsed.sid,
      status: parsed.status,
    });

    return {
      id: crypto.randomUUID(),
      externalId: parsed.sid,
      provider: "twilio",
      status: parsed.status === "queued" ? "queued" : "sent",
      sentAt: parsed.date_created,
    };
  }

  async sendEmail(_input: SendEmailInput): Promise<MessageRef> {
    throw new Error(
      "TwilioSmsAdapter does not support email. Use a dedicated email adapter.",
    );
  }
}
