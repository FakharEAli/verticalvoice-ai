import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database/types";
import { summarizeCall } from "./summarize";
import { computeCallCost } from "./cost";
import { captureContactFromCall } from "@/lib/contacts/capture";

const UV_BASE = process.env.ULTRAVOX_BASE_URL ?? "https://api.ultravox.ai/api";

interface UltravoxCall {
  created?: string;
  ended?: string | null;
  endReason?: string | null;
  recordingEnabled?: boolean;
  summary?: string | null;
  shortSummary?: string | null;
}

interface UltravoxMessage {
  role?: string;
  text?: string;
  medium?: string;
}

interface ReconcilableCall {
  id: string;
  tenant_id: string;
  ultravox_call_id: string;
  status: string;
  recording_url: string | null;
  direction?: string | null;
  caller_number?: string | null;
  called_number?: string | null;
}

function uvGet(path: string): Promise<Response> {
  const key = process.env.ULTRAVOX_API_KEY;
  if (!key) throw new Error("ULTRAVOX_API_KEY is not configured");
  return fetch(`${UV_BASE}${path}`, { headers: { "X-API-Key": key } });
}

/** Duration from Ultravox's created/ended timestamps — billedDuration is 0s on free tiers. */
function computeDurationSeconds(created?: string, ended?: string | null): number | null {
  if (!created || !ended) return null;
  const ms = new Date(ended).getTime() - new Date(created).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 1000);
}

async function buildTranscript(
  uvCallId: string
): Promise<{ content: string; segments: Json } | null> {
  const res = await uvGet(`/calls/${uvCallId}/messages`);
  if (!res.ok) return null;
  const body = (await res.json()) as { results?: UltravoxMessage[] };
  const results = body.results ?? [];

  const lines: string[] = [];
  for (const m of results) {
    const text = (m.text ?? "").trim();
    if (!text) continue;
    if (m.role === "MESSAGE_ROLE_AGENT") {
      lines.push(`Agent: ${text}`);
    } else if (m.role === "MESSAGE_ROLE_USER" && m.medium === "MESSAGE_MEDIUM_VOICE") {
      // Spoken caller turns only — skips the "(New Call)" system injection,
      // which arrives as a USER message with medium TEXT.
      lines.push(`Caller: ${text}`);
    }
  }

  if (lines.length === 0) return null;
  return { content: lines.join("\n\n"), segments: results as unknown as Json };
}

/**
 * Pulls the authoritative post-call data from Ultravox for one call and
 * writes it into our tables: flips status→completed with the real duration,
 * saves the transcript, points recording_url at our proxy, and generates the
 * summary/outcome (preferring Ultravox's own conversation summary). Fully
 * idempotent — safe to run repeatedly by the cron reconciler.
 */
export async function reconcileCall(
  supabase: SupabaseClient<Database>,
  call: ReconcilableCall
): Promise<{ updated: boolean; reason?: string }> {
  const res = await uvGet(`/calls/${call.ultravox_call_id}`);
  if (!res.ok) return { updated: false, reason: `uv_${res.status}` };
  const uv = (await res.json()) as UltravoxCall;

  // Still in progress — leave it for a later poll.
  if (!uv.ended) return { updated: false, reason: "not_ended" };

  const update: Database["public"]["Tables"]["calls"]["Update"] = {
    status: "completed",
    ended_at: uv.ended,
    duration_seconds: computeDurationSeconds(uv.created, uv.ended),
    updated_at: new Date().toISOString(),
  };
  // A stable internal path — the recording route resolves the ephemeral
  // Ultravox signed URL fresh on each play, so this never expires.
  if (uv.recordingEnabled && !call.recording_url) {
    update.recording_url = `/api/v1/calls/${call.id}/recording`;
  }
  await supabase.from("calls").update(update).eq("id", call.id);

  // Transcript (idempotent).
  const { data: existingTranscript } = await supabase
    .from("call_transcripts")
    .select("id")
    .eq("call_id", call.id)
    .maybeSingle();
  if (!existingTranscript) {
    const transcript = await buildTranscript(call.ultravox_call_id);
    if (transcript) {
      await supabase.from("call_transcripts").insert({
        call_id: call.id,
        tenant_id: call.tenant_id,
        content: transcript.content,
        segments: transcript.segments,
      });
    }
  }

  // Cost. The rates lived only in src/workers/call-normalizer, which nothing
  // invokes, so real calls were never costed and every call detail page read
  // "N/A" while seeded demo calls showed figures. Upsert keyed on call_id so a
  // repeated sweep re-states the same row rather than charging twice.
  const cost = computeCallCost(update.duration_seconds);
  if (cost) {
    const { error: costError } = await supabase
      .from("call_costs")
      .upsert({ call_id: call.id, tenant_id: call.tenant_id, ...cost }, { onConflict: "call_id" });
    // This return value used to be discarded. The upsert was failing on every
    // call — ON CONFLICT (call_id) needs a matching unique index, which the
    // table did not have until migration 015 — and nothing surfaced it, so the
    // cost simply never appeared and the UI waited forever.
    if (costError) {
      console.error(
        `[reconcile] failed to write cost for call ${call.id}: ${costError.message}`
      );
    }
  }

  // Summary + outcome (summarizeCall is itself idempotent).
  await summarizeCall(
    supabase,
    call.id,
    call.tenant_id,
    uv.summary ?? uv.shortSummary ?? undefined
  );

  // Add the other party to the tenant's contact book. Inbound = whoever rang
  // us; outbound = whoever we rang. Browser/soft-client identities are dropped
  // inside the helper, and it never throws.
  const otherParty = call.direction === "outbound" ? call.called_number : call.caller_number;
  await captureContactFromCall(supabase, {
    tenantId: call.tenant_id,
    phone: otherParty,
    direction: call.direction ?? "inbound",
    callId: call.id,
    occurredAt: uv.ended ?? undefined,
  });

  return { updated: true };
}

/**
 * Sweeps calls that Ultravox has (an ultravox_call_id) but that we haven't
 * finalized yet — non-terminal status, or completed-but-missing-recording as
 * a catch-up for any partial write. Called by the cron reconciler.
 */
export async function reconcileActiveCalls(
  supabase: SupabaseClient<Database>,
  tenantId?: string
): Promise<{ checked: number; updated: number }> {
  // Seven days, not six hours. The filter below keeps only calls actually
  // missing derived data, so a wider window costs nothing on a healthy system
  // but lets a backfill reach calls that completed before a feature shipped —
  // which is exactly how costs ended up permanently absent.
  const backfillWindowStart = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Fail calls stranded in a non-terminal state that never got an
  // ultravox_call_id. These bailed before the bridge (e.g. Ultravox 402
  // "set up your subscription", or a thrown webhook), so the join URL — and
  // thus the ultravox_call_id — was never written. Every reconcile path below
  // keys off ultravox_call_id, so without this they sit at 'ringing' forever,
  // which is exactly what makes the Test Center look like calls "aren't
  // working". A 2-minute grace window avoids racing a call that is genuinely
  // still mid-setup.
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const staleQuery = supabase
    .from("calls")
    .update({
      status: "failed",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .is("ultravox_call_id", null)
    .in("status", ["ringing", "initiated", "initiating", "in_progress"])
    .lt("started_at", staleBefore);
  if (tenantId) staleQuery.eq("tenant_id", tenantId);
  try {
    await staleQuery;
  } catch {
    // Non-fatal housekeeping — never block the main reconcile sweep.
  }

  const activeQuery = supabase
    .from("calls")
    .select("id, tenant_id, ultravox_call_id, status, recording_url, direction, caller_number, called_number")
    .not("ultravox_call_id", "is", null)
    .in("status", ["ringing", "initiated", "initiating", "in_progress"])
    .limit(200);
  // Recently-completed calls that might still be missing post-call data
  // (recording, transcript, summary, or outcome) — we filter to the ones
  // actually missing something below, so nothing is re-hit needlessly.
  const completedQuery = supabase
    .from("calls")
    .select("id, tenant_id, ultravox_call_id, status, recording_url, direction, caller_number, called_number")
    .not("ultravox_call_id", "is", null)
    .eq("status", "completed")
    .gte("started_at", backfillWindowStart)
    .limit(200);

  if (tenantId) {
    activeQuery.eq("tenant_id", tenantId);
    completedQuery.eq("tenant_id", tenantId);
  }

  const [{ data: active }, { data: recentCompleted }] = await Promise.all([
    activeQuery,
    completedQuery,
  ]);

  // Keep only completed calls actually missing summary OR outcome OR recording.
  const completed = (recentCompleted ?? []).filter((c) => c.ultravox_call_id);
  const completedIds = completed.map((c) => c.id);
  let needsReconcile = completed;
  if (completedIds.length > 0) {
    const [{ data: sums }, { data: outs }, { data: evals }, { data: costs }] =
      await Promise.all([
        supabase.from("call_summaries").select("call_id").in("call_id", completedIds),
        supabase.from("call_outcomes").select("call_id").in("call_id", completedIds),
        supabase.from("call_evaluations").select("call_id").in("call_id", completedIds),
        supabase.from("call_costs").select("call_id").in("call_id", completedIds),
      ]);
    const haveSummary = new Set((sums ?? []).map((s) => s.call_id));
    const haveOutcome = new Set((outs ?? []).map((o) => o.call_id));
    const haveEvaluation = new Set((evals ?? []).map((e) => e.call_id));
    // Costing shipped after some calls had already been fully reconciled. Those
    // satisfied every other check, so the sweep skipped them and their detail
    // page sat on "Calculating…" forever — worse than the old "N/A", because it
    // implies work still in progress.
    const haveCost = new Set((costs ?? []).map((c) => c.call_id));
    needsReconcile = completed.filter(
      (c) =>
        !c.recording_url ||
        !haveSummary.has(c.id) ||
        !haveOutcome.has(c.id) ||
        !haveEvaluation.has(c.id) ||
        !haveCost.has(c.id)
    );
  }

  const byId = new Map<string, ReconcilableCall>();
  for (const row of [...(active ?? []), ...needsReconcile]) {
    if (row.ultravox_call_id) {
      byId.set(row.id, row as ReconcilableCall);
    }
  }

  let updated = 0;
  for (const call of byId.values()) {
    try {
      const result = await reconcileCall(supabase, call);
      if (result.updated) updated += 1;
    } catch {
      // Keep going — one bad call shouldn't stall the whole sweep.
    }
  }

  return { checked: byId.size, updated };
}
