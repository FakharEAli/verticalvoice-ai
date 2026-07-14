import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type WaitlistRow = Database["public"]["Tables"]["waitlist_entries"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface AddToWaitlistInput {
  patient_name: string;
  patient_phone: string;
  provider_id?: string;
  appointment_type_id?: string;
  preferred_dates?: string[]; // ISO date strings
  priority?: number;
  notes?: string;
  call_id?: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Add a patient to the waitlist for a cancelled or unavailable slot.
 */
export async function addToWaitlist(
  tenantId: string,
  entry: AddToWaitlistInput
): Promise<WaitlistRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("waitlist_entries")
    .insert({
      tenant_id: tenantId,
      patient_name: entry.patient_name,
      patient_phone: entry.patient_phone,
      provider_id: entry.provider_id ?? null,
      appointment_type_id: entry.appointment_type_id ?? null,
      preferred_dates: entry.preferred_dates ?? null,
      priority: entry.priority ?? 5,
      status: "waiting",
      notes: entry.notes ?? null,
      call_id: entry.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to add to waitlist", { tenantId, error: error.message });
    throw new Error(`Failed to add to waitlist: ${error.message}`);
  }

  logger.info("Patient added to waitlist", { tenantId, waitlistId: data.id });
  return data as WaitlistRow;
}

/**
 * Attempt to fill a cancelled appointment slot from the waitlist.
 * Finds the highest-priority waiting entry that matches the appointment's
 * provider/type and marks it as notified.
 */
export async function fillCanceledSlot(
  tenantId: string,
  appointmentId: string
): Promise<WaitlistRow | null> {
  const supabase = await createServerClient();

  // Get the cancelled appointment details
  const { data: appointment, error: apptErr } = await supabase
    .from("appointments")
    .select("provider_id, appointment_type_id")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  if (apptErr || !appointment) {
    logger.warn("Appointment not found for waitlist fill", { tenantId, appointmentId });
    return null;
  }

  // Find the best matching waitlist entry
  let query = supabase
    .from("waitlist_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "waiting")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (appointment.provider_id) {
    query = query.eq("provider_id", appointment.provider_id);
  }
  if (appointment.appointment_type_id) {
    query = query.eq("appointment_type_id", appointment.appointment_type_id);
  }

  const { data: candidates, error: waitErr } = await query;

  if (waitErr) {
    logger.error("Failed to query waitlist", { tenantId, error: waitErr.message });
    throw new Error(`Failed to query waitlist: ${waitErr.message}`);
  }

  if (!candidates || candidates.length === 0) {
    logger.info("No waitlist candidates found for slot", { tenantId, appointmentId });
    return null;
  }

  const candidate = candidates[0] as WaitlistRow;

  // Mark as notified
  const { data: updated, error: updateErr } = await supabase
    .from("waitlist_entries")
    .update({
      status: "notified",
      notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (updateErr) {
    logger.error("Failed to update waitlist entry", { tenantId, error: updateErr.message });
    throw new Error(`Failed to update waitlist entry: ${updateErr.message}`);
  }

  logger.info("Waitlist candidate notified for slot", {
    tenantId,
    waitlistId: candidate.id,
    appointmentId,
  });

  return updated as WaitlistRow;
}

/**
 * Get the current waitlist for a tenant.
 */
export async function getWaitlist(tenantId: string): Promise<WaitlistRow[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "waiting")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Failed to get waitlist", { tenantId, error: error.message });
    throw new Error(`Failed to get waitlist: ${error.message}`);
  }

  return (data ?? []) as WaitlistRow[];
}
