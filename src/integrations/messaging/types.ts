// ---------------------------------------------------------------------------
// Messaging integration – shared types
// ---------------------------------------------------------------------------

/** Result reference returned after sending a message. */
export interface MessageRef {
  id: string;
  externalId: string;
  provider: string;
  status: "queued" | "sent" | "delivered" | "failed";
  sentAt: string;
}

/** Input for sending an SMS message. */
export interface SendSmsInput {
  to: string;
  body: string;
  from?: string;
}

/** Input for sending an email message. */
export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

/** Configuration supplied when constructing a messaging adapter. */
export interface MessagingAdapterConfig {
  connectionId: string;
  tenantId: string;
  credentials: Record<string, string>;
}

/** Common adapter interface that every messaging provider must implement. */
export interface MessagingAdapter {
  sendSms(input: SendSmsInput): Promise<MessageRef>;
  sendEmail(input: SendEmailInput): Promise<MessageRef>;
}
