// ---------------------------------------------------------------------------
// Demo / in-memory messaging adapter (for development & testing)
// ---------------------------------------------------------------------------

import { logger } from "@/lib/observability/logger";
import type {
  MessagingAdapter,
  MessagingAdapterConfig,
  MessageRef,
  SendEmailInput,
  SendSmsInput,
} from "../types";

interface SentMessage {
  type: "sms" | "email";
  input: SendSmsInput | SendEmailInput;
  ref: MessageRef;
}

export class DemoMessagingAdapter implements MessagingAdapter {
  /** In-memory log of every message sent through this adapter instance. */
  public readonly sentMessages: SentMessage[] = [];

  constructor(private readonly config: MessagingAdapterConfig) {
    logger.info("DemoMessagingAdapter initialised", {
      connectionId: config.connectionId,
      tenantId: config.tenantId,
    });
  }

  async sendSms(input: SendSmsInput): Promise<MessageRef> {
    const ref: MessageRef = {
      id: crypto.randomUUID(),
      externalId: `demo-sms-${Date.now()}`,
      provider: "demo",
      status: "sent",
      sentAt: new Date().toISOString(),
    };

    this.sentMessages.push({ type: "sms", input, ref });

    logger.info("[DEMO] SMS sent", {
      to: input.to,
      body: input.body,
      from: input.from,
      ref,
    });

    return ref;
  }

  async sendEmail(input: SendEmailInput): Promise<MessageRef> {
    const ref: MessageRef = {
      id: crypto.randomUUID(),
      externalId: `demo-email-${Date.now()}`,
      provider: "demo",
      status: "sent",
      sentAt: new Date().toISOString(),
    };

    this.sentMessages.push({ type: "email", input, ref });

    logger.info("[DEMO] Email sent", {
      to: input.to,
      subject: input.subject,
      from: input.from,
      ref,
    });

    return ref;
  }
}
