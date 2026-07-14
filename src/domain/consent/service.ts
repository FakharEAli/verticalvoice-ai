import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Json } from "@/lib/database/types";

// Mirrors consent_records schema from types.ts
export interface ConsentRecord {
  id: string;
  tenant_id: string;
  phone_number: string;
  consent_type: string;
  status: string;
  granted_at: string | null;
  revoked_at: string | null;
  source: string;
  ip_address: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface RecordConsentInput {
  phone_number: string;
  consent_type: string;
  status: "granted" | "revoked";
  source: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}

// Mirrors suppression_entries schema from types.ts
export interface SuppressionEntry {
  id: string;
  tenant_id: string;
  phone_number: string;
  reason: string;
  source: string;
  suppressed_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface OutboundEligibility {
  allowed: boolean;
  reasons: string[];
}

export async function recordConsent(
  tenantId: string,
  consent: RecordConsentInput
): Promise<ConsentRecord> {
  const supabase = await createServerClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("consent_records")
    .insert({
      tenant_id: tenantId,
      phone_number: consent.phone_number,
      consent_type: consent.consent_type,
      status: consent.status,
      source: consent.source,
      granted_at: consent.status === "granted" ? now : null,
      revoked_at: consent.status === "revoked" ? now : null,
      ip_address: consent.ip_address ?? null,
      metadata: (consent.metadata ?? {}) as Json,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to record consent", { tenantId, phoneNumber: consent.phone_number, error: error.message });
    throw new Error(`Failed to record consent: ${error.message}`);
  }

  logger.info("Consent recorded", {
    tenantId,
    phoneNumber: consent.phone_number,
    consentType: consent.consent_type,
    status: consent.status,
  });

  return data;
}

export async function checkConsent(
  tenantId: string,
  phone: string
): Promise<ConsentRecord | null> {
  const supabase = await createServerClient();

  // Get the most recent consent record for this phone number
  const { data, error } = await supabase
    .from("consent_records")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone_number", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("Failed to check consent", { tenantId, phone, error: error.message });
    throw new Error(`Failed to check consent: ${error.message}`);
  }

  return data;
}

export async function addToSuppression(
  tenantId: string,
  phone: string,
  reason: string
): Promise<SuppressionEntry> {
  const supabase = await createServerClient();

  // Check if already suppressed to avoid duplicates
  const existing = await checkSuppression(tenantId, phone);
  if (existing) {
    logger.info("Phone already on suppression list", { tenantId, phone });
    return existing;
  }

  const { data, error } = await supabase
    .from("suppression_entries")
    .insert({
      tenant_id: tenantId,
      phone_number: phone,
      reason,
      source: "api",
      suppressed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to add to suppression list", { tenantId, phone, error: error.message });
    throw new Error(`Failed to add to suppression list: ${error.message}`);
  }

  logger.info("Phone added to suppression list", { tenantId, phone, reason });
  return data;
}

export async function checkSuppression(
  tenantId: string,
  phone: string
): Promise<SuppressionEntry | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("suppression_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone_number", phone)
    .maybeSingle();

  if (error) {
    logger.error("Failed to check suppression list", { tenantId, phone, error: error.message });
    throw new Error(`Failed to check suppression: ${error.message}`);
  }

  if (!data) return null;

  // Check if suppression has expired
  if (data.expires_at && data.expires_at < new Date().toISOString()) {
    return null;
  }

  return data;
}

export async function canCallOutbound(
  tenantId: string,
  phone: string
): Promise<OutboundEligibility> {
  const reasons: string[] = [];

  // 1. Check policy settings -- is outbound even allowed?
  const supabase = await createServerClient();
  const { data: policy } = await supabase
    .from("policy_settings")
    .select("allow_outbound")
    .eq("tenant_id", tenantId)
    .single();

  if (!policy?.allow_outbound) {
    reasons.push("Outbound calls are disabled for this tenant");
  }

  // 2. Check suppression list (DNC)
  const suppressed = await checkSuppression(tenantId, phone);
  if (suppressed) {
    reasons.push(`Phone is on suppression list: ${suppressed.reason}`);
  }

  // 3. Check consent
  const consent = await checkConsent(tenantId, phone);
  if (!consent) {
    reasons.push("No consent record found for this phone number");
  } else if (consent.status === "revoked") {
    reasons.push("Consent has been revoked");
  }

  const allowed = reasons.length === 0;

  if (!allowed) {
    logger.info("Outbound call not eligible", { tenantId, phone, reasons });
  }

  return { allowed, reasons };
}
