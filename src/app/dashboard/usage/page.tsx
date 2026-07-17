import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Phone, Clock, MessageSquare, HardDrive } from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";

// Fallback used only when the tenant has no explicit limit row in
// `usage_limits` for a given resource, or (for "calls", which isn't a
// tracked usage_limits resource) no dedicated limit exists at all.
const DEFAULT_MINUTE_LIMIT = 1000;
const DEFAULT_CALL_LIMIT = 500;
const DEFAULT_SMS_LIMIT = 200;
const DEFAULT_RECORDING_LIMIT_GB = 5;

interface CostRow {
  telephony_cost: number;
  stt_cost: number;
  tts_cost: number;
  llm_cost: number;
  total_cost: number;
}

interface BillingPeriod {
  start: Date;
  end: Date; // exclusive
  label: string;
  isBillingCycle: boolean;
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

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function percentUsed(used: number, limit: number): number {
  return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
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

export default async function UsagePage() {
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

  // Resolve the current billing period. Falls back to calendar
  // month-to-date (clearly labeled as such) when no billing account is on
  // file, so the period basis is never silently ambiguous.
  const { data: billingAccount } = await supabase
    .from("billing_accounts")
    .select("current_period_start, current_period_end")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  let period: BillingPeriod;
  if (billingAccount?.current_period_start && billingAccount?.current_period_end) {
    const start = new Date(billingAccount.current_period_start);
    const end = new Date(billingAccount.current_period_end);
    period = {
      start,
      end,
      label: `${formatDate(start)} – ${formatDate(end)} (billing cycle)`,
      isBillingCycle: true,
    };
  } else {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = addDays(startOfDay(now), 1);
    period = {
      start,
      end,
      label: `${formatDate(start)} – ${formatDate(now)} (calendar month-to-date — no billing cycle on file)`,
      isBillingCycle: false,
    };
  }

  const [{ data: callsRaw }, { data: usageRowsRaw }, { data: limitRowsRaw }] = await Promise.all([
    supabase
      .from("calls")
      .select("id, status, duration_seconds, started_at")
      .eq("tenant_id", tenantId)
      .gte("started_at", period.start.toISOString())
      .lt("started_at", period.end.toISOString()),
    supabase
      .from("usage_ledger")
      .select("resource, quantity, unit")
      .eq("tenant_id", tenantId)
      .gte("recorded_at", period.start.toISOString())
      .lt("recorded_at", period.end.toISOString()),
    supabase.from("usage_limits").select("resource, limit_value").eq("tenant_id", tenantId),
  ]);

  const calls = callsRaw ?? [];
  const callIds = calls.map((c) => c.id);
  const usageRows = usageRowsRaw ?? [];
  const limitRows = limitRowsRaw ?? [];

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
  const totalMinutes = calls.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / 60;
  const smsSent = usageRows.filter((r) => r.resource === "sms").reduce((sum, r) => sum + r.quantity, 0);
  const recordingGb = usageRows
    .filter((r) => r.resource === "recording_storage")
    .reduce((sum, r) => sum + r.quantity, 0);

  const telephonyCost = costRows.reduce((sum, c) => sum + c.telephony_cost, 0);
  const aiProcessingCost = costRows.reduce((sum, c) => sum + c.stt_cost + c.tts_cost + c.llm_cost, 0);
  const totalCost = costRows.reduce((sum, c) => sum + c.total_cost, 0);

  function limitFor(resource: string, fallback: number): number {
    const row = limitRows.find((r) => r.resource === resource);
    return row?.limit_value ?? fallback;
  }

  const minuteLimit = limitFor("call_minutes", DEFAULT_MINUTE_LIMIT);
  const smsLimit = limitFor("sms", DEFAULT_SMS_LIMIT);
  const recordingLimit = limitFor("recording_storage", DEFAULT_RECORDING_LIMIT_GB);

  const usageItems = [
    {
      title: "Minutes Used",
      percent: percentUsed(totalMinutes, minuteLimit),
      icon: Clock,
      display: `${Math.round(totalMinutes)} / ${minuteLimit.toLocaleString()}`,
    },
    {
      title: "Calls",
      percent: percentUsed(totalCalls, DEFAULT_CALL_LIMIT),
      icon: Phone,
      display: `${totalCalls} / ${DEFAULT_CALL_LIMIT.toLocaleString()}`,
    },
    {
      title: "SMS Sent",
      percent: percentUsed(smsSent, smsLimit),
      icon: MessageSquare,
      display: `${smsSent} / ${smsLimit.toLocaleString()}`,
    },
    {
      title: "Recordings",
      percent: percentUsed(recordingGb, recordingLimit),
      icon: HardDrive,
      display: `${recordingGb.toFixed(1)} GB / ${recordingLimit} GB`,
    },
  ];

  const costRowsDisplay = [
    {
      item: "Telephony",
      quantity: `${Math.round(totalMinutes)} min`,
      rate: totalMinutes > 0 ? `$${(telephonyCost / totalMinutes).toFixed(3)}/min` : "—",
      total: `$${telephonyCost.toFixed(2)}`,
    },
    {
      item: "AI Processing",
      quantity: `${totalCalls} calls`,
      rate: totalCalls > 0 ? `$${(aiProcessingCost / totalCalls).toFixed(3)}/call` : "—",
      total: `$${aiProcessingCost.toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Usage &amp; Billing
          </h1>
          <p className="text-muted-foreground">
            Current Period: {period.label}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {usageItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <item.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.display}</div>
              <Progress value={item.percent} className="mt-3" />
              <p className="mt-1 text-xs text-muted-foreground">
                {item.percent}% used
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>
            Itemized costs for the current billing period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {costRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No cost data recorded for this period yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Item
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Quantity
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Rate
                    </th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costRowsDisplay.map((row) => (
                    <tr key={row.item} className="border-b">
                      <td className="py-3">{row.item}</td>
                      <td className="py-3 text-muted-foreground">
                        {row.quantity}
                      </td>
                      <td className="py-3 text-muted-foreground">{row.rate}</td>
                      <td className="py-3 text-right">{row.total}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 font-bold" colSpan={3}>
                      Total
                    </td>
                    <td className="pt-3 text-right font-bold">${totalCost.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Limit Settings</CardTitle>
            <CardDescription>
              Set maximum usage limits for this billing period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="call-limit">Monthly Call Limit</Label>
              <Input id="call-limit" type="number" defaultValue={DEFAULT_CALL_LIMIT} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minute-limit">Monthly Minute Limit</Label>
              <Input id="minute-limit" type="number" defaultValue={minuteLimit} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sms-limit">Monthly SMS Limit</Label>
              <Input id="sms-limit" type="number" defaultValue={smsLimit} />
            </div>
            <Button className="w-full" type="button">
              Save Limits
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Thresholds</CardTitle>
            <CardDescription>
              Get notified when usage approaches your limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="alert-percent">Alert at % of Limit</Label>
              <Input id="alert-percent" type="number" defaultValue={80} />
            </div>
            <Separator />
            <div className="space-y-4">
              <p className="text-sm font-medium">Alert Channels</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="alert-email">Email</Label>
                <Switch id="alert-email" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="alert-sms">SMS</Label>
                <Switch id="alert-sms" />
              </div>
            </div>
            <Button className="w-full" type="button">
              Save Alerts
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
