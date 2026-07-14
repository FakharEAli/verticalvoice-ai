import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type InsuranceIntakeRow = Database["public"]["Tables"]["insurance_intakes"]["Row"];
type ReferralIntakeRow = Database["public"]["Tables"]["referral_intakes"]["Row"];
type RefillRequestRow = Database["public"]["Tables"]["refill_requests"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface InsuranceIntakeInput {
  patient_name: string;
  patient_phone: string;
  patient_dob?: string;
  insurance_provider: string;
  policy_number?: string;
  group_number?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  relationship_to_subscriber?: string;
  call_id?: string;
}

export interface ReferralIntakeInput {
  patient_name: string;
  patient_phone: string;
  referring_provider?: string;
  referring_practice?: string;
  referral_reason: string;
  urgency?: string;
  insurance_verified?: boolean;
  notes?: string;
  call_id?: string;
}

export interface RefillRequestInput {
  patient_name: string;
  patient_phone: string;
  patient_dob?: string;
  medication_name: string;
  medication_dosage?: string;
  pharmacy_name?: string;
  pharmacy_phone?: string;
  provider_id?: string;
  call_id?: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Record insurance information from a patient intake call.
 */
export async function createInsuranceIntake(
  tenantId: string,
  input: InsuranceIntakeInput
): Promise<InsuranceIntakeRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("insurance_intakes")
    .insert({
      tenant_id: tenantId,
      patient_name: input.patient_name,
      patient_phone: input.patient_phone,
      patient_dob: input.patient_dob ?? null,
      insurance_provider: input.insurance_provider,
      policy_number: input.policy_number ?? null,
      group_number: input.group_number ?? null,
      subscriber_name: input.subscriber_name ?? null,
      subscriber_dob: input.subscriber_dob ?? null,
      relationship_to_subscriber: input.relationship_to_subscriber ?? null,
      status: "pending",
      call_id: input.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create insurance intake", { tenantId, error: error.message });
    throw new Error(`Failed to create insurance intake: ${error.message}`);
  }

  logger.info("Insurance intake created", { tenantId, intakeId: data.id });
  return data as InsuranceIntakeRow;
}

/**
 * Record a referral from another provider.
 */
export async function createReferralIntake(
  tenantId: string,
  input: ReferralIntakeInput
): Promise<ReferralIntakeRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("referral_intakes")
    .insert({
      tenant_id: tenantId,
      patient_name: input.patient_name,
      patient_phone: input.patient_phone,
      referring_provider: input.referring_provider ?? null,
      referring_practice: input.referring_practice ?? null,
      referral_reason: input.referral_reason,
      urgency: input.urgency ?? "routine",
      insurance_verified: input.insurance_verified ?? false,
      status: "pending",
      notes: input.notes ?? null,
      call_id: input.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create referral intake", { tenantId, error: error.message });
    throw new Error(`Failed to create referral intake: ${error.message}`);
  }

  logger.info("Referral intake created", { tenantId, intakeId: data.id });
  return data as ReferralIntakeRow;
}

/**
 * Record a prescription refill request.
 */
export async function createRefillRequest(
  tenantId: string,
  input: RefillRequestInput
): Promise<RefillRequestRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("refill_requests")
    .insert({
      tenant_id: tenantId,
      patient_name: input.patient_name,
      patient_phone: input.patient_phone,
      patient_dob: input.patient_dob ?? null,
      medication_name: input.medication_name,
      medication_dosage: input.medication_dosage ?? null,
      pharmacy_name: input.pharmacy_name ?? null,
      pharmacy_phone: input.pharmacy_phone ?? null,
      provider_id: input.provider_id ?? null,
      status: "pending",
      call_id: input.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create refill request", { tenantId, error: error.message });
    throw new Error(`Failed to create refill request: ${error.message}`);
  }

  logger.info("Refill request created", { tenantId, requestId: data.id });
  return data as RefillRequestRow;
}

/**
 * List all pending (unprocessed) intakes across insurance, referral, and refill types.
 */
export async function listPendingIntakes(
  tenantId: string
): Promise<{
  insurance: InsuranceIntakeRow[];
  referrals: ReferralIntakeRow[];
  refills: RefillRequestRow[];
}> {
  const supabase = await createServerClient();

  const [insuranceRes, referralRes, refillRes] = await Promise.all([
    supabase
      .from("insurance_intakes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("referral_intakes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("refill_requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  if (insuranceRes.error) {
    logger.error("Failed to list pending insurance intakes", { tenantId, error: insuranceRes.error.message });
  }
  if (referralRes.error) {
    logger.error("Failed to list pending referral intakes", { tenantId, error: referralRes.error.message });
  }
  if (refillRes.error) {
    logger.error("Failed to list pending refill requests", { tenantId, error: refillRes.error.message });
  }

  return {
    insurance: (insuranceRes.data ?? []) as InsuranceIntakeRow[],
    referrals: (referralRes.data ?? []) as ReferralIntakeRow[],
    refills: (refillRes.data ?? []) as RefillRequestRow[],
  };
}
