import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Json } from "@/lib/database/types";

export interface CallFilters {
  status?: string;
  direction?: "inbound" | "outbound";
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;
  pageSize?: number;
}

export interface CallDetail {
  id: string;
  tenant_id: string;
  provider_call_id: string | null;
  direction: string;
  status: string;
  caller_number: string | null;
  called_number: string | null;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
  transcript?: { content: string; segments: Json | null } | null;
  summary?: string | null;
  outcome?: {
    outcome_type: string;
    disposition: string | null;
    notes: string | null;
    metadata: Json | null;
  } | null;
}

export interface CallWebhookEvent {
  event_type: "call.started" | "call.ended" | "call.failed" | "call.recording_ready";
  provider_call_id: string;
  tenant_id: string;
  direction: string;
  caller_number?: string;
  called_number?: string;
  status?: string;
  duration_seconds?: number;
  recording_url?: string;
  ended_at?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordOutcomeInput {
  outcome_type: string;
  disposition?: string;
  notes?: string;
  follow_up_at?: string;
  metadata?: Record<string, unknown>;
}

export async function listCalls(
  tenantId: string,
  filters: CallFilters = {}
): Promise<{ calls: CallDetail[]; total: number }> {
  const supabase = await createServerClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("calls")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("is_test", false)
    .order("started_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.direction) {
    query = query.eq("direction", filters.direction);
  }
  if (filters.from) {
    query = query.gte("started_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("started_at", filters.to);
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error("Failed to list calls", { tenantId, error: error.message });
    throw new Error(`Failed to list calls: ${error.message}`);
  }

  return {
    calls: (data ?? []) as CallDetail[],
    total: count ?? 0,
  };
}

export async function getCall(tenantId: string, callId: string): Promise<CallDetail | null> {
  const supabase = await createServerClient();

  const { data: call, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", callId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    logger.error("Failed to get call", { tenantId, callId, error: error.message });
    return null;
  }

  // Fetch transcript if available
  const { data: transcript } = await supabase
    .from("call_transcripts")
    .select("content, segments")
    .eq("call_id", callId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Fetch outcome if available
  const { data: outcome } = await supabase
    .from("call_outcomes")
    .select("outcome_type, disposition, notes, metadata")
    .eq("call_id", callId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Fetch summary if available
  const { data: summaryRow } = await supabase
    .from("call_summaries")
    .select("summary")
    .eq("call_id", callId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return {
    ...(call as CallDetail),
    transcript: transcript ?? null,
    summary: summaryRow?.summary ?? null,
    outcome: outcome ?? null,
  };
}

export async function getCallTranscript(
  tenantId: string,
  callId: string
): Promise<{ content: string; segments: Json | null } | null> {
  const supabase = await createServerClient();

  // Verify call belongs to tenant
  const { error: callError } = await supabase
    .from("calls")
    .select("id")
    .eq("id", callId)
    .eq("tenant_id", tenantId)
    .single();

  if (callError) {
    throw new Error("Call not found for this tenant");
  }

  const { data, error } = await supabase
    .from("call_transcripts")
    .select("content, segments")
    .eq("call_id", callId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to get call transcript", { callId, error: error.message });
    throw new Error(`Failed to get transcript: ${error.message}`);
  }

  return data ?? null;
}

export async function getCallRecording(
  tenantId: string,
  callId: string
): Promise<string | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("calls")
    .select("recording_url")
    .eq("id", callId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    logger.error("Failed to get call recording", { tenantId, callId, error: error.message });
    return null;
  }

  return data.recording_url;
}

export async function processCallWebhook(event: CallWebhookEvent): Promise<void> {
  const supabase = await createServerClient();

  logger.info("Processing call webhook", {
    eventType: event.event_type,
    providerCallId: event.provider_call_id,
    tenantId: event.tenant_id,
  });

  switch (event.event_type) {
    case "call.started": {
      const { error } = await supabase.from("calls").insert({
        tenant_id: event.tenant_id,
        provider_call_id: event.provider_call_id,
        direction: event.direction,
        status: "in_progress",
        caller_number: event.caller_number ?? null,
        called_number: event.called_number ?? null,
        started_at: new Date().toISOString(),
      });

      if (error) {
        logger.error("Failed to create call from webhook", { error: error.message });
        throw new Error(`Failed to create call: ${error.message}`);
      }
      break;
    }

    case "call.ended": {
      const { error } = await supabase
        .from("calls")
        .update({
          status: "completed",
          duration_seconds: event.duration_seconds ?? null,
          ended_at: event.ended_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("provider_call_id", event.provider_call_id)
        .eq("tenant_id", event.tenant_id);

      if (error) {
        logger.error("Failed to update call from webhook", { error: error.message });
        throw new Error(`Failed to update call: ${error.message}`);
      }
      break;
    }

    case "call.failed": {
      const { error } = await supabase
        .from("calls")
        .update({
          status: "failed",
          ended_at: event.ended_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("provider_call_id", event.provider_call_id)
        .eq("tenant_id", event.tenant_id);

      if (error) {
        logger.error("Failed to mark call as failed", { error: error.message });
        throw new Error(`Failed to update call: ${error.message}`);
      }
      break;
    }

    case "call.recording_ready": {
      const { error } = await supabase
        .from("calls")
        .update({
          recording_url: event.recording_url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_call_id", event.provider_call_id)
        .eq("tenant_id", event.tenant_id);

      if (error) {
        logger.error("Failed to save recording URL", { error: error.message });
        throw new Error(`Failed to save recording: ${error.message}`);
      }
      break;
    }

    default:
      logger.warn("Unknown call webhook event type", { eventType: event.event_type });
  }
}

export async function recordCallOutcome(
  callId: string,
  tenantId: string,
  outcome: RecordOutcomeInput
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase.from("call_outcomes").upsert(
    {
      call_id: callId,
      tenant_id: tenantId,
      outcome_type: outcome.outcome_type,
      disposition: outcome.disposition ?? null,
      notes: outcome.notes ?? null,
      follow_up_at: outcome.follow_up_at ?? null,
      metadata: (outcome.metadata ?? {}) as Json,
    },
    { onConflict: "call_id" }
  );

  if (error) {
    logger.error("Failed to record call outcome", { callId, error: error.message });
    throw new Error(`Failed to record outcome: ${error.message}`);
  }

  logger.info("Call outcome recorded", { callId, outcomeType: outcome.outcome_type });
}

export async function deleteCall(tenantId: string, callId: string): Promise<void> {
  const supabase = await createServerClient();

  // Soft delete: set status to 'deleted'
  const { error } = await supabase
    .from("calls")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("tenant_id", tenantId);

  if (error) {
    logger.error("Failed to delete call", { tenantId, callId, error: error.message });
    throw new Error(`Failed to delete call: ${error.message}`);
  }

  // Audit trail
  const { error: auditError } = await supabase.from("audit_events").insert({
    tenant_id: tenantId,
    action: "call.deleted",
    resource_type: "call",
    resource_id: callId,
  });

  if (auditError) {
    logger.warn("Failed to write audit event for call deletion", { callId, error: auditError.message });
  }

  logger.info("Call soft-deleted", { tenantId, callId });
}
