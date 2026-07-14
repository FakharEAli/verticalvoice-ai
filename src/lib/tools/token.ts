import { createHmac } from 'crypto';
import { logger } from '@/lib/observability/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CallTokenPayload {
  call_id: string;
  tenant_id: string;
  enabled_tools: string[];
  iat: number;
  exp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64urlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(data: string): string {
  const padded = data + '='.repeat((4 - (data.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

function getSecret(): string {
  const secret = process.env.CALL_TOKEN_SECRET;
  if (!secret) {
    throw new Error('CALL_TOKEN_SECRET environment variable is not set');
  }
  return secret;
}

function sign(input: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(input).digest();
  return signature
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a signed JWT token scoped to a specific call.
 */
export function createCallToken(
  callId: string,
  tenantId: string,
  enabledTools: string[],
  expiresInSeconds: number = 3600,
): string {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

  const payload: CallTokenPayload = {
    call_id: callId,
    tenant_id: tenantId,
    enabled_tools: enabledTools,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));

  const signingInput = `${header}.${payloadEncoded}`;
  const signature = sign(signingInput, secret);

  logger.debug('call_token_created', { callId, tenantId, expiresIn: expiresInSeconds });

  return `${signingInput}.${signature}`;
}

/**
 * Verify a call-scoped JWT token and return the decoded payload.
 * Throws on invalid or expired tokens.
 */
export function verifyCallToken(token: string): CallTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new TokenError('invalid_format', 'Token must have three parts');
  }

  const [header, payloadEncoded, providedSignature] = parts;
  const secret = getSecret();

  // Verify signature
  const signingInput = `${header}.${payloadEncoded}`;
  const expectedSignature = sign(signingInput, secret);

  if (providedSignature !== expectedSignature) {
    throw new TokenError('invalid_signature', 'Token signature verification failed');
  }

  // Decode payload
  let payload: CallTokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadEncoded));
  } catch {
    throw new TokenError('invalid_payload', 'Token payload is not valid JSON');
  }

  // Validate required fields
  if (!payload.call_id || !payload.tenant_id) {
    throw new TokenError('missing_fields', 'Token must contain call_id and tenant_id');
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new TokenError('expired', 'Token has expired');
  }

  return payload;
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class TokenError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TokenError';
    this.code = code;
  }
}
