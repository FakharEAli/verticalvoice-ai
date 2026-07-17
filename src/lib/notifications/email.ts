import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  sent: boolean;
  error?: string;
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  if (!cachedTransporter) {
    const port = Number(process.env.SMTP_PORT ?? "587");
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

async function sendViaSmtp(params: SendEmailParams): Promise<SendEmailResult> {
  const transporter = getSmtpTransporter();
  if (!transporter) return { sent: false, error: "not_configured" };

  const from = process.env.NOTIFICATIONS_FROM_EMAIL ?? process.env.SMTP_USER!;

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] SMTP send failed", err);
    return { sent: false, error: "smtp_send_failed" };
  }
}

async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: "not_configured" };

  const from = process.env.NOTIFICATIONS_FROM_EMAIL ?? "VerticalVoice AI <notifications@verticalvoice.ai>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] Resend send failed", res.status, text);
      return { sent: false, error: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] Resend request threw", err);
    return { sent: false, error: "request_failed" };
  }
}

/**
 * Sends staff/customer notification emails. SMTP (Gmail) is the primary
 * provider — falls back to Resend if SMTP env vars aren't set. Fails soft
 * (returns {sent:false} instead of throwing) either way, so a delivery
 * failure never breaks the tool call or webhook that triggered it.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const smtpResult = await sendViaSmtp(params);
  if (smtpResult.sent || smtpResult.error !== "not_configured") return smtpResult;

  const resendResult = await sendViaResend(params);
  if (resendResult.error === "not_configured") {
    console.warn("[email] No email provider configured (SMTP_* or RESEND_API_KEY) — skipping send", {
      to: params.to,
      subject: params.subject,
    });
  }
  return resendResult;
}
