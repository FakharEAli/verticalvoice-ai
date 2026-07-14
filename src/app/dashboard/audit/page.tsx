"use client";

import { useState } from "react";
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
  LogIn,
  Settings,
  Power,
  Phone,
  UserPlus,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type EventType =
  | "Login"
  | "Config"
  | "Activation"
  | "Call"
  | "Team"
  | "Knowledge";

interface AuditEvent {
  id: number;
  type: EventType;
  timestamp: string;
  actor: string;
  actorEmail: string;
  action: string;
  target: string;
}

const eventIcons: Record<EventType, typeof LogIn> = {
  Login: LogIn,
  Config: Settings,
  Activation: Power,
  Call: Phone,
  Team: UserPlus,
  Knowledge: FileText,
};

const eventBadgeVariant: Record<EventType, "default" | "secondary" | "outline"> = {
  Login: "secondary",
  Config: "outline",
  Activation: "default",
  Call: "secondary",
  Team: "outline",
  Knowledge: "secondary",
};

const auditEvents: AuditEvent[] = [
  {
    id: 1,
    type: "Login",
    timestamp: "Today 2:34 PM",
    actor: "Sarah Chen",
    actorEmail: "sarah@acme.com",
    action: "Sarah Chen logged in",
    target: "Dashboard",
  },
  {
    id: 2,
    type: "Config",
    timestamp: "Today 1:22 PM",
    actor: "Mike Johnson",
    actorEmail: "mike@acme.com",
    action: "Mike Johnson updated agent voice settings",
    target: "Agent Configuration",
  },
  {
    id: 3,
    type: "Call",
    timestamp: "Today 12:45 PM",
    actor: "AI Agent",
    actorEmail: "system",
    action: "AI Agent handled call from +1 (555) 234-5678",
    target: "Inbound Call",
  },
  {
    id: 4,
    type: "Activation",
    timestamp: "Today 11:15 AM",
    actor: "Sarah Chen",
    actorEmail: "sarah@acme.com",
    action: "Sarah Chen activated agent v2.4.1",
    target: "Agent Deployment",
  },
  {
    id: 5,
    type: "Team",
    timestamp: "Today 10:30 AM",
    actor: "Sarah Chen",
    actorEmail: "sarah@acme.com",
    action: "Sarah Chen invited alex@acme.com",
    target: "Team Management",
  },
  {
    id: 6,
    type: "Knowledge",
    timestamp: "Today 9:15 AM",
    actor: "Emily Davis",
    actorEmail: "emily@acme.com",
    action: "Emily Davis uploaded Insurance Guide.pdf",
    target: "Knowledge Base",
  },
  {
    id: 7,
    type: "Call",
    timestamp: "Yesterday 4:22 PM",
    actor: "AI Agent",
    actorEmail: "system",
    action: "AI Agent handled call from +1 (555) 876-5432",
    target: "Inbound Call",
  },
  {
    id: 8,
    type: "Config",
    timestamp: "Yesterday 3:10 PM",
    actor: "Mike Johnson",
    actorEmail: "mike@acme.com",
    action: "Mike Johnson updated greeting message",
    target: "Agent Configuration",
  },
  {
    id: 9,
    type: "Login",
    timestamp: "Yesterday 2:00 PM",
    actor: "Emily Davis",
    actorEmail: "emily@acme.com",
    action: "Emily Davis logged in",
    target: "Dashboard",
  },
  {
    id: 10,
    type: "Knowledge",
    timestamp: "Yesterday 11:45 AM",
    actor: "Mike Johnson",
    actorEmail: "mike@acme.com",
    action: "Mike Johnson uploaded FAQ Document.pdf",
    target: "Knowledge Base",
  },
  {
    id: 11,
    type: "Call",
    timestamp: "Yesterday 10:30 AM",
    actor: "AI Agent",
    actorEmail: "system",
    action: "AI Agent handled call from +1 (555) 345-6789",
    target: "Inbound Call",
  },
  {
    id: 12,
    type: "Activation",
    timestamp: "Jul 12, 2026 5:00 PM",
    actor: "Sarah Chen",
    actorEmail: "sarah@acme.com",
    action: "Sarah Chen activated agent v2.4.0",
    target: "Agent Deployment",
  },
];

const eventTypes: EventType[] = [
  "Login",
  "Config",
  "Activation",
  "Call",
  "Team",
  "Knowledge",
];

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<EventType | "All">("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredEvents = auditEvents.filter((event) => {
    const matchesSearch =
      search === "" ||
      event.action.toLowerCase().includes(search.toLowerCase()) ||
      event.actor.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "All" || event.type === filterType;
    return matchesSearch && matchesType;
  });

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
              {type === "Config" ? "Config Change" : type}
            </Button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          Jul 1 &ndash; Jul 14, 2026
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {filteredEvents.map((event) => {
              const Icon = eventIcons[event.type];
              const isExpanded = expandedId === event.id;

              return (
                <div key={event.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : event.id)
                    }
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {event.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor}
                        {event.actorEmail !== "system" &&
                          ` (${event.actorEmail})`}
                      </p>
                    </div>

                    <Badge variant={eventBadgeVariant[event.type]}>
                      {event.type}
                    </Badge>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {event.timestamp}
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
                          <span>{event.type}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium text-muted-foreground">
                            Actor:
                          </span>
                          <span>
                            {event.actor}{" "}
                            {event.actorEmail !== "system" &&
                              `(${event.actorEmail})`}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium text-muted-foreground">
                            Target:
                          </span>
                          <span>{event.target}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium text-muted-foreground">
                            Timestamp:
                          </span>
                          <span>{event.timestamp}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium text-muted-foreground">
                            IP Address:
                          </span>
                          <span>192.168.1.***</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing 1&ndash;12 of 48 events
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
