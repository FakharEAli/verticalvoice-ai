import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";

/**
 * Lists this tenant's Test Center calls (is_test=true) — recording,
 * transcript presence, and tool actions live on the existing call detail
 * page (/dashboard/calls/[id]), which doesn't filter by is_test, so this
 * just needs to surface a compact list that links there.
 */
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });

  const { data: calls, error } = await supabase
    .from("calls")
    .select("id, status, duration_seconds, started_at, recording_url")
    .eq("tenant_id", tenantId)
    .eq("is_test", true)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const callIds = (calls ?? []).map((c) => c.id);
  const [{ data: transcripts }, { data: toolRuns }, { data: outcomes }] = await Promise.all([
    callIds.length
      ? supabase.from("call_transcripts").select("call_id").in("call_id", callIds)
      : Promise.resolve({ data: [] as { call_id: string }[] }),
    callIds.length
      ? supabase.from("call_tool_runs").select("call_id").in("call_id", callIds)
      : Promise.resolve({ data: [] as { call_id: string }[] }),
    callIds.length
      ? supabase.from("call_outcomes").select("call_id, outcome_type").in("call_id", callIds)
      : Promise.resolve({ data: [] as { call_id: string; outcome_type: string }[] }),
  ]);

  const hasTranscript = new Set((transcripts ?? []).map((t) => t.call_id));
  const toolRunCounts = new Map<string, number>();
  for (const r of toolRuns ?? []) {
    toolRunCounts.set(r.call_id, (toolRunCounts.get(r.call_id) ?? 0) + 1);
  }
  const outcomeByCall = new Map((outcomes ?? []).map((o) => [o.call_id, o.outcome_type]));

  const result = (calls ?? []).map((c) => ({
    id: c.id,
    status: c.status,
    duration_seconds: c.duration_seconds,
    started_at: c.started_at,
    has_recording: !!c.recording_url,
    has_transcript: hasTranscript.has(c.id),
    tool_run_count: toolRunCounts.get(c.id) ?? 0,
    outcome_type: outcomeByCall.get(c.id) ?? null,
  }));

  return NextResponse.json({ data: result });
}

const CALL_ID_TABLES = [
  "appointments",
  "waitlist_entries",
  "refill_requests",
  "insurance_intakes",
  "reservations",
  "orders",
  "catering_leads",
  "restaurant_complaints",
  "real_estate_leads",
  "showings",
  "valuation_appointments",
  "maintenance_requests",
] as const;

/**
 * Wipes every artifact a Test Center call created — the bookings/leads it
 * produced, plus the call's own recording/transcript/tool-run/summary/
 * outcome rows. Business tables use ON DELETE SET NULL on call_id (not
 * CASCADE), so deleting the calls row alone would leave orphaned test data
 * behind with call_id=null, indistinguishable from real records — these
 * have to be deleted explicitly first, in this order, before the calls
 * rows themselves (whose call-scoped children DO cascade).
 */
export async function DELETE() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });

  const admin = createAdminClient();

  const { data: testCalls, error: fetchError } = await admin
    .from("calls")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_test", true);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const testCallIds = (testCalls ?? []).map((c) => c.id);
  if (testCallIds.length === 0) {
    return NextResponse.json({ data: { deleted_calls: 0 } });
  }

  for (const table of CALL_ID_TABLES) {
    const { error } = await admin.from(table).delete().eq("tenant_id", tenantId).in("call_id", testCallIds);
    if (error) {
      return NextResponse.json({ error: `Failed clearing ${table}: ${error.message}` }, { status: 500 });
    }
  }

  await admin.from("notifications").delete().eq("tenant_id", tenantId).in("data->>call_id", testCallIds);
  await admin.from("audit_events").delete().eq("tenant_id", tenantId).eq("resource_type", "call").in("resource_id", testCallIds);

  const { error: deleteCallsError } = await admin.from("calls").delete().eq("tenant_id", tenantId).in("id", testCallIds);
  if (deleteCallsError) {
    return NextResponse.json({ error: deleteCallsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted_calls: testCallIds.length } });
}
