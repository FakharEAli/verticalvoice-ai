"use client";

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
  Activity,
  Phone,
  PhoneCall,
  Target,
  UserCheck,
  Clock,
  PhoneOutgoing,
  BarChart3,
  Settings,
} from "lucide-react";

const recentCalls = [
  { time: "2:34 PM", caller: "Sarah Johnson", duration: "2:15", intent: "Appointment", outcome: "Resolved" as const },
  { time: "2:18 PM", caller: "Michael Chen", duration: "4:02", intent: "Billing Inquiry", outcome: "Resolved" as const },
  { time: "1:55 PM", caller: "Emily Davis", duration: "1:45", intent: "Prescription Refill", outcome: "Transferred" as const },
  { time: "1:32 PM", caller: "James Wilson", duration: "0:38", intent: "Lab Results", outcome: "Missed" as const },
  { time: "12:47 PM", caller: "Lisa Martinez", duration: "3:22", intent: "Appointment", outcome: "Resolved" as const },
  { time: "12:15 PM", caller: "Robert Taylor", duration: "2:58", intent: "Insurance", outcome: "Transferred" as const },
  { time: "11:42 AM", caller: "Amanda Brown", duration: "1:12", intent: "Referral", outcome: "Resolved" as const },
  { time: "11:08 AM", caller: "David Lee", duration: "5:10", intent: "Follow-up", outcome: "Transferred" as const },
];

const integrations = [
  { name: "Twilio", status: "Connected", color: "green" as const },
  { name: "EHR System", status: "Degraded", color: "yellow" as const },
  { name: "Calendar", status: "Connected", color: "green" as const },
];

function outcomeBadge(outcome: "Resolved" | "Transferred" | "Missed") {
  switch (outcome) {
    case "Resolved":
      return <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">Resolved</Badge>;
    case "Transferred":
      return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">Transferred</Badge>;
    case "Missed":
      return <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400">Missed</Badge>;
  }
}

function statusDot(color: "green" | "yellow") {
  if (color === "green") return <span className="inline-block size-2 rounded-full bg-green-500" />;
  return <span className="inline-block size-2 rounded-full bg-yellow-500" />;
}

export default function OverviewPage() {
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
            <CardDescription>Your AI voice agent configuration</CardDescription>
          </div>
          <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
            <span className="mr-1 inline-block size-2 rounded-full bg-green-500" />
            Active
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Industry:</span>
              <span className="font-medium">Healthcare</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Handled</CardTitle>
            <PhoneCall className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="mt-1 text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Target className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="mt-1 text-xs text-muted-foreground">+2% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Human Handoffs</CardTitle>
            <UserCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="mt-1 text-xs text-muted-foreground">Escalated to staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2m 34s</div>
            <p className="mt-1 text-xs text-muted-foreground">Per call</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Calls */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Latest calls handled by your agent today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCalls.map((call, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-4">
                      <span className="w-16 text-sm text-muted-foreground">{call.time}</span>
                      <div>
                        <p className="text-sm font-medium">{call.caller}</p>
                        <p className="text-xs text-muted-foreground">{call.intent}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{call.duration}</span>
                      {outcomeBadge(call.outcome)}
                    </div>
                  </div>
                  {i < recentCalls.length - 1 && <Separator />}
                </div>
              ))}
            </div>
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
              <div className="space-y-3">
                {integrations.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusDot(item.color)}
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start gap-2" variant="outline">
                <PhoneOutgoing className="size-4" aria-hidden="true" />
                Test Call
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <Settings className="size-4" aria-hidden="true" />
                Edit Agent
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
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
