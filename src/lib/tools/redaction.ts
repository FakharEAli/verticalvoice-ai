import { logger } from '@/lib/observability/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
  category: string;
}

export type RedactionLevel = 'minimal' | 'standard' | 'strict';

// ─── Built-in Patterns ───────────────────────────────────────────────────────

// Credit/debit card numbers: 13-19 digit sequences (with optional spaces/dashes)
const CARD_PATTERN = /\b(?:\d[ -]*){13,19}\b/g;

// SSN: XXX-XX-XXXX
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;

// Date of birth patterns: MM/DD/YYYY, YYYY-MM-DD, etc.
const DOB_PATTERN = /\b(?:(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}|(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/g;

// Medical record numbers: MRN followed by digits
const MRN_PATTERN = /\bMRN[:\s#-]*\d{4,12}\b/gi;

// Phone numbers
const PHONE_PATTERN = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

// Email addresses
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Names following "patient" or "Dr."
const PATIENT_NAME_PATTERN = /\b(?:patient|Patient)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
const DOCTOR_NAME_PATTERN = /\b(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;

// ─── Rule Builders ───────────────────────────────────────────────────────────

function buildMinimalRules(): RedactionRule[] {
  return [
    { pattern: CARD_PATTERN, replacement: '[CARD REDACTED]', category: 'financial' },
    { pattern: SSN_PATTERN, replacement: '[SSN REDACTED]', category: 'pii' },
  ];
}

function buildStandardRules(): RedactionRule[] {
  return [
    ...buildMinimalRules(),
    { pattern: DOB_PATTERN, replacement: '[DOB REDACTED]', category: 'phi' },
    { pattern: MRN_PATTERN, replacement: '[MRN REDACTED]', category: 'phi' },
  ];
}

function buildStrictRules(): RedactionRule[] {
  return [
    ...buildStandardRules(),
    { pattern: PATIENT_NAME_PATTERN, replacement: 'patient [NAME REDACTED]', category: 'phi' },
    { pattern: DOCTOR_NAME_PATTERN, replacement: 'Dr. [NAME REDACTED]', category: 'phi' },
    { pattern: PHONE_PATTERN, replacement: '[PHONE REDACTED]', category: 'pii' },
    { pattern: EMAIL_PATTERN, replacement: '[EMAIL REDACTED]', category: 'pii' },
  ];
}

// ─── Single-Purpose Redactors ─────────────────────────────────────────────────

/**
 * Replace card-like digit sequences with [CARD REDACTED].
 */
export function redactCardNumbers(text: string): string {
  return text.replace(CARD_PATTERN, '[CARD REDACTED]');
}

/**
 * Replace SSN patterns (XXX-XX-XXXX) with [SSN REDACTED].
 */
export function redactSSN(text: string): string {
  return text.replace(SSN_PATTERN, '[SSN REDACTED]');
}

/**
 * Apply PHI redaction at configurable levels.
 * - minimal: SSN + card numbers only
 * - standard: + DOB, medical record numbers
 * - strict: + patient/doctor names, phone, email
 */
export function redactPHI(text: string, level: RedactionLevel = 'standard'): string {
  let rules: RedactionRule[];
  switch (level) {
    case 'minimal':
      rules = buildMinimalRules();
      break;
    case 'strict':
      rules = buildStrictRules();
      break;
    case 'standard':
    default:
      rules = buildStandardRules();
      break;
  }

  let result = text;
  for (const rule of rules) {
    // Reset lastIndex for global regexes
    rule.pattern.lastIndex = 0;
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

// ─── Generic Object Redactor ──────────────────────────────────────────────────

/**
 * Deep-traverse any data structure and apply redaction rules to all string values.
 * Returns a new object; the input is not mutated.
 */
export function redactOutput(data: unknown, rules: RedactionRule[]): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    let result = data;
    let redactedCount = 0;
    for (const rule of rules) {
      // Reset lastIndex for global regexes
      rule.pattern.lastIndex = 0;
      const before = result;
      result = result.replace(rule.pattern, rule.replacement);
      if (result !== before) {
        redactedCount++;
      }
    }
    if (redactedCount > 0) {
      logger.debug('redaction_applied', { categories: rules.map((r) => r.category), redactedCount });
    }
    return result;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactOutput(item, rules));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = redactOutput(value, rules);
    }
    return result;
  }

  // Primitives (number, boolean) pass through unchanged
  return data;
}

// ─── Convenience ──────────────────────────────────────────────────────────────

/**
 * Build a set of redaction rules for a given level.
 */
export function buildRedactionRules(level: RedactionLevel): RedactionRule[] {
  switch (level) {
    case 'minimal':
      return buildMinimalRules();
    case 'standard':
      return buildStandardRules();
    case 'strict':
      return buildStrictRules();
  }
}
