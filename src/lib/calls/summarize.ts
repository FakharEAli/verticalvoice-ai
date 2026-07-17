import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

interface ToolRunRow {
  tool_name: string;
  status: string;
  output: unknown;
}

const POSITIVE_OUTCOME_KEYS = ["booked", "confirmed", "captured", "submitted", "created"];

function deriveOutcome(toolRuns: ToolRunRow[]): { outcomeType: string; disposition: string } {
  if (toolRuns.length === 0) {
    return { outcomeType: "no_action_taken", disposition: "informational" };
  }

  if (toolRuns.some((r) => r.tool_name === "transfer_call")) {
    return { outcomeType: "escalated_to_human", disposition: "escalated" };
  }

  const successful = toolRuns.filter((r) => r.status === "success");
  const positive = successful.find((r) => {
    const out = r.output as Record<string, unknown> | null;
    return !!out && POSITIVE_OUTCOME_KEYS.some((k) => out[k] === true);
  });
  if (positive) return { outcomeType: positive.tool_name, disposition: "resolved" };
  if (successful.length > 0) {
    return { outcomeType: successful[successful.length - 1].tool_name, disposition: "attempted" };
  }
  return { outcomeType: "action_failed", disposition: "unresolved" };
}

function buildKeyPoints(toolRuns: ToolRunRow[]): string[] {
  return toolRuns.map((r) => {
    const out = r.output as Record<string, unknown> | null;
    const mark = r.status === "success" ? "done" : "failed";
    const detail = out
      ? Object.entries(out)
          .filter(([k]) => k !== "error")
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(", ")
      : "";
    return `[${mark}] ${r.tool_name}${detail ? ` — ${detail}` : ""}`;
  });
}

function buildActionItems(toolRuns: ToolRunRow[]): string[] {
  const items: string[] = [];
  for (const r of toolRuns) {
    const out = r.output as Record<string, unknown> | null;
    if (out?.status === "pending_manual_review" || out?.reason === "pending_manual_review") {
      items.push(`Follow up: ${r.tool_name} needs manual review`);
    }
    if (r.tool_name === "transfer_call" && out?.transferred === false) {
      items.push("Follow up: escalation could not be auto-transferred — call the customer back");
    }
    if (r.status === "error") {
      items.push(`Retry or manually complete: ${r.tool_name} failed during the call`);
    }
  }
  return items;
}

/**
 * Heuristic post-call summarizer — no LLM provider is configured in this
 * project yet (no OPENAI_API_KEY/ANTHROPIC_API_KEY anywhere), so this
 * derives a real, structured summary from what actually happened during
 * the call (call_tool_runs) rather than reading the raw transcript. It's
 * more reliable than an LLM guess for the "what got done" question, though
 * it can't summarize free-form conversation nuance the way an LLM could —
 * dropping in an OPENAI_API_KEY/ANTHROPIC_API_KEY later and swapping this
 * for a transcript-based LLM call is a natural upgrade path.
 */
export async function summarizeCall(
  supabase: SupabaseClient<Database>,
  callId: string,
  tenantId: string,
  ultravoxSummary?: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("call_summaries")
    .select("id")
    .eq("call_id", callId)
    .maybeSingle();
  if (existing) return;

  const { data: call } = await supabase
    .from("calls")
    .select("direction, duration_seconds")
    .eq("id", callId)
    .single();

  const { data: toolRunRows } = await supabase
    .from("call_tool_runs")
    .select("tool_name, status, output")
    .eq("call_id", callId);
  const toolRuns = (toolRunRows ?? []) as ToolRunRow[];

  const { outcomeType, disposition } = deriveOutcome(toolRuns);
  const keyPoints = buildKeyPoints(toolRuns);
  const actionItems = buildActionItems(toolRuns);
  const sentiment =
    disposition === "escalated" || toolRuns.some((r) => r.status === "error") ? "negative" : "neutral";

  const durationText = call?.duration_seconds
    ? `${Math.round(call.duration_seconds / 60)} min`
    : "unknown duration";
  const directionText = call?.direction === "outbound" ? "Outbound call" : "Inbound call";
  // Prefer Ultravox's own conversation summary (it read the whole call) when
  // available; fall back to the tool-run-derived summary otherwise. Either
  // way the key_points / action_items / outcome below stay grounded in what
  // the agent actually *did* (call_tool_runs), not a model's paraphrase.
  const heuristicSummary =
    toolRuns.length > 0
      ? `${directionText}, ${durationText}. ${toolRuns.length} action${
          toolRuns.length === 1 ? "" : "s"
        } taken during the call: ${toolRuns.map((r) => r.tool_name).join(", ")}. Outcome: ${outcomeType.replace(
          /_/g,
          " "
        )}.`
      : `${directionText}, ${durationText}. No structured actions were taken during this call.`;
  const summary = ultravoxSummary?.trim() ? ultravoxSummary.trim() : heuristicSummary;

  await supabase.from("call_summaries").insert({
    call_id: callId,
    tenant_id: tenantId,
    summary,
    key_points: keyPoints,
    action_items: actionItems,
    sentiment,
    model: ultravoxSummary?.trim() ? "ultravox" : "heuristic-v1",
  });

  await supabase.from("call_outcomes").insert({
    call_id: callId,
    tenant_id: tenantId,
    outcome_type: outcomeType,
    disposition,
    notes: actionItems.length > 0 ? actionItems.join("; ") : null,
    follow_up_at:
      actionItems.length > 0 ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    metadata: { tool_run_count: toolRuns.length },
  });
}
