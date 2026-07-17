"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Bot,
  Building2,
  ChevronDown,
  ChevronRight,
  Phone,
  Wrench,
  type LucideIcon,
} from "lucide-react";

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

const resourceIcons: Record<string, LucideIcon> = {
  tenant: Building2,
  agent: Bot,
  call: Phone,
  call_tool_run: Wrench,
};

function iconFor(resourceType: string): LucideIcon {
  return resourceIcons[resourceType] ?? Activity;
}

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
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

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
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
      ? `${formatShortDate(events[events.length - 1].createdAt)} – ${formatShortDate(events[0].createdAt)}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all activity across your workspace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
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
          <span className="ml-auto text-sm text-muted-foreground">{dateRangeLabel}</span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading audit events…</p>
          ) : loadError ? (
            <p className="py-6 text-sm text-destructive">{loadError}</p>
          ) : filteredEvents.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {events.length === 0
                ? "No audit events recorded for this workspace yet."
                : "No events match your search or filter."}
            </p>
          ) : (
            <div className="divide-y">
              {pagedEvents.map((event) => {
                const Icon = iconFor(event.resourceType);
                const isExpanded = expandedId === event.id;
                const actorLabel = event.actorName || event.actorEmail || "System";

                return (
                  <div key={event.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {humanizeAction(event.action)}
                        </p>
                        <p className="text-xs text-muted-foreground">{actorLabel}</p>
                      </div>

                      <Badge variant="outline">{capitalize(event.resourceType.replace(/_/g, " "))}</Badge>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatEventTime(event.createdAt)}
                      </span>

                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mb-3 ml-12 rounded-lg border bg-muted/30 p-4">
                        <div className="grid gap-2 text-sm">
                          <div className="flex gap-2">
                            <span className="font-medium text-muted-foreground">
                              Event Type:
                            </span>
                            <span>{capitalize(event.resourceType.replace(/_/g, " "))}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium text-muted-foreground">
                              Action:
                            </span>
                            <span className="font-mono text-xs">{event.action}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium text-muted-foreground">
                              Actor:
                            </span>
                            <span>
                              {event.actorName || event.actorEmail
                                ? `${event.actorName ?? ""}${
                                    event.actorEmail ? ` (${event.actorEmail})` : ""
                                  }`.trim()
                                : "System"}
                            </span>
                          </div>
                          {event.resourceId && (
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground">
                                Resource ID:
                              </span>
                              <span className="font-mono text-xs">{event.resourceId}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="font-medium text-muted-foreground">
                              Timestamp:
                            </span>
                            <span>{formatFullTimestamp(event.createdAt)}</span>
                          </div>
                          {event.metadata != null && (
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground">
                                Details:
                              </span>
                              <code className="whitespace-pre-wrap text-xs">
                                {JSON.stringify(event.metadata, null, 2)}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalFiltered === 0
            ? "Showing 0 events"
            : `Showing ${pageStart}–${pageEnd} of ${totalFiltered} events`}
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
