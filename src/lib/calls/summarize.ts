import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database/types";

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

interface DimensionScore {
  dimension: string;
  score: number;
}

/**
 * A grounded quality score for the call. Deliberately NOT a model's opinion —
 * every dimension is derived from something that verifiably happened (did the
 * requested action complete, did any tool error, was it escalated, did the
 * call run long enough to be a real conversation), so the number is
 * defensible rather than decorative.
 */
function buildEvaluation(
  toolRuns: ToolRunRow[],
  disposition: string,
  durationSeconds: number | null
): { score: number; dimensions: DimensionScore[]; feedback: string } {
  const failed = toolRuns.filter((r) => r.status === "error");
  const succeeded = toolRuns.filter((r) => r.status === "success");
  const escalated = toolRuns.some((r) => r.tool_name === "transfer_call");

  // Did the caller's request actually get done?
  const taskCompletion =
    disposition === "resolved"
      ? 100
      : disposition === "attempted"
        ? 70
        : disposition === "informational"
          ? 85
          : disposition === "escalated"
            ? 60
            : 35;

  // Did the actions the agent took succeed?
  const toolCorrectness =
    toolRuns.length === 0 ? 85 : Math.round((succeeded.length / toolRuns.length) * 100);

  // Did the conversation run like a real one, or drop instantly?
  const conversationFlow =
    durationSeconds == null ? 75 : durationSeconds < 15 ? 45 : durationSeconds < 30 ? 70 : 95;

  // Handing off when it should, and cleanly.
  const escalationHandling = escalated ? (disposition === "escalated" ? 90 : 75) : 100;

  // Nothing errored / no failed promises to the caller.
  const reliability = failed.length === 0 ? 100 : Math.max(30, 100 - failed.length * 30);

  const dimensions: DimensionScore[] = [
    { dimension: "task_completion", score: taskCompletion },
    { dimension: "tool_correctness", score: toolCorrectness },
    { dimension: "conversation_flow", score: conversationFlow },
    { dimension: "escalation_handling", score: escalationHandling },
    { dimension: "reliability", score: reliability },
  ];

  const score = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );

  const notes: string[] = [];
  if (disposition === "resolved") notes.push("the caller's request was completed");
  else if (disposition === "informational") notes.push("the call was informational with no action needed");
  else if (disposition === "escalated") notes.push("the call was handed to a person");
  else notes.push("the caller's request was not fully completed");
  if (failed.length > 0) notes.push(`${failed.length} action${failed.length === 1 ? "" : "s"} failed`);
  if (toolRuns.length === 0) notes.push("no booking or lookup actions were taken");
  if (durationSeconds != null && durationSeconds < 15) notes.push("the call ended very quickly");

  const feedback = `Automated quality check based on what happened on the call: ${notes.join(", ")}.`;

  return { score, dimensions, feedback };
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
  // call_summaries and call_outcomes are guarded independently so a missing
  // outcome always self-heals on the next reconcile — even if the summary
  // already exists. (A single shared early-return once left outcomes blank
  // when their insert failed after the summary's succeeded.)
  const [{ data: existingSummary }, { data: existingOutcome }, { data: existingEvaluation }] =
    await Promise.all([
      supabase.from("call_summaries").select("id").eq("call_id", callId).maybeSingle(),
      supabase.from("call_outcomes").select("id").eq("call_id", callId).maybeSingle(),
      supabase.from("call_evaluations").select("id").eq("call_id", callId).maybeSingle(),
    ]);
  if (existingSummary && existingOutcome && existingEvaluation) return;

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

  if (!existingSummary) {
    await supabase.from("call_summaries").insert({
      call_id: callId,
      tenant_id: tenantId,
      summary,
      key_points: keyPoints,
      action_items: actionItems,
      sentiment,
      model: ultravoxSummary?.trim() ? "ultravox" : "heuristic-v1",
    });
  }

  if (!existingOutcome) {
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

  if (!existingEvaluation) {
    const evaluation = buildEvaluation(toolRuns, disposition, call?.duration_seconds ?? null);
    await supabase.from("call_evaluations").insert({
      call_id: callId,
      tenant_id: tenantId,
      evaluator: "automated-v1",
      score: evaluation.score,
      max_score: 100,
      criteria: evaluation.dimensions as unknown as Json,
      feedback: evaluation.feedback,
    });
  }
}
