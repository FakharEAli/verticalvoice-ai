import jwt from "jsonwebtoken";

/**
 * Twilio Access Token (a JWT in Twilio's "twilio-fpa" format) granting Voice
 * capability for the given TwiML Application, so a browser can place an
 * outgoing call via the Twilio Voice SDK.
 *
 * https://www.twilio.com/docs/iam/access-tokens
 *
 * Signed with `jsonwebtoken` rather than hand-rolled HMAC — a hand-rolled
 * version was tried first and Twilio's signaling server rejected it with
 * "JWT signature validation failed" (code 31202), confirmed via live
 * browser console logs against production. Using a standard, well-tested
 * signing library removes that entire class of encoding bugs.
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

  const payload = {
    jti: `${apiKeySid}-${Math.floor(Date.now() / 1000)}`,
    grants: {
      identity,
      voice: {
        outgoing: { application_sid: twimlAppSid },
        incoming: { allow: true },
      },
    },
  };

  return jwt.sign(payload, apiKeySecret, {
    algorithm: "HS256",
    issuer: apiKeySid,
    subject: accountSid,
    expiresIn: 3600,
    header: { cty: "twilio-fpa;v=1" } as jwt.JwtHeader,
  });
}
