import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database/types";
import { summarizeCall } from "./summarize";

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

  // Summary + outcome (summarizeCall is itself idempotent).
  await summarizeCall(
    supabase,
    call.id,
    call.tenant_id,
    uv.summary ?? uv.shortSummary ?? undefined
  );

  return { updated: true };
}

/**
 * Sweeps calls that Ultravox has (an ultravox_call_id) but that we haven't
 * finalized yet — non-terminal status, or completed-but-missing-recording as
 * a catch-up for any partial write. Called by the cron reconciler.
 */
export async function reconcileActiveCalls(
  supabase: SupabaseClient<Database>
): Promise<{ checked: number; updated: number }> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const [{ data: active }, { data: recentIncomplete }] = await Promise.all([
    supabase
      .from("calls")
      .select("id, tenant_id, ultravox_call_id, status, recording_url")
      .not("ultravox_call_id", "is", null)
      .in("status", ["ringing", "initiated", "initiating", "in_progress"])
      .limit(200),
    supabase
      .from("calls")
      .select("id, tenant_id, ultravox_call_id, status, recording_url")
      .not("ultravox_call_id", "is", null)
      .eq("status", "completed")
      .is("recording_url", null)
      .gte("started_at", sixHoursAgo)
      .limit(200),
  ]);

  const byId = new Map<string, ReconcilableCall>();
  for (const row of [...(active ?? []), ...(recentIncomplete ?? [])]) {
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
