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

  const { calls, total } = await listCalls(tenantId, {
    page,
    pageSize: PAGE_SIZE,
    direction: direction === "all" ? undefined : direction,
  });

  const rows: CallRow[] = calls.map((call) => ({
    id: call.id,
    startedAt: call.started_at,
    callerNumber: call.caller_number,
    durationSeconds: call.duration_seconds,
    status: call.status,
    direction: call.direction,
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
      />
    </div>
  );
}
