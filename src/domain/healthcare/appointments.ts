import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface BookAppointmentInput {
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  patient_dob?: string;
  provider_id?: string;
  appointment_type_id?: string;
  scheduled_at: string; // ISO datetime
  duration_minutes?: number;
  reason?: string;
  notes?: string;
  call_id?: string;
}

export interface RescheduleInput {
  scheduled_at: string;
  duration_minutes?: number;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Book a new healthcare appointment with provider, type, and slot validation.
 */
export async function bookAppointment(
  tenantId: string,
  input: BookAppointmentInput
): Promise<AppointmentRow> {
  const supabase = await createServerClient();

  // Validate appointment type if provided
  let durationMinutes = input.duration_minutes ?? 30;
  if (input.appointment_type_id) {
    const { data: apptType, error: typeErr } = await supabase
      .from("appointment_types")
      .select("*")
      .eq("id", input.appointment_type_id)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    if (typeErr || !apptType) {
      throw new Error("Invalid or inactive appointment type");
    }
    durationMinutes = input.duration_minutes ?? apptType.duration_minutes;
  }

  // Validate provider exists and is active if provided
  if (input.provider_id) {
    const { data: provider, error: provErr } = await supabase
      .from("healthcare_providers")
      .select("id")
      .eq("id", input.provider_id)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    if (provErr || !provider) {
      throw new Error("Invalid or inactive provider");
    }
  }

  // Check for slot conflicts
  const endTime = new Date(
    new Date(input.scheduled_at).getTime() + durationMinutes * 60 * 1000
  ).toISOString();

  let conflictQuery = supabase
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .lt("scheduled_at", endTime)
    .gte("scheduled_at", input.scheduled_at);

  if (input.provider_id) {
    conflictQuery = conflictQuery.eq("provider_id", input.provider_id);
  }

  const { data: conflicts, error: conflictErr } = await conflictQuery.limit(1);

  if (conflictErr) {
    logger.error("Failed to check appointment conflicts", { tenantId, error: conflictErr.message });
    throw new Error(`Failed to verify slot availability: ${conflictErr.message}`);
  }

  if (conflicts && conflicts.length > 0) {
    throw new Error("Requested time slot is no longer available");
  }

  // Insert appointment
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      patient_name: input.patient_name,
      patient_phone: input.patient_phone,
      patient_email: input.patient_email ?? null,
      patient_dob: input.patient_dob ?? null,
      provider_id: input.provider_id ?? null,
      appointment_type_id: input.appointment_type_id ?? null,
      scheduled_at: input.scheduled_at,
      duration_minutes: durationMinutes,
      status: "scheduled",
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      call_id: input.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to book appointment", { tenantId, error: error.message });
    throw new Error(`Failed to book appointment: ${error.message}`);
  }

  logger.info("Appointment booked", { tenantId, appointmentId: data.id });
  return data as AppointmentRow;
}

/**
 * Reschedule an existing appointment to a new time slot.
 */
export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  newSlot: RescheduleInput
): Promise<AppointmentRow> {
  const supabase = await createServerClient();

  const { data: existing, error: findErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  if (findErr || !existing) {
    throw new Error("Appointment not found for this tenant");
  }

  if (existing.status === "cancelled") {
    throw new Error("Cannot reschedule a cancelled appointment");
  }

  const durationMinutes = newSlot.duration_minutes ?? existing.duration_minutes;

  const { data, error } = await supabase
    .from("appointments")
    .update({
      scheduled_at: newSlot.scheduled_at,
      duration_minutes: durationMinutes,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to reschedule appointment", { tenantId, appointmentId, error: error.message });
    throw new Error(`Failed to reschedule appointment: ${error.message}`);
  }

  logger.info("Appointment rescheduled", { tenantId, appointmentId });
  return data as AppointmentRow;
}

/**
 * Cancel an appointment with a reason.
 */
export async function cancelAppointment(
  tenantId: string,
  appointmentId: string,
  reason: string
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (error) {
    logger.error("Failed to cancel appointment", { tenantId, appointmentId, error: error.message });
    throw new Error(`Failed to cancel appointment: ${error.message}`);
  }

  logger.info("Appointment cancelled", { tenantId, appointmentId, reason });
}

/**
 * Confirm an appointment.
 */
export async function confirmAppointment(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to confirm appointment", { tenantId, appointmentId, error: error.message });
    throw new Error(`Failed to confirm appointment: ${error.message}`);
  }

  logger.info("Appointment confirmed", { tenantId, appointmentId });
  return data as AppointmentRow;
}

/**
 * Get available time slots for a provider on a specific date.
 */
export async function getProviderAvailability(
  tenantId: string,
  providerId: string,
  date: string // YYYY-MM-DD
): Promise<{ start: string; end: string; available: boolean }[]> {
  const supabase = await createServerClient();
  const durationMinutes = 30;

  const dayStart = `${date}T09:00:00`;
  const dayEnd = `${date}T17:00:00`;

  const { data: existing, error } = await supabase
    .from("appointments")
    .select("scheduled_at, duration_minutes")
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .neq("status", "cancelled")
    .gte("scheduled_at", dayStart)
    .lte("scheduled_at", dayEnd);

  if (error) {
    logger.error("Failed to check provider availability", { tenantId, providerId, error: error.message });
    throw new Error(`Failed to check provider availability: ${error.message}`);
  }

  const bookedSlots = (existing ?? []).map((b) => {
    const start = new Date(b.scheduled_at).getTime();
    return { start, end: start + b.duration_minutes * 60 * 1000 };
  });

  const slots: { start: string; end: string; available: boolean }[] = [];
  const slotMs = durationMinutes * 60 * 1000;
  let cursor = new Date(dayStart).getTime();
  const endMs = new Date(dayEnd).getTime();

  while (cursor + slotMs <= endMs) {
    const slotStart = cursor;
    const slotEnd = cursor + slotMs;
    const overlaps = bookedSlots.some((b) => slotStart < b.end && slotEnd > b.start);

    slots.push({
      start: new Date(slotStart).toISOString(),
      end: new Date(slotEnd).toISOString(),
      available: !overlaps,
    });
    cursor += slotMs;
  }

  return slots;
}

/**
 * List upcoming appointments for a patient by phone number.
 */
export async function listUpcoming(
  tenantId: string,
  patientPhone: string
): Promise<AppointmentRow[]> {
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("patient_phone", patientPhone)
    .neq("status", "cancelled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) {
    logger.error("Failed to list upcoming appointments", { tenantId, error: error.message });
    throw new Error(`Failed to list upcoming appointments: ${error.message}`);
  }

  return (data ?? []) as AppointmentRow[];
}
