"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

interface AuditEvent {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: unknown;
  createdAt: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
}

const PAGE_SIZE = 15;

function humanizeAction(action: string): string {
  return action
    .split(/[._]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

  if (date.toDateString() === now.toDateString()) {
    return `Today ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${time}`;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatFullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Audit metadata is a free-form JSONB bag. Render it as readable
 * "Label: value" lines rather than dumping raw JSON at the user.
 */
function describeMetadata(metadata: unknown): { label: string; value: string }[] {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== "")
    .slice(0, 8)
    .map(([key, value]) => {
      const spaced = key.replace(/[_-]+/g, " ");
      const label = spaced.charAt(0).toUpperCase() + spaced.slice(1);
      const rendered =
        typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : Array.isArray(value)
            ? `${value.length} item${value.length === 1 ? "" : "s"}`
            : "(details)";
      return { label, value: rendered };
    });
}

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [truncated, setTruncated] = useState(false);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/v1/audit");
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? "Failed to load audit events.");
          return;
        }
        setEvents(data.events ?? []);
        setTruncated(Boolean(data.truncated));
      } catch {
        setLoadError("Failed to load audit events. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((e) => e.resourceType))).sort(),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        query === "" ||
        event.action.toLowerCase().includes(query) ||
        (event.actorName ?? "").toLowerCase().includes(query) ||
        (event.actorEmail ?? "").toLowerCase().includes(query);
      const matchesType = filterType === "All" || event.resourceType === filterType;
      return matchesSearch && matchesType;
    });
  }, [events, search, filterType]);

  // Reset to page 1 whenever the search/filter combination changes, so the
  // footer count and visible slice always stay in sync with the active
  // filters. Adjusting state directly during render (React's documented
  // pattern for this) instead of via an effect avoids an extra render pass.
  const filterKey = `${search}::${filterType}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const totalFiltered = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = totalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalFiltered);
  const pagedEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const dateRangeLabel =
    events.length > 0
      ? `${formatShortDate(events[events.length - 1].createdAt)} to ${formatShortDate(events[0].createdAt)}`
      : null;

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all activity across your workspace.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={filterType === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("All")}
          >
            All
          </Button>
          {eventTypes.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {capitalize(type.replace(/_/g, " "))}
            </Button>
          ))}
        </div>
        {dateRangeLabel && (
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{dateRangeLabel}</span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading audit events…</p>
          ) : loadError ? (
            <p className="p-6 text-sm text-destructive">{loadError}</p>
          ) : filteredEvents.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {events.length === 0
                ? "No audit events recorded for this workspace yet."
                : "No events match your search or filter."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Time
                    </th>
                    <th className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actor
                    </th>
                    <th className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Action
                    </th>
                    <th className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Target
                    </th>
                    <th className="w-8 px-4 py-2.5" aria-label="Expand" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pagedEvents.map((event) => {
                    const isExpanded = expandedId === event.id;
                    const actorLabel = event.actorName || event.actorEmail || "System";
                    return (
                      <Fragment key={event.id}>
                        <tr
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          className="cursor-pointer align-top transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => toggleExpand(event.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExpand(event.id);
                            }
                          }}
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                            {formatEventTime(event.createdAt)}
                          </td>
                          <td className="px-4 py-2.5">{actorLabel}</td>
                          <td className="px-4 py-2.5 font-medium">
                            {humanizeAction(event.action)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit">
                                {capitalize(event.resourceType.replace(/_/g, " "))}
                              </Badge>
                              {event.resourceId && (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {event.resourceId}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="grid gap-2 text-sm">
                                <div className="flex gap-2">
                                  <span className="font-medium text-muted-foreground">Action:</span>
                                  <span className="font-mono text-xs">{event.action}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-medium text-muted-foreground">Actor:</span>
                                  <span>
                                    {event.actorName || event.actorEmail
                                      ? `${event.actorName ?? ""}${
                                          event.actorEmail ? ` (${event.actorEmail})` : ""
                                        }`.trim()
                                      : "System"}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-medium text-muted-foreground">Timestamp:</span>
                                  <span className="font-mono text-xs tabular-nums">
                                    {formatFullTimestamp(event.createdAt)}
                                  </span>
                                </div>
                                {describeMetadata(event.metadata).map((line) => (
                                  <div key={line.label} className="flex gap-2">
                                    <span className="font-medium text-muted-foreground">
                                      {line.label}:
                                    </span>
                                    <span className="break-all">{line.value}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {totalFiltered === 0
            ? "Showing 0 events"
            : `Showing ${pageStart} to ${pageEnd} of ${totalFiltered} events`}
          {truncated && " (limited to the 300 most recent)"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
