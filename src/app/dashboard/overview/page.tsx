import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Activity,
  Phone,
  PhoneOutgoing,
  BarChart3,
  Settings,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { getAgentConfig } from "@/domain/agents/service";
import { LiveCallOrb } from "@/components/shared/live-call-orb";
import { TestBadge } from "@/components/shared/test-badge";
import type { Json } from "@/lib/database/types";
import { OverviewStats } from "./overview-stats";

interface AgentSnapshot {
  business_name?: string;
  voice?: {
    provider?: string;
    voice_id?: string | null;
    speed?: number;
    language?: string;
  } | null;
}

function asAgentSnapshot(snapshot: Json): AgentSnapshot {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    return snapshot as AgentSnapshot;
  }
  return {};
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatCallTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

/** Maps a tenant industry to its jewel accent CSS variable, else brass. */
function verticalAccent(industry: string | null | undefined): string {
  switch (industry) {
    case "healthcare":
      return "var(--vertical-healthcare)";
    case "restaurant":
      return "var(--vertical-restaurant)";
    case "real_estate":
    case "realestate":
      return "var(--vertical-realestate)";
    default:
      return "var(--brand)";
  }
}

function callStatusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In Progress";
    case "ringing":
      return "Ringing";
    case "failed":
      return "Failed";
    case "busy":
      return "Busy";
    case "no_answer":
      return "No Answer";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  }
}

/** Status pill: semantic tint + solid text + a dot, never color alone. */
function StatusPill({ status }: { status: string }) {
  const variant: "success" | "warning" | "destructive" | "outline" =
    status === "completed"
      ? "success"
      : status === "failed" || status === "no_answer"
        ? "destructive"
        : status === "busy" || status === "in_progress" || status === "ringing"
          ? "warning"
          : "outline";

  const dotClass = variant === "outline" ? "bg-muted-foreground" : "bg-current";

  return (
    <Badge variant={variant} className="gap-1.5">
      <span className={`inline-block size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {callStatusLabel(status)}
    </Badge>
  );
}

function integrationDot(status: string) {
  const color =
    status === "connected" || status === "active"
      ? "bg-success"
      : status === "error" || status === "disconnected"
        ? "bg-destructive"
        : "bg-warning";
  return <span className={`inline-block size-2 rounded-full ${color}`} aria-hidden="true" />;
}

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

export default async function OverviewPage() {
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

  const [
    { data: tenant },
    activeConfig,
    { data: phoneNumbers },
    { data: allCalls },
    { data: recentCallsRaw },
    { data: integrations },
    { data: businessProfile },
  ] = await Promise.all([
    supabase.from("tenants").select("name, industry").eq("id", tenantId).maybeSingle(),
    getAgentConfig(tenantId),
    supabase
      .from("phone_numbers")
      .select("id, number, status")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("calls")
      .select("status, duration_seconds, started_at")
      .eq("tenant_id", tenantId)
      .eq("is_test", false),
    supabase
      .from("calls")
      .select("id, caller_number, status, duration_seconds, started_at, direction, is_test")
      .eq("tenant_id", tenantId)
      .order("started_at", { ascending: false })
      .limit(8),
    supabase.from("integration_connections").select("provider, status").eq("tenant_id", tenantId),
    supabase.from("business_profiles").select("timezone").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  // Format call timestamps in the tenant's configured business timezone (not
  // the ambient server/browser timezone) so this page and Call History always
  // agree on the same wall-clock time for the same `started_at` value.
  const tenantTimezone = businessProfile?.timezone || "UTC";

  let snapshot: AgentSnapshot | null = null;
  if (activeConfig) {
    const { data: versionRow } = await supabase
      .from("agent_config_versions")
      .select("snapshot")
      .eq("id", activeConfig.agent_config_version_id)
      .maybeSingle();
    if (versionRow) {
      snapshot = asAgentSnapshot(versionRow.snapshot);
    }
  }

  const activeNumber =
    (activeConfig?.phone_number_id
      ? phoneNumbers?.find((p) => p.id === activeConfig.phone_number_id)
      : undefined) ??
    phoneNumbers?.find((p) => p.status === "active") ??
    phoneNumbers?.[0] ??
    null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const calls = allCalls ?? [];
  const callsToday = calls.filter((c) => new Date(c.started_at) >= startOfToday);
  const totalCalls = calls.length;
  const completedCalls = calls.filter((c) => c.status === "completed").length;
  const resolutionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
  const durations = calls
    .map((c) => c.duration_seconds)
    .filter((d): d is number => typeof d === "number");
  const avgDurationSeconds =
    durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

  const recentCalls = recentCallsRaw ?? [];
  const accent = verticalAccent(tenant?.industry);
  const industryLabel = tenant?.industry?.replace(/_/g, " ") ?? "Unknown";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your AI calling agent performance and status.
        </p>
      </div>

      {/* Agent Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Agent Status</CardTitle>
            <CardDescription>
              {snapshot?.business_name ?? tenant?.name ?? "Your AI voice agent configuration"}
            </CardDescription>
          </div>
          {activeConfig ? (
            <Badge variant="success" className="gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
              Not configured
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <LiveCallOrb
              size="sm"
              state={activeConfig ? "live" : "idle"}
              accent={accent}
              showTimer={false}
            />
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono font-medium tabular-nums">
                  {activeNumber?.number ?? "No number assigned"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">Industry</span>
                <span className="font-medium capitalize">{industryLabel}</span>
              </div>
              {snapshot?.voice?.provider && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Voice</span>
                  <span className="font-medium">
                    {snapshot.voice.provider}
                    {snapshot.voice.voice_id ? ` · ${snapshot.voice.voice_id}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats (count up on mount) */}
      <OverviewStats
        callsToday={callsToday.length}
        resolutionRate={resolutionRate}
        completedCalls={completedCalls}
        totalCalls={totalCalls}
        avgDurationSeconds={avgDurationSeconds}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Calls */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Latest calls handled by your agent</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No calls yet.</p>
            ) : (
              <div className="-mx-2">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-2 py-3 last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="w-28 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatCallTime(call.started_at, tenantTimezone)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-mono text-sm font-medium tabular-nums">
                          {call.caller_number ?? "Unknown number"}
                          {call.is_test && <TestBadge />}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {call.direction}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {call.duration_seconds != null
                          ? formatDuration(call.duration_seconds)
                          : "--"}
                      </span>
                      <StatusPill status={call.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Integration Health */}
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Service connection status</CardDescription>
            </CardHeader>
            <CardContent>
              {integrations && integrations.length > 0 ? (
                <div className="space-y-3">
                  {integrations.map((item) => (
                    <div key={item.provider} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {integrationDot(item.status)}
                        <span className="text-sm font-medium capitalize">{item.provider}</span>
                      </div>
                      <span className="text-xs capitalize text-muted-foreground">{item.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No integrations connected yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                render={<Link href="/dashboard/test-center" />}
              >
                <PhoneOutgoing className="size-4" aria-hidden="true" />
                Test Call
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                render={<Link href="/dashboard/agent" />}
              >
                <Settings className="size-4" aria-hidden="true" />
                Edit Agent
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                render={<Link href="/dashboard/analytics" />}
              >
                <BarChart3 className="size-4" aria-hidden="true" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
