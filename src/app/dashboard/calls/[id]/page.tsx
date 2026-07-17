import Link from "next/link";
import { notFound } from "next/navigation";
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
import {
  ArrowLeft,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Wrench,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { getCall } from "@/domain/calls/service";

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

function statusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In Progress";
    case "ringing":
      return "Ringing";
    case "initiated":
      return "Initiated";
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

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
          {statusLabel(status)}
        </Badge>
      );
    case "in_progress":
    case "ringing":
    case "initiated":
      return (
        <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
          {statusLabel(status)}
        </Badge>
      );
    case "busy":
    case "no_answer":
      return (
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
          {statusLabel(status)}
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400">
          {statusLabel(status)}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{statusLabel(status)}</Badge>;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function scoreBarColor(score: number) {
  if (score >= 90) return "bg-green-500";
  if (score >= 75) return "bg-yellow-500";
  return "bg-red-500";
}

function formatDimensionLabel(dimension: string): string {
  return dimension
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

interface DimensionScore {
  dimension: string;
  score: number;
}

function asDimensionScores(criteria: unknown): DimensionScore[] {
  if (!Array.isArray(criteria)) return [];
  return criteria.filter((item): item is DimensionScore => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return typeof record.dimension === "string" && typeof record.score === "number";
  });
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // getCall() scopes by both id AND tenant_id, so a call belonging to a
  // different tenant (or a nonexistent id) resolves to null here.
  const call = await getCall(tenantId, id);

  if (!call) {
    notFound();
  }

  const [
    { data: businessProfile },
    { data: participants },
    { data: costRow },
    { data: evaluation },
    { data: toolRuns },
    { data: events },
    { data: recordingConsent },
  ] = await Promise.all([
    supabase.from("business_profiles").select("timezone").eq("tenant_id", tenantId).maybeSingle(),
    supabase
      .from("call_participants")
      .select("role, phone_number, display_name")
      .eq("call_id", call.id),
    supabase
      .from("call_costs")
      .select("total_cost, currency")
      .eq("call_id", call.id)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("call_evaluations")
      .select("score, max_score, criteria, feedback")
      .eq("call_id", call.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("call_tool_runs")
      .select("tool_name, input, output, status, error_message, started_at")
      .eq("call_id", call.id)
      .order("started_at", { ascending: true }),
    supabase
      .from("call_events")
      .select("event_type, timestamp, data")
      .eq("call_id", call.id)
      .order("timestamp", { ascending: true }),
    supabase
      .from("recording_consents")
      .select("consented, method, timestamp")
      .eq("call_id", call.id)
      .eq("tenant_id", tenantId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Same tenant-configured business timezone used on Overview / Call History,
  // so this page agrees with them on the same wall-clock time for started_at.
  const tenantTimezone = businessProfile?.timezone || "UTC";

  const caller = participants?.find((p) => p.role !== "agent") ?? null;
  const callerLabel = caller?.display_name || call.caller_number || "Unknown Caller";

  const dateTime = new Date(call.started_at).toLocaleString(undefined, {
    timeZone: tenantTimezone,
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const dimensionScores = asDimensionScores(evaluation?.criteria);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/calls" className="gap-2" />}>
            <ArrowLeft className="size-4" />
            Back to Calls
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{callerLabel}</h1>
          <p className="text-muted-foreground">Call {call.id}</p>
        </div>
        <div className="flex gap-2">
          {call.outcome?.outcome_type && (
            <Badge variant="default" className="capitalize">
              {call.outcome.outcome_type.replace(/_/g, " ")}
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">{call.direction}</Badge>
          {statusBadge(call.status)}
        </div>
      </div>

      {/* Call Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Call Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date / Time</p>
                <p className="text-sm font-medium">{dateTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{formatDuration(call.duration_seconds)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {call.direction === "inbound" ? (
                <PhoneIncoming className="size-4 text-muted-foreground" />
              ) : (
                <PhoneOutgoing className="size-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className="text-sm font-medium capitalize">{call.direction}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIncoming className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{call.caller_number ?? "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-sm font-medium">
                  {costRow ? formatCurrency(costRow.total_cost, costRow.currency) : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {call.summary ?? "No summary available for this call yet."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Event sequence during the call</CardDescription>
          </CardHeader>
          <CardContent>
            {!events || events.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No events recorded for this call.
              </p>
            ) : (
              <div className="relative ml-3 space-y-0">
                {events.map((entry, i) => {
                  const elapsedMs = Math.max(
                    0,
                    new Date(entry.timestamp).getTime() - new Date(call.started_at).getTime()
                  );
                  const elapsedSeconds = Math.round(elapsedMs / 1000);
                  const mm = Math.floor(elapsedSeconds / 60);
                  const ss = (elapsedSeconds % 60).toString().padStart(2, "0");
                  return (
                    <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Vertical line */}
                      {i < events.length - 1 && (
                        <div className="absolute left-[5px] top-3 h-full w-px bg-border" />
                      )}
                      {/* Dot */}
                      <div className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary bg-background" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{`${mm}:${ss}`}</span>
                          <span className="text-sm font-medium capitalize">
                            {entry.event_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        {entry.data != null && (
                          <p className="truncate text-xs text-muted-foreground">
                            {JSON.stringify(entry.data)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Score + Policy */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Score</CardTitle>
              <CardDescription>AI performance assessment</CardDescription>
            </CardHeader>
            <CardContent>
              {!evaluation ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  This call hasn&apos;t been evaluated yet.
                </p>
              ) : (
                <>
                  <div className="mb-4 text-center">
                    <span className="text-4xl font-bold">{Math.round(evaluation.score)}</span>
                    <span className="text-lg text-muted-foreground">/{evaluation.max_score}</span>
                  </div>
                  {dimensionScores.length > 0 && (
                    <div className="space-y-3">
                      {dimensionScores.map((item) => (
                        <div key={item.dimension}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{formatDimensionLabel(item.dimension)}</span>
                            <span className="font-medium">{Math.round(item.score)}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${scoreBarColor(item.score)}`}
                              style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {evaluation.feedback && (
                    <p className="mt-4 text-xs text-muted-foreground">{evaluation.feedback}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Policy Events */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Checks</CardTitle>
            </CardHeader>
            <CardContent>
              {!recordingConsent ? (
                <p className="text-sm text-muted-foreground">
                  No policy checks recorded for this call.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recording Consent ({recordingConsent.method})</span>
                    {recordingConsent.consented ? (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle className="size-4" />
                        <span className="text-sm font-medium">Granted</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <XCircle className="size-4" />
                        <span className="text-sm font-medium">Declined</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          {call.transcript?.content ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{call.transcript.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No transcript available for this call.</p>
          )}
        </CardContent>
      </Card>

      {/* Tool Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Executions</CardTitle>
          <CardDescription>Functions called by the agent during this call</CardDescription>
        </CardHeader>
        <CardContent>
          {!toolRuns || toolRuns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tool executions recorded for this call.
            </p>
          ) : (
            <div className="space-y-4">
              {toolRuns.map((tool, i) => (
                <div key={i}>
                  <div className="flex items-start gap-3">
                    <Wrench className="mt-0.5 size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium font-mono">{tool.tool_name}</p>
                      {tool.input != null && (
                        <p className="truncate text-xs text-muted-foreground">
                          Input: {JSON.stringify(tool.input)}
                        </p>
                      )}
                      {tool.status === "failed" && tool.error_message ? (
                        <p className="truncate text-xs text-red-600 dark:text-red-400">
                          Error: {tool.error_message}
                        </p>
                      ) : tool.output != null ? (
                        <p className="truncate text-xs text-muted-foreground">
                          Result: {JSON.stringify(tool.output)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {i < toolRuns.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio Player */}
      <Card>
        <CardHeader>
          <CardTitle>Recording</CardTitle>
        </CardHeader>
        <CardContent>
          {call.recording_url ? (
            <audio controls className="w-full" src={call.recording_url}>
              Your browser does not support the audio element.
            </audio>
          ) : (
            <p className="text-sm text-muted-foreground">No recording available for this call.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
