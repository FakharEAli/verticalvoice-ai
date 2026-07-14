"use client";

import { useState } from "react";
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

const usageItems = [
  {
    title: "Minutes Used",
    used: 412,
    limit: 1000,
    unit: "min",
    percent: 41,
    icon: Clock,
    display: "412 / 1,000",
  },
  {
    title: "Calls",
    used: 168,
    limit: 500,
    unit: "",
    percent: 34,
    icon: Phone,
    display: "168 / 500",
  },
  {
    title: "SMS Sent",
    used: 45,
    limit: 200,
    unit: "",
    percent: 23,
    icon: MessageSquare,
    display: "45 / 200",
  },
  {
    title: "Recordings",
    used: 2.1,
    limit: 5,
    unit: "GB",
    percent: 42,
    icon: HardDrive,
    display: "2.1 GB / 5 GB",
  },
];

const costRows = [
  {
    item: "Telephony",
    quantity: "412 min",
    rate: "$0.03/min",
    total: "$12.36",
  },
  {
    item: "AI Processing",
    quantity: "168 calls",
    rate: "$0.05/call",
    total: "$8.40",
  },
  { item: "SMS", quantity: "45 messages", rate: "$0.02/msg", total: "$0.90" },
  {
    item: "Recording Storage",
    quantity: "2.1 GB",
    rate: "$1.00/GB",
    total: "$2.10",
  },
];

export default function UsagePage() {
  const [callLimit, setCallLimit] = useState("500");
  const [minuteLimit, setMinuteLimit] = useState("1000");
  const [smsLimit, setSmsLimit] = useState("200");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [alertEmail, setAlertEmail] = useState(true);
  const [alertSms, setAlertSms] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Usage &amp; Billing
          </h1>
          <p className="text-muted-foreground">
            Current Period: Jul 1 &ndash; Jul 14, 2026
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
                {costRows.map((row) => (
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
                  <td className="pt-3 text-right font-bold">$23.76</td>
                </tr>
              </tbody>
            </table>
          </div>
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
              <Input
                id="call-limit"
                type="number"
                value={callLimit}
                onChange={(e) => setCallLimit(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minute-limit">Monthly Minute Limit</Label>
              <Input
                id="minute-limit"
                type="number"
                value={minuteLimit}
                onChange={(e) => setMinuteLimit(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sms-limit">Monthly SMS Limit</Label>
              <Input
                id="sms-limit"
                type="number"
                value={smsLimit}
                onChange={(e) => setSmsLimit(e.target.value)}
              />
            </div>
            <Button className="w-full">Save Limits</Button>
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
              <Input
                id="alert-percent"
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-4">
              <p className="text-sm font-medium">Alert Channels</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="alert-email">Email</Label>
                <Switch
                  id="alert-email"
                  checked={alertEmail}
                  onCheckedChange={setAlertEmail}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="alert-sms">SMS</Label>
                <Switch
                  id="alert-sms"
                  checked={alertSms}
                  onCheckedChange={setAlertSms}
                />
              </div>
            </div>
            <Button className="w-full">Save Alerts</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
