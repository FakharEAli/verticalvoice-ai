import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type ShowingRow = Database["public"]["Tables"]["showings"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface BookShowingInput {
  listing_id: string;
  lead_id?: string;
  agent_id?: string;
  scheduled_at: string; // ISO datetime
  duration_minutes?: number;
  call_id?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SHOWING_DURATION = 30; // minutes

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Book a showing with agent availability check.
 */
export async function bookShowing(
  tenantId: string,
  input: BookShowingInput
): Promise<ShowingRow> {
  const supabase = await createServerClient();
  const duration = input.duration_minutes ?? DEFAULT_SHOWING_DURATION;

  // Verify listing exists and is active
  const { data: listing, error: listErr } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", input.listing_id)
    .eq("tenant_id", tenantId)
    .single();

  if (listErr || !listing) {
    throw new Error("Listing not found");
  }

  if (listing.status !== "active") {
    throw new Error("Listing is not currently active");
  }

  // Check agent availability if agent specified
  if (input.agent_id) {
    const endTime = new Date(
      new Date(input.scheduled_at).getTime() + duration * 60 * 1000
    ).toISOString();

    const { data: conflicts, error: conflictErr } = await supabase
      .from("showings")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("agent_id", input.agent_id)
      .neq("status", "cancelled")
      .lt("scheduled_at", endTime)
      .gte("scheduled_at", input.scheduled_at)
      .limit(1);

    if (conflictErr) {
      logger.error("Failed to check agent availability", { tenantId, error: conflictErr.message });
      throw new Error(`Failed to check agent availability: ${conflictErr.message}`);
    }

    if (conflicts && conflicts.length > 0) {
      throw new Error("Agent is not available at the requested time");
    }
  }

  const { data, error } = await supabase
    .from("showings")
    .insert({
      tenant_id: tenantId,
      listing_id: input.listing_id,
      lead_id: input.lead_id ?? null,
      agent_id: input.agent_id ?? null,
      scheduled_at: input.scheduled_at,
      duration_minutes: duration,
      status: "scheduled",
      call_id: input.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to book showing", { tenantId, error: error.message });
    throw new Error(`Failed to book showing: ${error.message}`);
  }

  logger.info("Showing booked", { tenantId, showingId: data.id, listingId: input.listing_id });
  return data as ShowingRow;
}

/**
 * Reschedule an existing showing.
 */
export async function rescheduleShowing(
  tenantId: string,
  showingId: string,
  newTime: string // ISO datetime
): Promise<ShowingRow> {
  const supabase = await createServerClient();

  const { data: existing, error: findErr } = await supabase
    .from("showings")
    .select("*")
    .eq("id", showingId)
    .eq("tenant_id", tenantId)
    .single();

  if (findErr || !existing) {
    throw new Error("Showing not found");
  }

  if (existing.status === "cancelled") {
    throw new Error("Cannot reschedule a cancelled showing");
  }

  const { data, error } = await supabase
    .from("showings")
    .update({
      scheduled_at: newTime,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", showingId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to reschedule showing", { tenantId, showingId, error: error.message });
    throw new Error(`Failed to reschedule showing: ${error.message}`);
  }

  logger.info("Showing rescheduled", { tenantId, showingId });
  return data as ShowingRow;
}

/**
 * Cancel a showing with a reason.
 */
export async function cancelShowing(
  tenantId: string,
  showingId: string,
  reason?: string
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("showings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
      feedback: reason ? `[CANCELLED: ${reason}]` : null,
    })
    .eq("id", showingId)
    .eq("tenant_id", tenantId);

  if (error) {
    logger.error("Failed to cancel showing", { tenantId, showingId, error: error.message });
    throw new Error(`Failed to cancel showing: ${error.message}`);
  }

  logger.info("Showing cancelled", { tenantId, showingId, reason });
}

/**
 * Get an agent's showing schedule for a specific date.
 */
export async function getAgentSchedule(
  tenantId: string,
  agentId: string,
  date: string // YYYY-MM-DD
): Promise<ShowingRow[]> {
  const supabase = await createServerClient();

  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const { data, error } = await supabase
    .from("showings")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("agent_id", agentId)
    .neq("status", "cancelled")
    .gte("scheduled_at", dayStart)
    .lte("scheduled_at", dayEnd)
    .order("scheduled_at", { ascending: true });

  if (error) {
    logger.error("Failed to get agent schedule", { tenantId, agentId, error: error.message });
    throw new Error(`Failed to get agent schedule: ${error.message}`);
  }

  return (data ?? []) as ShowingRow[];
}
