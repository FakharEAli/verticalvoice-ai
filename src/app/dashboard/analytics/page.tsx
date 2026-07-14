"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Clock,
  Phone,
  DollarSign,
  BarChart3,
  Calculator,
  Target,
} from "lucide-react";

const callVolumeData = [
  { day: "Mon", calls: 28 },
  { day: "Tue", calls: 35 },
  { day: "Wed", calls: 22 },
  { day: "Thu", calls: 30 },
  { day: "Fri", calls: 18 },
  { day: "Sat", calls: 12 },
  { day: "Sun", calls: 23 },
];

const intentDistribution = [
  { intent: "Appointment Scheduling", percentage: 45, color: "bg-primary" },
  { intent: "General Inquiry", percentage: 25, color: "bg-blue-500" },
  { intent: "Prescription Refill", percentage: 15, color: "bg-emerald-500" },
  { intent: "Insurance Question", percentage: 10, color: "bg-amber-500" },
  { intent: "Emergency Triage", percentage: 5, color: "bg-red-500" },
];

const topIntents = [
  { intent: "Appointment Scheduling", count: 76, avgDuration: "2:12", resolution: "92%" },
  { intent: "General Inquiry", count: 42, avgDuration: "1:45", resolution: "88%" },
  { intent: "Prescription Refill", count: 25, avgDuration: "3:10", resolution: "84%" },
  { intent: "Insurance Question", count: 17, avgDuration: "4:02", resolution: "76%" },
  { intent: "Emergency Triage", count: 8, avgDuration: "1:20", resolution: "95%" },
];

const costBreakdown = [
  { label: "Telephony", amount: 12.3 },
  { label: "AI Processing", amount: 8.2 },
  { label: "SMS Notifications", amount: 2.0 },
  { label: "Storage", amount: 2.0 },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>("7d");
  const [costPerCall, setCostPerCall] = useState(8);
  const [callsHandled, setCallsHandled] = useState(168);

  const maxCalls = Math.max(...callVolumeData.map((d) => d.calls));
  const aiCost = 24.5;
  const traditionalCost = costPerCall * callsHandled;
  const savings = traditionalCost - aiCost;
  const roi = traditionalCost > 0 ? ((savings / aiCost) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Call performance metrics and cost analysis.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { label: "Today", value: "today" },
            { label: "7 Days", value: "7d" },
            { label: "30 Days", value: "30d" },
            { label: "Custom", value: "custom" },
          ].map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Call Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Call Volume
          </CardTitle>
          <CardDescription>Calls received over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2" style={{ height: 200 }}>
            {callVolumeData.map((d) => {
              const heightPercent = (d.calls / maxCalls) * 100;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {d.calls}
                  </span>
                  <div
                    className="w-full max-w-12 rounded-t-md bg-primary transition-all"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Intent Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5" />
            Intent Distribution
          </CardTitle>
          <CardDescription>Breakdown of caller intents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {intentDistribution.map((item) => (
            <div key={item.intent} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.intent}</span>
                <span className="font-medium">{item.percentage}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${item.color} transition-all`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <TrendingUp className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">87%</span>
              <span className="flex items-center text-xs text-green-600">
                <TrendingUp className="mr-0.5 size-3" />
                +3.2%
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              vs. previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2:34</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Minutes per call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">168</div>
            <p className="mt-1 text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24.50</div>
            <p className="mt-1 text-xs text-muted-foreground">
              All services combined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Intents Table + Cost Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Intents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Intents</CardTitle>
            <CardDescription>Most common caller intents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Intent</th>
                    <th className="pb-2 font-medium">Count</th>
                    <th className="pb-2 font-medium">Avg Duration</th>
                    <th className="pb-2 font-medium">Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {topIntents.map((row) => (
                    <tr key={row.intent} className="border-b last:border-0">
                      <td className="py-2 font-medium">{row.intent}</td>
                      <td className="py-2">{row.count}</td>
                      <td className="py-2">{row.avgDuration}</td>
                      <td className="py-2">
                        <Badge variant="outline">{row.resolution}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-5" />
              Cost Summary
            </CardTitle>
            <CardDescription>Breakdown of costs this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {costBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">$24.50</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="size-5" />
            ROI Calculator
          </CardTitle>
          <CardDescription>
            Compare AI agent costs vs. traditional call center expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cost-per-call">
                  Average call center cost per call
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cost-per-call"
                    type="number"
                    value={costPerCall}
                    onChange={(e) => setCostPerCall(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calls-handled">
                  Calls handled by AI this month
                </Label>
                <Input
                  id="calls-handled"
                  type="number"
                  value={callsHandled}
                  onChange={(e) => setCallsHandled(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">AI Cost</p>
                <p className="text-xl font-bold">${aiCost.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Traditional Cost</p>
                <p className="text-xl font-bold">
                  ${traditionalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <p className="text-xs text-green-600 dark:text-green-400">Savings</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  ${savings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs text-primary">ROI</p>
                <p className="text-xl font-bold text-primary">
                  {roi}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
