"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import Link from "next/link";

type CallOutcome = "Resolved" | "Transferred" | "Missed" | "Voicemail";
type CallDirection = "Inbound" | "Outbound";

interface CallRecord {
  id: string;
  time: string;
  date: string;
  caller: string;
  phone: string;
  duration: string;
  intent: string;
  outcome: CallOutcome;
  direction: CallDirection;
  score: number;
}

const callRecords: CallRecord[] = [
  { id: "call-001", time: "2:34 PM", date: "Jul 14", caller: "Sarah Johnson", phone: "+1 (555) 234-5678", duration: "2:15", intent: "Appointment", outcome: "Resolved", direction: "Inbound", score: 95 },
  { id: "call-002", time: "2:18 PM", date: "Jul 14", caller: "Michael Chen", phone: "+1 (555) 345-6789", duration: "4:02", intent: "Billing Inquiry", outcome: "Resolved", direction: "Inbound", score: 88 },
  { id: "call-003", time: "1:55 PM", date: "Jul 14", caller: "Emily Davis", phone: "+1 (555) 456-7890", duration: "1:45", intent: "Prescription Refill", outcome: "Transferred", direction: "Inbound", score: 72 },
  { id: "call-004", time: "1:32 PM", date: "Jul 14", caller: "James Wilson", phone: "+1 (555) 567-8901", duration: "0:38", intent: "Lab Results", outcome: "Missed", direction: "Inbound", score: 0 },
  { id: "call-005", time: "12:47 PM", date: "Jul 14", caller: "Lisa Martinez", phone: "+1 (555) 678-9012", duration: "3:22", intent: "Appointment", outcome: "Resolved", direction: "Inbound", score: 92 },
  { id: "call-006", time: "12:15 PM", date: "Jul 14", caller: "Robert Taylor", phone: "+1 (555) 789-0123", duration: "2:58", intent: "Insurance Verification", outcome: "Transferred", direction: "Inbound", score: 78 },
  { id: "call-007", time: "11:42 AM", date: "Jul 14", caller: "Amanda Brown", phone: "+1 (555) 890-1234", duration: "1:12", intent: "Referral Request", outcome: "Resolved", direction: "Outbound", score: 91 },
  { id: "call-008", time: "11:08 AM", date: "Jul 14", caller: "David Lee", phone: "+1 (555) 901-2345", duration: "5:10", intent: "Follow-up", outcome: "Voicemail", direction: "Outbound", score: 60 },
  { id: "call-009", time: "10:30 AM", date: "Jul 14", caller: "Karen White", phone: "+1 (555) 012-3456", duration: "2:45", intent: "Appointment", outcome: "Resolved", direction: "Inbound", score: 97 },
  { id: "call-010", time: "10:05 AM", date: "Jul 14", caller: "Thomas Harris", phone: "+1 (555) 123-4567", duration: "3:38", intent: "Medication Question", outcome: "Resolved", direction: "Inbound", score: 85 },
  { id: "call-011", time: "9:22 AM", date: "Jul 14", caller: "Jennifer Clark", phone: "+1 (555) 234-5679", duration: "1:55", intent: "Appointment Cancel", outcome: "Resolved", direction: "Inbound", score: 93 },
  { id: "call-012", time: "9:01 AM", date: "Jul 14", caller: "Christopher Moore", phone: "+1 (555) 345-6780", duration: "4:28", intent: "New Patient Intake", outcome: "Transferred", direction: "Outbound", score: 74 },
];

function outcomeBadge(outcome: CallOutcome) {
  switch (outcome) {
    case "Resolved":
      return <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">Resolved</Badge>;
    case "Transferred":
      return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">Transferred</Badge>;
    case "Missed":
      return <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400">Missed</Badge>;
    case "Voicemail":
      return <Badge variant="secondary">Voicemail</Badge>;
  }
}

function scoreColor(score: number) {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 75) return "text-yellow-600 dark:text-yellow-400";
  if (score > 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Inbound" | "Outbound">("All");

  const filtered = callRecords.filter((call) => {
    const matchesSearch =
      search === "" ||
      call.caller.toLowerCase().includes(search.toLowerCase()) ||
      call.intent.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" || call.direction === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
        <p className="text-muted-foreground">
          View and manage your complete call history.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search calls..."
              className="pl-9 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["All", "Inbound", "Outbound"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">Jul 14, 2026</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Caller</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Intent</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Outcome</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((call) => (
                  <tr key={call.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {call.direction === "Inbound" ? (
                          <PhoneIncoming className="size-3.5 text-muted-foreground" />
                        ) : (
                          <PhoneOutgoing className="size-3.5 text-muted-foreground" />
                        )}
                        {call.time}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{call.caller}</p>
                        <p className="text-xs text-muted-foreground">{call.phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{call.duration}</td>
                    <td className="px-4 py-3">{call.intent}</td>
                    <td className="px-4 py-3">{outcomeBadge(call.outcome)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${scoreColor(call.score)}`}>
                        {call.score > 0 ? call.score : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" render={<Link href={`/dashboard/calls/${call.id}`} />}>
                          <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of 36 calls
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="mr-1 size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page 1 of 3</span>
          <Button variant="outline" size="sm">
            Next
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
