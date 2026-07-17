import Link from "next/link";
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
  TrendingDown,
  Clock,
  Phone,
  DollarSign,
  BarChart3,
  Calculator,
  Target,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";

// NOTE: caller-intent classification isn't stored on the `calls` table today,
// so this breakdown is illustrative sample data (clearly labeled below) and
// not derived from real tenant data like the rest of this page.
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

type Period = "today" | "7d" | "30d" | "custom";

interface DateRange {
  start: Date;
  end: Date; // exclusive
}

interface CostRow {
  telephony_cost: number;
  stt_cost: number;
  tts_cost: number;
  llm_cost: number;
  total_cost: number;
}

function isPeriod(value: string | undefined): value is Period {
  return value === "today" || value === "7d" || value === "30d" || value === "custom";
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveRange(period: Period, from: string | undefined, to: string | undefined): DateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  if (period === "today") {
    return { start: todayStart, end: tomorrowStart };
  }
  if (period === "30d") {
    return { start: addDays(todayStart, -29), end: tomorrowStart };
  }
  if (period === "custom") {
    const fromDate = parseDateInput(from);
    const toDate = parseDateInput(to);
    if (fromDate && toDate && fromDate <= toDate) {
      return { start: startOfDay(fromDate), end: addDays(startOfDay(toDate), 1) };
    }
  }
  return { start: addDays(todayStart, -6), end: tomorrowStart };
}

function previousRange(range: DateRange): DateRange {
  const lengthMs = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - lengthMs), end: new Date(range.start) };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function buildDailyBuckets(
  range: DateRange,
  calls: Array<{ started_at: string }>
): Array<{ label: string; calls: number }> {
  const days: Array<{ key: string; label: string }> = [];
  let cursor = new Date(range.start);
  while (cursor < range.end) {
    days.push({
      key: cursor.toDateString(),
      label: cursor.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
    });
    cursor = addDays(cursor, 1);
  }
  const counts = new Map<string, number>();
  for (const call of calls) {
    const key = new Date(call.started_at).toDateString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ label: d.label, calls: counts.get(d.key) ?? 0 }));
}

function buildHourBlockBuckets(
  calls: Array<{ started_at: string }>,
  blockHours = 4
): Array<{ label: string; calls: number }> {
  const numBlocks = 24 / blockHours;
  const counts = new Array(numBlocks).fill(0) as number[];
  for (const call of calls) {
    const hour = new Date(call.started_at).getHours();
    const idx = Math.floor(hour / blockHours);
    counts[idx] = (counts[idx] ?? 0) + 1;
  }
  return counts.map((count, i) => {
    const startHour = i * blockHours;
    const label = `${startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour}${startHour < 12 ? "am" : "pm"}`;
    return { label, calls: count };
  });
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
    costPerCall?: string;
    callsHandled?: string;
  }>;
}) {
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

  const params = await searchParams;
  const period: Period = isPeriod(params.period) ? params.period : "7d";
  const range = resolveRange(period, params.from, params.to);
  const prevRange = previousRange(range);

  const [{ data: callsRaw }, { data: prevCallsRaw }] = await Promise.all([
    supabase
      .from("calls")
      .select("id, status, duration_seconds, started_at")
      .eq("tenant_id", tenantId)
      .gte("started_at", range.start.toISOString())
      .lt("started_at", range.end.toISOString()),
    supabase
      .from("calls")
      .select("status")
      .eq("tenant_id", tenantId)
      .gte("started_at", prevRange.start.toISOString())
      .lt("started_at", prevRange.end.toISOString()),
  ]);

  const calls = callsRaw ?? [];
  const prevCalls = prevCallsRaw ?? [];
  const callIds = calls.map((c) => c.id);

  let costRows: CostRow[] = [];
  if (callIds.length > 0) {
    const { data: costData } = await supabase
      .from("call_costs")
      .select("telephony_cost, stt_cost, tts_cost, llm_cost, total_cost")
      .eq("tenant_id", tenantId)
      .in("call_id", callIds);
    costRows = costData ?? [];
  }

  const totalCalls = calls.length;
  const completedCalls = calls.filter((c) => c.status === "completed").length;
  const resolutionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
  const durations = calls
    .map((c) => c.duration_seconds)
    .filter((d): d is number => typeof d === "number");
  const avgDurationSeconds =
    durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

  const prevCompletedCalls = prevCalls.filter((c) => c.status === "completed").length;
  const prevResolutionRate =
    prevCalls.length > 0 ? (prevCompletedCalls / prevCalls.length) * 100 : null;
  const resolutionDelta = prevResolutionRate !== null ? resolutionRate - prevResolutionRate : null;

  const telephonyCost = costRows.reduce((sum, c) => sum + c.telephony_cost, 0);
  const aiProcessingCost = costRows.reduce((sum, c) => sum + c.stt_cost + c.tts_cost + c.llm_cost, 0);
  const totalCost = costRows.reduce((sum, c) => sum + c.total_cost, 0);

  const chartData = period === "today" ? buildHourBlockBuckets(calls) : buildDailyBuckets(range, calls);
  const maxCalls = Math.max(1, ...chartData.map((d) => d.calls));

  const chartDescription =
    period === "today"
      ? "Calls received today, by hour"
      : period === "30d"
        ? "Calls received over the last 30 days"
        : period === "custom"
          ? `Calls received from ${formatDate(range.start)} to ${formatDate(addDays(range.end, -1))}`
          : "Calls received over the last 7 days";

  const costPerCall = Number(params.costPerCall ?? 8) || 0;
  const callsHandledInput = Number(params.callsHandled ?? totalCalls) || 0;
  const traditionalCost = costPerCall * callsHandledInput;
  const savings = traditionalCost - totalCost;
  const roi = totalCost > 0 ? ((savings / totalCost) * 100).toFixed(0) : savings > 0 ? "∞" : "0";

  function periodHref(p: Period): string {
    const search = new URLSearchParams();
    search.set("period", p);
    if (p === "custom") {
      if (params.from) search.set("from", params.from);
      if (params.to) search.set("to", params.to);
    }
    return `/dashboard/analytics?${search.toString()}`;
  }

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
        <div className="flex flex-wrap gap-2">
          {(
            [
              { label: "Today", value: "today" },
              { label: "7 Days", value: "7d" },
              { label: "30 Days", value: "30d" },
              { label: "Custom", value: "custom" },
            ] as const
          ).map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              render={<Link href={periodHref(p.value)} />}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <form action="/dashboard/analytics" method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="period" value="custom" />
          <div className="grid gap-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" name="from" defaultValue={params.from ?? ""} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" name="to" defaultValue={params.to ?? ""} />
          </div>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      )}

      {/* Call Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Call Volume
          </CardTitle>
          <CardDescription>{chartDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {totalCalls === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No calls recorded in this period.
            </p>
          ) : (
            <div className="flex items-end justify-between gap-2" style={{ height: 200 }}>
              {chartData.map((d, i) => {
                const heightPercent = (d.calls / maxCalls) * 100;
                return (
                  <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{d.calls}</span>
                    <div
                      className="w-full max-w-12 rounded-t-md bg-primary transition-all"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intent Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5" />
            Intent Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of caller intents{" "}
            <span className="text-xs">(sample data — intent tracking not yet available)</span>
          </CardDescription>
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
              <span className="text-2xl font-bold">{Math.round(resolutionRate)}%</span>
              {resolutionDelta !== null && (
                <span
                  className={`flex items-center text-xs ${
                    resolutionDelta >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {resolutionDelta >= 0 ? (
                    <TrendingUp className="mr-0.5 size-3" />
                  ) : (
                    <TrendingDown className="mr-0.5 size-3" />
                  )}
                  {resolutionDelta >= 0 ? "+" : ""}
                  {resolutionDelta.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {resolutionDelta !== null ? "vs. previous period" : "no previous-period data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgDurationSeconds)}</div>
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
            <div className="text-2xl font-bold">{totalCalls}</div>
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
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
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
            <CardDescription>
              Most common caller intents{" "}
              <span className="text-xs">(sample data)</span>
            </CardDescription>
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
            {costRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cost data recorded for this period yet.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Telephony</span>
                  <span className="text-sm font-medium">${telephonyCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AI Processing</span>
                  <span className="text-sm font-medium">${aiProcessingCost.toFixed(2)}</span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">${totalCost.toFixed(2)}</span>
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
            Compare AI agent costs vs. traditional call center expenses for this period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/dashboard/analytics" method="get" className="grid gap-6 md:grid-cols-2">
            <input type="hidden" name="period" value={period} />
            {period === "custom" && (
              <>
                <input type="hidden" name="from" value={params.from ?? ""} />
                <input type="hidden" name="to" value={params.to ?? ""} />
              </>
            )}
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
                    name="costPerCall"
                    type="number"
                    defaultValue={costPerCall}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calls-handled">
                  Calls handled by AI this period
                </Label>
                <Input
                  id="calls-handled"
                  name="callsHandled"
                  type="number"
                  defaultValue={callsHandledInput}
                />
              </div>
              <Button type="submit" size="sm">
                Recalculate
              </Button>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">AI Cost</p>
                <p className="text-xl font-bold">${totalCost.toFixed(2)}</p>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
