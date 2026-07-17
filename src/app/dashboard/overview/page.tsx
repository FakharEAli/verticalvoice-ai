import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  Activity,
  Phone,
  PhoneCall,
  Target,
  Clock,
  PhoneOutgoing,
  BarChart3,
  Settings,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { getAgentConfig } from "@/domain/agents/service";
import type { Json } from "@/lib/database/types";

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

function callStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
          {callStatusLabel(status)}
        </Badge>
      );
    case "failed":
    case "no_answer":
      return (
        <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400">
          {callStatusLabel(status)}
        </Badge>
      );
    case "busy":
      return (
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
          {callStatusLabel(status)}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{callStatusLabel(status)}</Badge>;
  }
}

function integrationDot(status: string) {
  const color =
    status === "connected" || status === "active"
      ? "bg-green-500"
      : status === "error" || status === "disconnected"
        ? "bg-red-500"
        : "bg-yellow-500";
  return <span className={`inline-block size-2 rounded-full ${color}`} />;
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
    supabase.from("calls").select("status, duration_seconds, started_at").eq("tenant_id", tenantId),
    supabase
      .from("calls")
      .select("id, caller_number, status, duration_seconds, started_at, direction")
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Agent Status</CardTitle>
            <CardDescription>
              {snapshot?.business_name ?? tenant?.name ?? "Your AI voice agent configuration"}
            </CardDescription>
          </div>
          {activeConfig ? (
            <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
              <span className="mr-1 inline-block size-2 rounded-full bg-green-500" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <span className="mr-1 inline-block size-2 rounded-full bg-muted-foreground" />
              Not configured
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{activeNumber?.number ?? "No number assigned"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Industry:</span>
              <span className="font-medium capitalize">
                {tenant?.industry?.replace(/_/g, " ") ?? "Unknown"}
              </span>
            </div>
            {snapshot?.voice?.provider && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Voice:</span>
                <span className="font-medium">
                  {snapshot.voice.provider}
                  {snapshot.voice.voice_id ? ` · ${snapshot.voice.voice_id}` : ""}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Handled</CardTitle>
            <PhoneCall className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callsToday.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Target className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolutionRate}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedCalls} of {totalCalls} calls completed (all time)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgDurationSeconds)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Per call, all time</p>
          </CardContent>
        </Card>
      </div>

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
              <div className="space-y-3">
                {recentCalls.map((call, i) => (
                  <div key={call.id}>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-4">
                        <span className="w-32 text-sm text-muted-foreground">
                          {formatCallTime(call.started_at, tenantTimezone)}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {call.caller_number ?? "Unknown number"}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {call.direction}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {call.duration_seconds != null
                            ? formatDuration(call.duration_seconds)
                            : "--"}
                        </span>
                        {callStatusBadge(call.status)}
                      </div>
                    </div>
                    {i < recentCalls.length - 1 && <Separator />}
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
              <Link href="/dashboard/test-center" className="block">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <PhoneOutgoing className="size-4" aria-hidden="true" />
                  Test Call
                </Button>
              </Link>
              <Link href="/dashboard/agent" className="block">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Settings className="size-4" aria-hidden="true" />
                  Edit Agent
                </Button>
              </Link>
              <Link href="/dashboard/analytics" className="block">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <BarChart3 className="size-4" aria-hidden="true" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
