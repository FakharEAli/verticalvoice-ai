import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type TableRow = Database["public"]["Tables"]["restaurant_tables"]["Row"];

// ─── Constants ───────────────────────────────────────────────────────────────

const LARGE_PARTY_THRESHOLD = 8;
const DEFAULT_RESERVATION_DURATION = 90; // minutes

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateReservationInput {
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  party_size: number;
  scheduled_at: string; // ISO datetime
  duration_minutes?: number;
  special_requests?: string;
  location_id?: string;
  call_id?: string;
}

export interface ModifyReservationInput {
  scheduled_at?: string;
  party_size?: number;
  special_requests?: string;
  duration_minutes?: number;
}

export interface WaitlistEntry {
  guest_name: string;
  guest_phone: string;
  party_size: number;
  estimated_wait_minutes?: number;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Create a reservation with party size validation and table assignment.
 */
export async function createReservation(
  tenantId: string,
  input: CreateReservationInput
): Promise<ReservationRow> {
  const supabase = await createServerClient();

  if (input.party_size < 1) {
    throw new Error("Party size must be at least 1");
  }

  if (input.party_size > LARGE_PARTY_THRESHOLD) {
    logger.info("Large party reservation flagged for staff review", {
      tenantId,
      partySize: input.party_size,
    });
  }

  const duration = input.duration_minutes ?? DEFAULT_RESERVATION_DURATION;

  // Try to find an available table
  const table = await findAvailableTable(
    tenantId,
    input.scheduled_at,
    duration,
    input.party_size,
    input.location_id
  );

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      tenant_id: tenantId,
      guest_name: input.guest_name,
      guest_phone: input.guest_phone,
      guest_email: input.guest_email ?? null,
      party_size: input.party_size,
      scheduled_at: input.scheduled_at,
      duration_minutes: duration,
      status: "confirmed",
      special_requests: input.special_requests ?? null,
      table_id: table?.id ?? null,
      location_id: input.location_id ?? null,
      call_id: input.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create reservation", { tenantId, error: error.message });
    throw new Error(`Failed to create reservation: ${error.message}`);
  }

  logger.info("Reservation created", { tenantId, reservationId: data.id, tableId: table?.id ?? null });
  return data as ReservationRow;
}

/**
 * Modify an existing reservation (time, party size, or special requests).
 */
export async function modifyReservation(
  tenantId: string,
  reservationId: string,
  changes: ModifyReservationInput
): Promise<ReservationRow> {
  const supabase = await createServerClient();

  const { data: existing, error: findErr } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .eq("tenant_id", tenantId)
    .single();

  if (findErr || !existing) {
    throw new Error("Reservation not found");
  }

  if (existing.status === "cancelled") {
    throw new Error("Cannot modify a cancelled reservation");
  }

  if (changes.party_size !== undefined && changes.party_size < 1) {
    throw new Error("Party size must be at least 1");
  }

  const { data, error } = await supabase
    .from("reservations")
    .update({
      updated_at: new Date().toISOString(),
      ...(changes.scheduled_at !== undefined && { scheduled_at: changes.scheduled_at }),
      ...(changes.party_size !== undefined && { party_size: changes.party_size }),
      ...(changes.special_requests !== undefined && { special_requests: changes.special_requests }),
      ...(changes.duration_minutes !== undefined && { duration_minutes: changes.duration_minutes }),
    })
    .eq("id", reservationId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to modify reservation", { tenantId, reservationId, error: error.message });
    throw new Error(`Failed to modify reservation: ${error.message}`);
  }

  logger.info("Reservation modified", { tenantId, reservationId });
  return data as ReservationRow;
}

/**
 * Cancel a reservation with an optional reason.
 */
export async function cancelReservation(
  tenantId: string,
  reservationId: string,
  reason?: string
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(reason && { special_requests: `[CANCELLATION: ${reason}]` }),
    })
    .eq("id", reservationId)
    .eq("tenant_id", tenantId);

  if (error) {
    logger.error("Failed to cancel reservation", { tenantId, reservationId, error: error.message });
    throw new Error(`Failed to cancel reservation: ${error.message}`);
  }

  logger.info("Reservation cancelled", { tenantId, reservationId, reason });
}

/**
 * Check table availability for a given date, time, and party size.
 */
export async function checkTableAvailability(
  tenantId: string,
  date: string,
  time: string,
  partySize: number
): Promise<TableRow[]> {
  const supabase = await createServerClient();

  const scheduledAt = `${date}T${time}`;
  const endTime = new Date(
    new Date(scheduledAt).getTime() + DEFAULT_RESERVATION_DURATION * 60 * 1000
  ).toISOString();

  // Get all active tables that fit the party
  const { data: tables, error: tableErr } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .gte("capacity", partySize)
    .order("capacity", { ascending: true });

  if (tableErr) {
    logger.error("Failed to fetch tables", { tenantId, error: tableErr.message });
    throw new Error(`Failed to fetch tables: ${tableErr.message}`);
  }

  if (!tables || tables.length === 0) {
    return [];
  }

  // Get reservations that overlap with the requested time
  const { data: reservations, error: resErr } = await supabase
    .from("reservations")
    .select("table_id")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .lt("scheduled_at", endTime)
    .not("table_id", "is", null);

  if (resErr) {
    logger.error("Failed to check reservation conflicts", { tenantId, error: resErr.message });
    throw new Error(`Failed to check reservation conflicts: ${resErr.message}`);
  }

  const occupiedTableIds = new Set(
    (reservations ?? []).map((r) => r.table_id).filter(Boolean)
  );

  return (tables as TableRow[]).filter((t) => !occupiedTableIds.has(t.id));
}

/**
 * Add a walk-in guest to the waitlist (stored as a pending reservation).
 */
export async function addToWaitlist(
  tenantId: string,
  entry: WaitlistEntry
): Promise<ReservationRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      tenant_id: tenantId,
      guest_name: entry.guest_name,
      guest_phone: entry.guest_phone,
      party_size: entry.party_size,
      scheduled_at: new Date().toISOString(),
      duration_minutes: DEFAULT_RESERVATION_DURATION,
      status: "waitlisted",
      special_requests: entry.estimated_wait_minutes
        ? `Estimated wait: ${entry.estimated_wait_minutes} min`
        : null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to add to waitlist", { tenantId, error: error.message });
    throw new Error(`Failed to add to waitlist: ${error.message}`);
  }

  logger.info("Guest added to waitlist", { tenantId, reservationId: data.id });
  return data as ReservationRow;
}

/**
 * Flag a large party for staff routing. Returns whether the party exceeds the threshold.
 */
export function handleLargeParty(
  tenantId: string,
  partySize: number
): { is_large_party: boolean; threshold: number; needs_staff_review: boolean } {
  const isLarge = partySize > LARGE_PARTY_THRESHOLD;

  if (isLarge) {
    logger.info("Large party detected, routing to staff", { tenantId, partySize });
  }

  return {
    is_large_party: isLarge,
    threshold: LARGE_PARTY_THRESHOLD,
    needs_staff_review: isLarge,
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

async function findAvailableTable(
  tenantId: string,
  scheduledAt: string,
  durationMinutes: number,
  partySize: number,
  locationId?: string
): Promise<TableRow | null> {
  const supabase = await createServerClient();

  let tableQuery = supabase
    .from("restaurant_tables")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .gte("capacity", partySize)
    .order("capacity", { ascending: true });

  if (locationId) {
    tableQuery = tableQuery.eq("location_id", locationId);
  }

  const { data: tables, error: tableErr } = await tableQuery;

  if (tableErr || !tables || tables.length === 0) {
    return null;
  }

  const endTime = new Date(
    new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000
  ).toISOString();

  const { data: conflicts } = await supabase
    .from("reservations")
    .select("table_id")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .lt("scheduled_at", endTime)
    .not("table_id", "is", null);

  const occupiedIds = new Set(
    (conflicts ?? []).map((c) => c.table_id).filter(Boolean)
  );

  return (tables as TableRow[]).find((t) => !occupiedIds.has(t.id)) ?? null;
}
