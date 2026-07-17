import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { listCalls } from "@/domain/calls/service";
import { CallsTable, type CallRow, type DirectionFilter } from "./calls-table";

const PAGE_SIZE = 12;

function NoTenantState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No tenant configured for this account</CardTitle>
        <CardDescription>
          Your account isn&apos;t linked to any tenant yet, so there&apos;s nothing to show here.
          Contact an administrator to be added to a tenant.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; direction?: string }>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <NoTenantState />;
  }

  const tenantId = await getCurrentTenantId(user.id);

  if (!tenantId) {
    return <NoTenantState />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const direction: DirectionFilter =
    params.direction === "inbound" || params.direction === "outbound" ? params.direction : "all";

  const [{ calls, total }, { data: businessProfile }] = await Promise.all([
    listCalls(tenantId, {
      page,
      pageSize: PAGE_SIZE,
      direction: direction === "all" ? undefined : direction,
    }),
    supabase.from("business_profiles").select("timezone").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  // Same tenant-configured business timezone used on the Overview page, so
  // both pages agree on the wall-clock time shown for the same `started_at`.
  const tenantTimezone = businessProfile?.timezone || "UTC";

  // Additive, tenant-scoped lookup of the evaluation score for the calls on
  // this page only, so the table can show a real (not fabricated) score
  // column. Keyed by call_id; calls without an evaluation stay null.
  const callIds = calls.map((c) => c.id);
  const scoreByCallId = new Map<string, number>();
  if (callIds.length > 0) {
    const { data: evaluations } = await supabase
      .from("call_evaluations")
      .select("call_id, score, max_score")
      .eq("tenant_id", tenantId)
      .in("call_id", callIds);
    for (const row of evaluations ?? []) {
      const max = typeof row.max_score === "number" && row.max_score > 0 ? row.max_score : 100;
      const normalized = Math.max(0, Math.min(100, (row.score / max) * 100));
      // Keep the highest score if a call somehow has multiple evaluations.
      const prev = scoreByCallId.get(row.call_id);
      if (prev == null || normalized > prev) scoreByCallId.set(row.call_id, normalized);
    }
  }

  const rows: CallRow[] = calls.map((call) => ({
    id: call.id,
    startedAt: call.started_at,
    callerNumber: call.caller_number,
    durationSeconds: call.duration_seconds,
    status: call.status,
    direction: call.direction,
    score: scoreByCallId.get(call.id) ?? null,
    isTest: call.is_test,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
        <p className="text-muted-foreground">
          View and manage your complete call history.
        </p>
      </div>

      <CallsTable
        calls={rows}
        total={total}
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        direction={direction}
        timezone={tenantTimezone}
      />
    </div>
  );
}
