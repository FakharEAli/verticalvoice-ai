"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

export type DirectionFilter = "all" | "inbound" | "outbound";

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

export function CallsTable({ calls, total, page, totalPages, direction, timezone }: CallsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return calls;
    return calls.filter(
      (call) =>
        (call.callerNumber ?? "").toLowerCase().includes(query) ||
        statusLabel(call.status).toLowerCase().includes(query)
    );
  }, [calls, search]);

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (direction !== "all") params.set("direction", direction);
    params.set("page", String(targetPage));
    return `/dashboard/calls?${params.toString()}`;
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search this page..."
              className="pl-9 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Started</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Caller</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Direction</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {calls.length === 0 ? "No calls yet." : "No calls match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((call) => {
                    const { time, date } = formatDateTime(call.startedAt, timezone);
                    return (
                      <tr key={call.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium">{time}</p>
                          <p className="text-xs text-muted-foreground">{date}</p>
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{call.callerNumber ?? "Unknown"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDuration(call.durationSeconds)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {call.direction === "inbound" ? (
                              <PhoneIncoming className="size-3.5 text-muted-foreground" />
                            ) : (
                              <PhoneOutgoing className="size-3.5 text-muted-foreground" />
                            )}
                            <span className="capitalize">{call.direction}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{statusBadge(call.status)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {total} calls
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
          <span className="text-sm text-muted-foreground">
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
    </>
  );
}
