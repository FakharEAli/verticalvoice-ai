// ---------------------------------------------------------------------------
// Messaging integration – factory & barrel exports
// ---------------------------------------------------------------------------

import { logger } from "@/lib/observability/logger";
import { DemoMessagingAdapter } from "./demo/adapter";
import { ResendEmailAdapter } from "./resend/adapter";
import { TwilioSmsAdapter } from "./twilio-sms/adapter";
import type { MessagingAdapter, MessagingAdapterConfig } from "./types";

export type {
  MessageRef,
  MessagingAdapter,
  MessagingAdapterConfig,
  SendEmailInput,
  SendSmsInput,
} from "./types";

export { DemoMessagingAdapter } from "./demo/adapter";
export { ResendEmailAdapter } from "./resend/adapter";
export { TwilioSmsAdapter } from "./twilio-sms/adapter";

/**
 * Instantiate the correct messaging adapter for a given provider string.
 *
 * @throws {Error} If the provider is not recognised.
 */
export function createMessagingAdapter(
  provider: string,
  config: MessagingAdapterConfig,
): MessagingAdapter {
  switch (provider) {
    case "twilio":
      logger.debug("Creating TwilioSmsAdapter", { connectionId: config.connectionId });
      return new TwilioSmsAdapter(config);

    case "resend":
      logger.debug("Creating ResendEmailAdapter", { connectionId: config.connectionId });
      return new ResendEmailAdapter(config);

    case "demo":
      logger.debug("Creating DemoMessagingAdapter", { connectionId: config.connectionId });
      return new DemoMessagingAdapter(config);

    default:
      throw new Error(
        `Unknown messaging provider "${provider}". Supported providers: twilio, resend, demo.`,
      );
  }
}
