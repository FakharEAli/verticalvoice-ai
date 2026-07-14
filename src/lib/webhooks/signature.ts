/**
 * Webhook signature validation utilities.
 * Uses only Node.js built-in crypto — no external dependencies.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/observability/logger';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Timing-safe comparison of two strings.
 * Returns false (rather than throwing) when lengths differ.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // timingSafeEqual throws when lengths differ — pad shorter buffer so we
  // still spend constant time before returning false.
  if (bufA.length !== bufB.length) {
    // Compare bufB against itself so we burn the same CPU, then return false.
    timingSafeEqual(bufB, bufB);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------

/**
 * Validate a Twilio webhook signature (HMAC-SHA1).
 *
 * Twilio's algorithm:
 * 1. Start with the full request URL.
 * 2. Sort POST params alphabetically by key.
 * 3. Append each key-value pair (no separators) to the URL.
 * 4. HMAC-SHA1 with the account's auth token.
 * 5. Base64-encode the digest.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): boolean {
  if (!url || !signature || !authToken) {
    logger.warn('validateTwilioSignature: missing required parameter', {
      hasUrl: !!url,
      hasSignature: !!signature,
      hasAuthToken: !!authToken,
    });
    return false;
  }

  try {
    // Build the data string: URL + sorted key-value pairs
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + (params[key] ?? '');
    }

    const computed = createHmac('sha1', authToken)
      .update(data, 'utf8')
      .digest('base64');

    const valid = safeCompare(computed, signature);

    if (!valid) {
      logger.warn('validateTwilioSignature: signature mismatch', {
        url,
        paramCount: sortedKeys.length,
      });
    }

    return valid;
  } catch (error) {
    logger.warn('validateTwilioSignature: unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ultravox
// ---------------------------------------------------------------------------

/**
 * Validate an Ultravox webhook signature (HMAC-SHA256, hex-encoded).
 */
export function validateUltravoxSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  if (!body || !signature || !secret) {
    logger.warn('validateUltravoxSignature: missing required parameter', {
      hasBody: !!body,
      hasSignature: !!signature,
      hasSecret: !!secret,
    });
    return false;
  }

  try {
    const computed = createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    const valid = safeCompare(computed, signature);

    if (!valid) {
      logger.warn('validateUltravoxSignature: signature mismatch', {
        bodyLength: body.length,
      });
    }

    return valid;
  } catch (error) {
    logger.warn('validateUltravoxSignature: unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Telnyx
// ---------------------------------------------------------------------------

/** Maximum age of a Telnyx signature timestamp (5 minutes in ms). */
const TELNYX_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Validate a Telnyx webhook signature (HMAC-SHA256, hex-encoded).
 *
 * 1. Reject timestamps older than 5 minutes (replay protection).
 * 2. Concatenate timestamp + body.
 * 3. HMAC-SHA256 with the signing secret.
 * 4. Hex-encode and compare.
 */
export function validateTelnyxSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string,
): boolean {
  if (!body || !signature || !timestamp || !publicKey) {
    logger.warn('validateTelnyxSignature: missing required parameter', {
      hasBody: !!body,
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasPublicKey: !!publicKey,
    });
    return false;
  }

  try {
    // --- Timestamp freshness check ---
    const tsValue = Number(timestamp);
    if (Number.isNaN(tsValue)) {
      logger.warn('validateTelnyxSignature: non-numeric timestamp', {
        timestamp,
      });
      return false;
    }

    // Telnyx timestamps may be in seconds or milliseconds — normalise to ms.
    const tsMs = tsValue < 1e12 ? tsValue * 1000 : tsValue;
    const age = Math.abs(Date.now() - tsMs);

    if (age > TELNYX_TIMESTAMP_TOLERANCE_MS) {
      logger.warn('validateTelnyxSignature: timestamp too old', {
        ageSeconds: Math.round(age / 1000),
        toleranceSeconds: TELNYX_TIMESTAMP_TOLERANCE_MS / 1000,
      });
      return false;
    }

    // --- Signature verification ---
    const data = timestamp + body;
    const computed = createHmac('sha256', publicKey)
      .update(data, 'utf8')
      .digest('hex');

    const valid = safeCompare(computed, signature);

    if (!valid) {
      logger.warn('validateTelnyxSignature: signature mismatch', {
        bodyLength: body.length,
      });
    }

    return valid;
  } catch (error) {
    logger.warn('validateTelnyxSignature: unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
