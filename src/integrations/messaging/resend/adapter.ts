// ---------------------------------------------------------------------------
// Resend email adapter
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

const ResendEmailResponseSchema = z.object({
  id: z.string(),
});

export class ResendEmailAdapter implements MessagingAdapter {
  private readonly apiKey: string;

  constructor(private readonly config: MessagingAdapterConfig) {
    const { apiKey } = config.credentials;

    if (!apiKey) {
      throw new Error(
        "ResendEmailAdapter requires apiKey in credentials.",
      );
    }

    this.apiKey = apiKey;
  }

  async sendSms(_input: SendSmsInput): Promise<MessageRef> {
    void _input;
    throw new Error(
      "ResendEmailAdapter does not support SMS. Use a dedicated SMS adapter.",
    );
  }

  async sendEmail(input: SendEmailInput): Promise<MessageRef> {
    const url = "https://api.resend.com/emails";

    const payload: Record<string, string | string[]> = {
      from: input.from ?? "onboarding@resend.dev",
      to: [input.to],
      subject: input.subject,
      text: input.body,
    };

    if (input.html) {
      payload.html = input.html;
    }

    if (input.replyTo) {
      payload.reply_to = input.replyTo;
    }

    logger.debug("Sending email via Resend", {
      to: input.to,
      subject: input.subject,
      connectionId: this.config.connectionId,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      logger.error("Resend email send failed", {
        status: res.status,
        body: errorBody,
        to: input.to,
      });
      throw new Error(`Resend API error ${res.status}: ${errorBody}`);
    }

    const json = await res.json();
    const parsed = ResendEmailResponseSchema.parse(json);

    logger.info("Email sent via Resend", {
      id: parsed.id,
      to: input.to,
    });

    return {
      id: crypto.randomUUID(),
      externalId: parsed.id,
      provider: "resend",
      status: "queued",
      sentAt: new Date().toISOString(),
    };
  }
}
