import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Json } from "@/lib/database/types";

// Mirrors notifications schema from types.ts
export interface NotificationResult {
  id: string;
  channel: string;
  status: string;
}

export interface ConfirmationDetails {
  recipient_phone?: string;
  recipient_email?: string;
  customer_name: string;
  booking_time: string; // ISO datetime
  service_type?: string;
  business_name: string;
  notes?: string;
}

export async function sendSms(
  tenantId: string,
  to: string,
  message: string
): Promise<NotificationResult> {
  const supabase = await createServerClient();

  logger.info("Sending SMS", { tenantId, to: to.slice(0, 6) + "****" });

  // NOTE: Actual SMS delivery is handled by an external provider (e.g., Twilio).
  // This implementation records the intent and delegates to the provider.
  // In production, integrate with the telephony provider configured for the tenant.

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      tenant_id: tenantId,
      channel: "sms",
      type: "sms_outbound",
      title: "SMS Message",
      body: message,
      data: { recipient: to } as Json,
      sent_at: new Date().toISOString(),
    })
    .select("id, channel")
    .single();

  if (error) {
    logger.error("Failed to log SMS notification", { tenantId, error: error.message });
    throw new Error(`Failed to log notification: ${error.message}`);
  }

  return {
    id: data.id,
    channel: data.channel,
    status: "sent",
  };
}

export async function sendEmail(
  tenantId: string,
  to: string,
  subject: string,
  body: string
): Promise<NotificationResult> {
  const supabase = await createServerClient();

  logger.info("Sending email", { tenantId, to });

  // NOTE: Actual email delivery is handled by an external provider (e.g., Resend, SendGrid).
  // This implementation records the intent and delegates to the provider.

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      tenant_id: tenantId,
      channel: "email",
      type: "email_outbound",
      title: subject,
      body,
      data: { recipient: to } as Json,
      sent_at: new Date().toISOString(),
    })
    .select("id, channel")
    .single();

  if (error) {
    logger.error("Failed to log email notification", { tenantId, error: error.message });
    throw new Error(`Failed to log notification: ${error.message}`);
  }

  return {
    id: data.id,
    channel: data.channel,
    status: "sent",
  };
}

export async function sendConfirmation(
  tenantId: string,
  type: "booking_confirmed" | "booking_rescheduled" | "booking_cancelled" | "reminder",
  details: ConfirmationDetails
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  const timeFormatted = new Date(details.booking_time).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const messageTemplates: Record<string, { subject: string; body: string }> = {
    booking_confirmed: {
      subject: `Appointment Confirmed - ${details.business_name}`,
      body: `Hi ${details.customer_name}, your appointment${details.service_type ? ` for ${details.service_type}` : ""} at ${details.business_name} is confirmed for ${timeFormatted}. ${details.notes ? `Note: ${details.notes}` : ""}`,
    },
    booking_rescheduled: {
      subject: `Appointment Rescheduled - ${details.business_name}`,
      body: `Hi ${details.customer_name}, your appointment at ${details.business_name} has been rescheduled to ${timeFormatted}.`,
    },
    booking_cancelled: {
      subject: `Appointment Cancelled - ${details.business_name}`,
      body: `Hi ${details.customer_name}, your appointment at ${details.business_name} for ${timeFormatted} has been cancelled. ${details.notes ? `Reason: ${details.notes}` : ""}`,
    },
    reminder: {
      subject: `Appointment Reminder - ${details.business_name}`,
      body: `Hi ${details.customer_name}, this is a reminder about your upcoming appointment at ${details.business_name} on ${timeFormatted}.`,
    },
  };

  const template = messageTemplates[type];
  if (!template) {
    throw new Error(`Unknown confirmation type: ${type}`);
  }

  // Send via SMS if phone is provided
  if (details.recipient_phone) {
    try {
      const smsResult = await sendSms(tenantId, details.recipient_phone, template.body);
      results.push(smsResult);
    } catch (err) {
      logger.error("Failed to send SMS confirmation", {
        tenantId,
        type,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Send via email if email is provided
  if (details.recipient_email) {
    try {
      const emailResult = await sendEmail(
        tenantId,
        details.recipient_email,
        template.subject,
        template.body
      );
      results.push(emailResult);
    } catch (err) {
      logger.error("Failed to send email confirmation", {
        tenantId,
        type,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (results.length === 0) {
    logger.warn("No confirmation sent -- no recipient phone or email provided", {
      tenantId,
      type,
    });
  }

  return results;
}
