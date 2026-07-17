import { createHmac, randomBytes } from "crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Hand-rolled Twilio Access Token (a JWT in Twilio's "twilio-fpa" format)
 * granting Voice capability for the given TwiML Application. Avoids adding
 * the full server-side `twilio` SDK just for token signing — same rationale
 * as src/lib/webhooks/signature.ts using raw crypto instead of a library.
 *
 * https://www.twilio.com/docs/iam/access-tokens
 */
export function createVoiceAccessToken(identity: string): string {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    throw new Error(
      "TWILIO_ACCOUNT_SID / TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET / TWILIO_TWIML_APP_SID are not configured"
    );
  }

  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };

  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = 3600;

  const payload = {
    jti: `${apiKeySid}-${now}-${randomBytes(4).toString("hex")}`,
    iss: apiKeySid,
    sub: accountSid,
    exp: now + ttlSeconds,
    grants: {
      identity,
      voice: {
        outgoing: { application_sid: twimlAppSid },
        incoming: { allow: true },
      },
    },
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = base64url(
    createHmac("sha256", apiKeySecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest()
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
