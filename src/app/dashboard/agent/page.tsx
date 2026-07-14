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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Bot,
  Play,
  RefreshCw,
  Power,
  History,
  Volume2,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Hash,
  Clock,
  Package,
  Mic,
  Gauge,
  MessageSquare,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  ShieldQuestion,
  PhoneForwarded,
  MessageCircle,
} from "lucide-react";

const tools = [
  {
    name: "Check Appointments",
    description: "Look up existing appointment details and availability",
    icon: CalendarCheck,
    enabled: true,
  },
  {
    name: "Book Appointment",
    description: "Schedule new appointments for patients",
    icon: CalendarPlus,
    enabled: true,
  },
  {
    name: "Cancel Appointment",
    description: "Cancel or reschedule existing appointments",
    icon: CalendarX,
    enabled: true,
  },
  {
    name: "Check Insurance",
    description: "Verify insurance coverage and eligibility",
    icon: ShieldQuestion,
    enabled: true,
  },
  {
    name: "Transfer Call",
    description: "Transfer caller to a human agent or department",
    icon: PhoneForwarded,
    enabled: true,
  },
  {
    name: "Send SMS",
    description: "Send confirmation or follow-up text messages",
    icon: MessageCircle,
    enabled: true,
  },
];

const policyRules = [
  {
    rule: "Always disclose AI",
    description: "Inform callers they are speaking with an AI assistant",
  },
  {
    rule: "Get recording consent",
    description: "Obtain verbal consent before recording any call",
  },
  {
    rule: "No medical advice",
    description: "Never provide medical diagnoses or treatment recommendations",
  },
  {
    rule: "Escalate emergencies",
    description: "Immediately escalate any life-threatening situations",
  },
];

const escalationRules = [
  {
    condition: "After 3 failed attempts",
    action: "Transfer to queue",
    severity: "medium" as const,
  },
  {
    condition: "Emergency detected",
    action: "Call 911 protocol",
    severity: "critical" as const,
  },
  {
    condition: "Customer requests human",
    action: "Transfer to next available",
    severity: "low" as const,
  },
];

export default function AgentPage() {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Agent Configuration
          </h1>
          <p className="text-muted-foreground">
            Configure your AI calling agent&apos;s behavior, voice, tools, and
            policies.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 size-4" />
            Recompile
          </Button>
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => setIsActive(!isActive)}
          >
            <Power className="mr-2 size-4" />
            {isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="outline" size="sm">
            <Play className="mr-2 size-4" />
            Test Agent
          </Button>
          <Button variant="outline" size="sm">
            <History className="mr-2 size-4" />
            View History
          </Button>
        </div>
      </div>

      {/* Current Config Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            Current Configuration
          </CardTitle>
          <CardDescription>
            Active deployment status and version information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Version</p>
                <p className="font-semibold">v2.4.1</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Hash className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Config Hash</p>
                <p className="font-mono font-semibold">a3f8c2...</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Clock className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Compiled</p>
                <p className="font-semibold">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Package className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry Pack</p>
                <p className="font-semibold">Healthcare Pro</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voice Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="size-5" />
              Voice Settings
            </CardTitle>
            <CardDescription>
              Voice profile and speech configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Voice</span>
              </div>
              <span className="text-sm font-medium">Sarah (Female)</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tone</span>
              </div>
              <span className="text-sm font-medium">
                Professional &amp; Warm
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pace</span>
              </div>
              <span className="text-sm font-medium">Normal (1.0x)</span>
            </div>
            <Separator />
            <div>
              <span className="text-sm text-muted-foreground">
                Greeting Message
              </span>
              <p className="mt-2 text-sm italic text-foreground/70">
                &quot;Hello, thank you for calling Acme Health Clinic. My name
                is Sarah, your virtual assistant. How may I help you
                today?&quot;
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enabled Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5" />
              Enabled Tools
            </CardTitle>
            <CardDescription>
              Capabilities available to the agent during calls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <tool.icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{tool.name}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                  <Switch checked={tool.enabled} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Policy Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Policy Rules
            </CardTitle>
            <CardDescription>
              Compliance and behavioral guardrails for the agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {policyRules.map((policy) => (
                <div
                  key={policy.rule}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">{policy.rule}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {policy.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Escalation Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Escalation Rules
            </CardTitle>
            <CardDescription>
              Conditions that trigger agent handoff or escalation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {escalationRules.map((rule) => (
                <div
                  key={rule.condition}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rule.severity === "critical"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {rule.severity}
                      </Badge>
                      <span className="text-sm font-medium">
                        {rule.condition}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Action: {rule.action}
                    </p>
                  </div>
                  <PhoneForwarded className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
