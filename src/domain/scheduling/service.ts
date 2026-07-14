import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";

// Uses the "appointments" table from the DB schema

export interface AvailabilityParams {
  date: string; // ISO date (YYYY-MM-DD)
  duration_minutes?: number;
  provider_id?: string; // optional healthcare provider filter
}

export interface TimeSlot {
  start: string; // ISO datetime
  end: string;
  available: boolean;
}

export interface CreateBookingInput {
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  patient_dob?: string;
  scheduled_at: string; // ISO datetime
  duration_minutes?: number;
  appointment_type_id?: string;
  provider_id?: string;
  reason?: string;
  notes?: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  call_id: string | null;
  provider_id: string | null;
  appointment_type_id: string | null;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  patient_dob: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  reason: string | null;
  notes: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function checkAvailability(
  tenantId: string,
  params: AvailabilityParams
): Promise<TimeSlot[]> {
  const supabase = await createServerClient();
  const durationMinutes = params.duration_minutes ?? 30;

  // Default business hours 9-17
  const dayStart = `${params.date}T09:00:00`;
  const dayEnd = `${params.date}T17:00:00`;

  // Fetch existing appointments for the day
  let query = supabase
    .from("appointments")
    .select("scheduled_at, duration_minutes")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("scheduled_at", dayStart)
    .lte("scheduled_at", dayEnd);

  if (params.provider_id) {
    query = query.eq("provider_id", params.provider_id);
  }

  const { data: existing, error } = await query;

  if (error) {
    logger.error("Failed to check availability", { tenantId, error: error.message });
    throw new Error(`Failed to check availability: ${error.message}`);
  }

  const bookedSlots = (existing ?? []).map((b) => {
    const start = new Date(b.scheduled_at).getTime();
    return {
      start,
      end: start + b.duration_minutes * 60 * 1000,
    };
  });

  // Generate slots in increments of the requested duration
  const slots: TimeSlot[] = [];
  const slotMs = durationMinutes * 60 * 1000;
  let cursor = new Date(dayStart).getTime();
  const endMs = new Date(dayEnd).getTime();

  while (cursor + slotMs <= endMs) {
    const slotStart = cursor;
    const slotEnd = cursor + slotMs;

    const overlaps = bookedSlots.some(
      (b) => slotStart < b.end && slotEnd > b.start
    );

    slots.push({
      start: new Date(slotStart).toISOString(),
      end: new Date(slotEnd).toISOString(),
      available: !overlaps,
    });

    cursor += slotMs;
  }

  return slots;
}

export async function createBooking(
  tenantId: string,
  booking: CreateBookingInput
): Promise<Booking> {
  const supabase = await createServerClient();
  const durationMinutes = booking.duration_minutes ?? 30;

  const endTime = new Date(
    new Date(booking.scheduled_at).getTime() + durationMinutes * 60 * 1000
  ).toISOString();

  // Verify the slot is not already taken
  const { data: conflicts, error: conflictError } = await supabase
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .lt("scheduled_at", endTime)
    .gte("scheduled_at", booking.scheduled_at)
    .limit(1);

  if (conflictError) {
    logger.error("Failed to check booking conflicts", { tenantId, error: conflictError.message });
    throw new Error(`Failed to verify slot availability: ${conflictError.message}`);
  }

  if (conflicts && conflicts.length > 0) {
    throw new Error("Requested time slot is no longer available");
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      patient_name: booking.patient_name,
      patient_phone: booking.patient_phone,
      patient_email: booking.patient_email ?? null,
      patient_dob: booking.patient_dob ?? null,
      scheduled_at: booking.scheduled_at,
      duration_minutes: durationMinutes,
      appointment_type_id: booking.appointment_type_id ?? null,
      provider_id: booking.provider_id ?? null,
      status: "scheduled",
      reason: booking.reason ?? null,
      notes: booking.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create booking", { tenantId, error: error.message });
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  logger.info("Booking created", { tenantId, bookingId: data.id });
  return data as Booking;
}

export async function rescheduleBooking(
  tenantId: string,
  bookingId: string,
  newTime: { scheduled_at: string; duration_minutes?: number }
): Promise<Booking> {
  const supabase = await createServerClient();

  // Verify booking exists and belongs to tenant
  const { data: existing, error: findError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .single();

  if (findError || !existing) {
    throw new Error("Booking not found for this tenant");
  }

  if (existing.status === "cancelled") {
    throw new Error("Cannot reschedule a cancelled booking");
  }

  const durationMinutes = newTime.duration_minutes ?? existing.duration_minutes;

  const { data, error } = await supabase
    .from("appointments")
    .update({
      scheduled_at: newTime.scheduled_at,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to reschedule booking", { tenantId, bookingId, error: error.message });
    throw new Error(`Failed to reschedule booking: ${error.message}`);
  }

  logger.info("Booking rescheduled", { tenantId, bookingId });
  return data as Booking;
}

export async function cancelBooking(
  tenantId: string,
  bookingId: string,
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
    .eq("id", bookingId)
    .eq("tenant_id", tenantId);

  if (error) {
    logger.error("Failed to cancel booking", { tenantId, bookingId, error: error.message });
    throw new Error(`Failed to cancel booking: ${error.message}`);
  }

  logger.info("Booking cancelled", { tenantId, bookingId, reason });
}

export async function getUpcomingBookings(tenantId: string): Promise<Booking[]> {
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) {
    logger.error("Failed to get upcoming bookings", { tenantId, error: error.message });
    throw new Error(`Failed to get upcoming bookings: ${error.message}`);
  }

  return (data ?? []) as Booking[];
}
