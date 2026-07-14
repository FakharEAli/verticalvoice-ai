import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";

// ─── Fair Housing Protected Terms ────────────────────────────────────────────

/**
 * Terms that may indicate Fair Housing Act violations when used in
 * listing descriptions or qualification criteria.
 */
const DISCRIMINATORY_TERMS: { term: string; category: string }[] = [
  // Race / Color / National Origin
  { term: "white neighborhood", category: "race" },
  { term: "black neighborhood", category: "race" },
  { term: "no foreigners", category: "national_origin" },
  { term: "english only", category: "national_origin" },
  { term: "american only", category: "national_origin" },
  { term: "exclusive neighborhood", category: "race" },
  { term: "ethnic", category: "national_origin" },
  { term: "integrated", category: "race" },
  { term: "segregated", category: "race" },

  // Religion
  { term: "christian community", category: "religion" },
  { term: "near church", category: "religion" },
  { term: "near mosque", category: "religion" },
  { term: "near synagogue", category: "religion" },
  { term: "no muslims", category: "religion" },

  // Familial Status
  { term: "no children", category: "familial_status" },
  { term: "no kids", category: "familial_status" },
  { term: "adults only", category: "familial_status" },
  { term: "perfect for singles", category: "familial_status" },
  { term: "mature community", category: "familial_status" },
  { term: "couples only", category: "familial_status" },
  { term: "no families", category: "familial_status" },

  // Disability
  { term: "no wheelchairs", category: "disability" },
  { term: "no disabled", category: "disability" },
  { term: "able-bodied", category: "disability" },
  { term: "physically fit", category: "disability" },
  { term: "mental illness", category: "disability" },

  // Sex / Gender
  { term: "male only", category: "sex" },
  { term: "female only", category: "sex" },
  { term: "men only", category: "sex" },
  { term: "women only", category: "sex" },
  { term: "bachelor pad", category: "sex" },
];

/** Protected class data fields that must never be used in lead scoring */
const PROTECTED_CLASS_DATA_FIELDS = [
  "race",
  "color",
  "religion",
  "national_origin",
  "sex",
  "familial_status",
  "disability",
  "gender",
  "sexual_orientation",
  "marital_status",
  "age",
  "ethnicity",
  "citizenship",
  "ancestry",
  "pregnancy",
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FairHousingCheckResult {
  has_violations: boolean;
  violations: { term: string; category: string; position: number }[];
}

export interface QualificationValidationResult {
  is_valid: boolean;
  violations: string[];
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Check text for potential Fair Housing Act discriminatory language.
 */
export function checkFairHousing(text: string): FairHousingCheckResult {
  const lower = text.toLowerCase();
  const violations: { term: string; category: string; position: number }[] = [];

  for (const { term, category } of DISCRIMINATORY_TERMS) {
    const idx = lower.indexOf(term);
    if (idx !== -1) {
      violations.push({ term, category, position: idx });
    }
  }

  return {
    has_violations: violations.length > 0,
    violations,
  };
}

/**
 * Remove discriminatory terms from a listing description.
 * Returns the sanitized text and a list of removed terms.
 */
export function sanitizeListingDescription(
  text: string
): { sanitized: string; removed_terms: string[] } {
  let sanitized = text;
  const removed: string[] = [];

  for (const { term } of DISCRIMINATORY_TERMS) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(sanitized)) {
      removed.push(term);
      sanitized = sanitized.replace(regex, "[removed]");
    }
  }

  return { sanitized, removed_terms: removed };
}

/**
 * Validate that qualification/scoring data does not include protected class fields.
 */
export function validateQualification(
  data: Record<string, unknown>
): QualificationValidationResult {
  const violations: string[] = [];

  for (const key of Object.keys(data)) {
    const keyLower = key.toLowerCase();
    for (const field of PROTECTED_CLASS_DATA_FIELDS) {
      if (keyLower.includes(field)) {
        violations.push(`Field "${key}" references protected class "${field}"`);
      }
    }
  }

  return {
    is_valid: violations.length === 0,
    violations,
  };
}

/**
 * Log a Fair Housing policy violation for compliance review.
 */
export async function logPolicyViolation(
  tenantId: string,
  callId: string,
  violation: { type: string; details: string; text_excerpt?: string }
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("audit_events")
    .insert({
      tenant_id: tenantId,
      action: "fair_housing_violation",
      resource_type: "call",
      resource_id: callId,
      metadata: {
        violation_type: violation.type,
        details: violation.details,
        text_excerpt: violation.text_excerpt ?? null,
        detected_at: new Date().toISOString(),
      },
    });

  if (error) {
    logger.error("Failed to log fair housing violation", { tenantId, callId, error: error.message });
    throw new Error(`Failed to log policy violation: ${error.message}`);
  }

  logger.warn("Fair housing violation logged", {
    tenantId,
    callId,
    violationType: violation.type,
  });
}
