"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TestBadge } from "@/components/shared/test-badge";
import { cn } from "@/lib/utils";
import {
  Eye,
  Search,
  PhoneIncoming,
  PhoneOutgoing,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface CallRow {
  id: string;
  startedAt: string;
  callerNumber: string | null;
  durationSeconds: number | null;
  status: string;
  direction: string;
  /** Normalized evaluation score 0-100, or null when the call has no evaluation. */
  score: number | null;
  isTest: boolean;
}

export type DirectionFilter = "all" | "inbound" | "outbound";

const LIVE_STATUSES = new Set(["in_progress", "ringing", "initiated"]);

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDateTime(iso: string, timeZone: string): { time: string; date: string } {
  const d = new Date(iso);
  return {
    time: d.toLocaleTimeString(undefined, { timeZone, hour: "numeric", minute: "2-digit" }),
    date: d.toLocaleDateString(undefined, { timeZone, month: "short", day: "numeric" }),
  };
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
        : status === "busy" || LIVE_STATUSES.has(status)
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

/** Brass evaluation-score cell. Brass is the score's signature; "--" when absent. */
function ScoreCell({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="font-mono text-sm tabular-nums text-muted-foreground">--</span>;
  }
  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-brand">{Math.round(score)}</span>
  );
}

function directionHref(d: DirectionFilter): string {
  const params = new URLSearchParams();
  if (d !== "all") params.set("direction", d);
  params.set("page", "1");
  return `/dashboard/calls?${params.toString()}`;
}

interface CallsTableProps {
  calls: CallRow[];
  total: number;
  page: number;
  totalPages: number;
  direction: DirectionFilter;
  /** IANA timezone (e.g. "America/New_York") the tenant's timestamps should render in. */
  timezone: string;
}

type Tab = "history" | "live";

export function CallsTable({ calls, total, page, totalPages, direction, timezone }: CallsTableProps) {
  const [tab, setTab] = useState<Tab>("history");
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const liveCalls = useMemo(() => calls.filter((c) => LIVE_STATUSES.has(c.status)), [calls]);
  const historyCalls = useMemo(() => calls.filter((c) => !LIVE_STATUSES.has(c.status)), [calls]);

  const outcomeOptions = useMemo(() => {
    const set = new Set(historyCalls.map((c) => c.status));
    return Array.from(set);
  }, [historyCalls]);

  const filtered = useMemo(() => {
    const source = tab === "live" ? liveCalls : historyCalls;
    const query = search.trim().toLowerCase();
    return source.filter((call) => {
      if (query) {
        const matches =
          (call.callerNumber ?? "").toLowerCase().includes(query) ||
          statusLabel(call.status).toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (tab === "history" && outcome !== "all" && call.status !== outcome) return false;
      if (fromDate) {
        const start = new Date(`${fromDate}T00:00:00`).getTime();
        if (new Date(call.startedAt).getTime() < start) return false;
      }
      if (toDate) {
        const end = new Date(`${toDate}T23:59:59`).getTime();
        if (new Date(call.startedAt).getTime() > end) return false;
      }
      return true;
    });
  }, [tab, liveCalls, historyCalls, search, outcome, fromDate, toDate]);

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (direction !== "all") params.set("direction", direction);
    params.set("page", String(targetPage));
    return `/dashboard/calls?${params.toString()}`;
  }

  const controlClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-4">
      {/* Tabs (underline, active brass) */}
      <div className="flex items-center gap-6 border-b border-border" role="tablist" aria-label="Call views">
        {([
          { id: "live" as Tab, label: "Live Calls", count: liveCalls.length },
          { id: "history" as Tab, label: "Call History", count: historyCalls.length },
        ]).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative -mb-px flex items-center gap-2 border-b-2 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                  active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search caller or status..."
              className="w-60 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search calls on this page"
            />
          </div>

          {tab === "history" && (
            <select
              className={cn(controlClass, "capitalize")}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              aria-label="Filter by outcome"
            >
              <option value="all">All outcomes</option>
              {outcomeOptions.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              className={controlClass}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              className={controlClass}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
            />
          </div>
        </div>

        {/* Direction segmented control (server-driven, preserves pagination scope) */}
        <div className="flex gap-1">
          {(["all", "inbound", "outbound"] as const).map((f) => (
            <Button
              key={f}
              variant={direction === f ? "default" : "outline"}
              size="sm"
              render={<Link href={directionHref(f)} />}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Started
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Caller
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Duration
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Direction
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Score
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {tab === "live"
                        ? "No live calls right now."
                        : calls.length === 0
                          ? "No calls yet."
                          : "No calls match your filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((call) => {
                    const { time, date } = formatDateTime(call.startedAt, timezone);
                    const isLive = LIVE_STATUSES.has(call.status);
                    return (
                      <tr
                        key={call.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isLive && (
                              <span className="relative inline-flex size-2 shrink-0 items-center justify-center text-warning">
                                <span
                                  className="absolute inline-flex size-2 animate-vv-ping rounded-full bg-current opacity-70"
                                  aria-hidden="true"
                                />
                                <span className="relative inline-flex size-1.5 rounded-full bg-current" aria-hidden="true" />
                              </span>
                            )}
                            <div>
                              <p className="font-mono text-sm font-medium tabular-nums">{time}</p>
                              <p className="font-mono text-xs tabular-nums text-muted-foreground">{date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium tabular-nums">
                              {call.callerNumber ?? "Unknown"}
                            </span>
                            {call.isTest && <TestBadge />}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm tabular-nums text-muted-foreground">
                          {formatDuration(call.durationSeconds)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            {call.direction === "inbound" ? (
                              <PhoneIncoming className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            ) : (
                              <PhoneOutgoing className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            )}
                            <span className="capitalize">{call.direction}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <ScoreCell score={call.score} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill status={call.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="View call detail"
                            render={<Link href={`/dashboard/calls/${call.id}`} />}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination (Call History only; live calls are transient) */}
      {tab === "history" && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-mono tabular-nums">{filtered.length}</span> of{" "}
            <span className="font-mono tabular-nums">{total}</span> calls
          </p>
          <div className="flex items-center gap-2">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
            ) : (
              <Button variant="outline" size="sm" render={<Link href={pageHref(page - 1)} />}>
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
            )}
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" render={<Link href={pageHref(page + 1)} />}>
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
