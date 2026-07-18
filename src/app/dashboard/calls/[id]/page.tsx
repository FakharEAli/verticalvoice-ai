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
import { TestBadge } from "@/components/shared/test-badge";
import { displayCallerName } from "@/lib/calls/display";
import { describeToolRun } from "@/lib/calls/tool-descriptions";
import { RecordingPlayer } from "./recording-player";

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

/** Status pill: semantic tint + solid text + a dot, never color alone. */
function StatusPill({ status }: { status: string }) {
  const variant: "success" | "warning" | "destructive" | "outline" =
    status === "completed"
      ? "success"
      : status === "failed" || status === "no_answer"
        ? "destructive"
        : status === "busy" ||
            status === "in_progress" ||
            status === "ringing" ||
            status === "initiated"
          ? "warning"
          : "outline";

  const dotClass = variant === "outline" ? "bg-muted-foreground" : "bg-current";

  return (
    <Badge variant={variant} className="gap-1.5">
      <span className={`inline-block size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {statusLabel(status)}
    </Badge>
  );
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

/**
 * Timeline events carry a small JSONB payload. Render it as a readable
 * phrase instead of dumping the raw object at the user.
 */
function describeEventData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([, v]) => v != null && v !== "" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
  );
  if (entries.length === 0) return null;
  return entries
    .slice(0, 3)
    .map(([k, v]) => {
      const label = k.replace(/[_-]+/g, " ");
      const pretty = label.charAt(0).toUpperCase() + label.slice(1);
      return `${pretty}: ${String(v)}`;
    })
    .join(" · ");
}

interface TranscriptLine {
  speaker: "caller" | "agent";
  text: string;
}

/**
 * Presentational parse of the stored transcript string into caller/agent
 * turns for the bubble view. Detects leading speaker labels
 * (e.g. "Agent:", "Caller -"); unlabeled lines continue the current
 * speaker. Returns null when no labels are present so the caller can
 * fall back to the raw pre-formatted text (no data is invented).
 */
function parseTranscript(content: string): TranscriptLine[] | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const agentRe = /^(agent|assistant|ai|bot|rep|representative|voice ?agent)\s*[:\-]\s*(.*)$/i;
  const callerRe = /^(caller|customer|user|human|client|guest)\s*[:\-]\s*(.*)$/i;

  const out: TranscriptLine[] = [];
  let sawLabel = false;
  let current: TranscriptLine | null = null;

  for (const line of lines) {
    const agentMatch = line.match(agentRe);
    const callerMatch = line.match(callerRe);
    if (agentMatch) {
      sawLabel = true;
      current = { speaker: "agent", text: agentMatch[2] };
      out.push(current);
    } else if (callerMatch) {
      sawLabel = true;
      current = { speaker: "caller", text: callerMatch[2] };
      out.push(current);
    } else if (current) {
      current.text = current.text ? `${current.text} ${line}` : line;
    } else {
      current = { speaker: "caller", text: line };
      out.push(current);
    }
  }

  if (!sawLabel) return null;
  return out.filter((l) => l.text.trim().length > 0);
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
  const callerLabel = caller?.display_name || displayCallerName(call.caller_number);

  const dateTime = new Date(call.started_at).toLocaleString(undefined, {
    timeZone: tenantTimezone,
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const dimensionScores = asDimensionScores(evaluation?.criteria);
  const transcriptLines = call.transcript?.content
    ? parseTranscript(call.transcript.content)
    : null;

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
          <p className="font-mono text-sm text-muted-foreground">Call {call.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {call.is_test && <TestBadge />}
          {call.outcome?.outcome_type && (
            <Badge variant="outline" className="capitalize">
              {call.outcome.outcome_type.replace(/_/g, " ")}
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">
            {call.direction}
          </Badge>
          <StatusPill status={call.status} />
        </div>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: transcript, timeline, tools, recording */}
        <div className="space-y-6 lg:col-span-2">
          {/* Transcript (bubble style) */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>Caller and agent turns during the call</CardDescription>
            </CardHeader>
            <CardContent>
              {transcriptLines && transcriptLines.length > 0 ? (
                <div className="flex flex-col gap-3" aria-label="Call transcript">
                  {transcriptLines.map((line, i) => {
                    const isAgent = line.speaker === "agent";
                    return (
                      <div
                        key={i}
                        className={`flex flex-col gap-1 ${isAgent ? "items-end" : "items-start"}`}
                      >
                        <span className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {isAgent ? "Agent" : "Caller"}
                        </span>
                        <span
                          className={`inline-block max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                            isAgent
                              ? "border border-brand/20 bg-accent text-accent-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {line.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : call.transcript?.content ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {call.transcript.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transcript available for this call.
                </p>
              )}
            </CardContent>
          </Card>

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
                        <div className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-brand bg-background" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">{`${mm}:${ss}`}</span>
                            <span className="text-sm font-medium capitalize">
                              {entry.event_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          {describeEventData(entry.data) && (
                            <p className="text-xs text-muted-foreground">
                              {describeEventData(entry.data)}
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
                  {toolRuns.map((tool, i) => {
                    const described = describeToolRun(
                      tool.tool_name,
                      tool.input,
                      tool.output,
                      tool.status
                    );
                    const isFailure = tool.status === "failed" || tool.status === "error";
                    return (
                      <div key={i}>
                        <div className="flex items-start gap-3">
                          <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{described.action}</p>
                            <p className="text-xs text-muted-foreground">{described.detail}</p>
                            <p
                              className={`mt-0.5 text-xs font-medium ${
                                isFailure ? "text-destructive" : "text-success"
                              }`}
                            >
                              {isFailure && tool.error_message
                                ? `Failed — ${tool.error_message}`
                                : described.result}
                            </p>
                          </div>
                        </div>
                        {i < toolRuns.length - 1 && <Separator className="mt-4" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recording */}
          <Card>
            <CardHeader>
              <CardTitle>Recording</CardTitle>
            </CardHeader>
            <CardContent>
              {call.recording_url ? (
                <RecordingPlayer src={call.recording_url} />
              ) : (
                <p className="text-sm text-muted-foreground">No recording available for this call.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: metadata, evaluation, outcome/tags, policy */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Call Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-4" />
                    Date / Time
                  </dt>
                  <dd className="text-right font-medium">{dateTime}</dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-4" />
                    Duration
                  </dt>
                  <dd className="font-mono font-medium tabular-nums">
                    {formatDuration(call.duration_seconds)}
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    {call.direction === "inbound" ? (
                      <PhoneIncoming className="size-4" />
                    ) : (
                      <PhoneOutgoing className="size-4" />
                    )}
                    Direction
                  </dt>
                  <dd className="font-medium capitalize">{call.direction}</dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <PhoneIncoming className="size-4" />
                    Phone
                  </dt>
                  <dd className="font-mono font-medium tabular-nums">
                    {displayCallerName(call.caller_number)}
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="size-4" />
                    Cost
                  </dt>
                  <dd className="font-mono font-medium tabular-nums">
                    {costRow ? formatCurrency(costRow.total_cost, costRow.currency) : "N/A"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Evaluation Score */}
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
                  <div className="mb-5 flex items-baseline justify-center gap-1">
                    <span className="font-mono text-5xl font-bold tabular-nums leading-none text-brand">
                      {Math.round(evaluation.score)}
                    </span>
                    <span className="font-mono text-lg tabular-nums text-muted-foreground">
                      /{evaluation.max_score}
                    </span>
                  </div>
                  {dimensionScores.length > 0 && (
                    <div className="space-y-3">
                      {dimensionScores.map((item) => (
                        <div key={item.dimension}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{formatDimensionLabel(item.dimension)}</span>
                            <span className="font-mono font-medium tabular-nums">
                              {Math.round(item.score)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {evaluation.feedback && (
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                      {evaluation.feedback}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Outcome & Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {call.outcome?.outcome_type ? (
                  <Badge variant="success" className="gap-1.5 capitalize">
                    <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {call.outcome.outcome_type.replace(/_/g, " ")}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">No outcome recorded.</span>
                )}
                {call.outcome?.disposition && (
                  <Badge variant="outline" className="capitalize">
                    {call.outcome.disposition.replace(/_/g, " ")}
                  </Badge>
                )}
                <Badge variant="outline" className="capitalize">
                  {call.direction}
                </Badge>
              </div>
              {call.outcome?.notes && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {call.outcome.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Policy Checks */}
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
                <div className="flex items-center justify-between">
                  <span className="text-sm">Recording Consent ({recordingConsent.method})</span>
                  {recordingConsent.consented ? (
                    <div className="flex items-center gap-1.5 text-success">
                      <CheckCircle className="size-4" />
                      <span className="text-sm font-medium">Granted</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <XCircle className="size-4" />
                      <span className="text-sm font-medium">Declined</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
