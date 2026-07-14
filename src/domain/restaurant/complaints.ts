import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type ComplaintRow = Database["public"]["Tables"]["restaurant_complaints"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface RecordComplaintInput {
  customer_name: string;
  customer_phone: string;
  complaint_type: string; // "food_quality" | "service" | "wait_time" | "billing" | "other"
  description: string;
  severity?: string; // "low" | "medium" | "high"
  order_id?: string;
  reservation_id?: string;
  call_id?: string;
}

export interface ComplaintFilters {
  status?: string;
  severity?: string;
  complaint_type?: string;
  limit?: number;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Record a customer complaint with details.
 */
export async function recordComplaint(
  tenantId: string,
  complaint: RecordComplaintInput
): Promise<ComplaintRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("restaurant_complaints")
    .insert({
      tenant_id: tenantId,
      customer_name: complaint.customer_name,
      customer_phone: complaint.customer_phone,
      complaint_type: complaint.complaint_type,
      description: complaint.description,
      severity: complaint.severity ?? "medium",
      status: "open",
      order_id: complaint.order_id ?? null,
      reservation_id: complaint.reservation_id ?? null,
      call_id: complaint.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to record complaint", { tenantId, error: error.message });
    throw new Error(`Failed to record complaint: ${error.message}`);
  }

  logger.info("Complaint recorded", {
    tenantId,
    complaintId: data.id,
    type: complaint.complaint_type,
    severity: complaint.severity ?? "medium",
  });

  return data as ComplaintRow;
}

/**
 * List complaints with optional status, severity, and type filters.
 */
export async function listComplaints(
  tenantId: string,
  filters?: ComplaintFilters
): Promise<ComplaintRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("restaurant_complaints")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.severity) {
    query = query.eq("severity", filters.severity);
  }
  if (filters?.complaint_type) {
    query = query.eq("complaint_type", filters.complaint_type);
  }

  query = query.limit(filters?.limit ?? 50);

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to list complaints", { tenantId, error: error.message });
    throw new Error(`Failed to list complaints: ${error.message}`);
  }

  return (data ?? []) as ComplaintRow[];
}
