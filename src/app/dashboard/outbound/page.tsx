"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhoneOutgoing, Loader2, AlertTriangle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OutboundVariable {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
}

interface OutboundCallType {
  id: string;
  name: string;
  description: string;
  category: string;
  requiresConsent: boolean;
  maxAttempts?: number;
  variables: OutboundVariable[];
}

interface OutboundTypesResponse {
  industry: string;
  allowOutbound: boolean;
  hasPhoneNumber: boolean;
  callTypes: OutboundCallType[];
}

const categoryLabel: Record<string, string> = {
  reminder: "Reminder",
  confirmation: "Confirmation",
  alert: "Alert",
  outreach: "Outreach",
  campaign: "Campaign",
};

export default function OutboundCallsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OutboundTypesResponse | null>(null);
  const [togglingOutbound, setTogglingOutbound] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [toNumber, setToNumber] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [placingCall, setPlacingCall] = useState(false);

  useEffect(() => {
    async function loadTypes() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/calls/outbound/types");
        const body = await res.json();
        if (!res.ok) {
          toast.error(body.error ?? "Failed to load outbound call types.");
          return;
        }
        setData(body);
        setSelectedTypeId((prev) => prev ?? body.callTypes?.[0]?.id ?? null);
      } catch {
        toast.error("Failed to load outbound call types.");
      } finally {
        setLoading(false);
      }
    }
    loadTypes();
  }, []);

  async function handleToggleOutbound(checked: boolean) {
    setTogglingOutbound(true);
    try {
      const res = await fetch("/api/v1/settings/outbound", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow_outbound: checked }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Failed to update outbound calling setting.");
        return;
      }
      setData((prev) => (prev ? { ...prev, allowOutbound: checked } : prev));
      toast.success(checked ? "Outbound calling enabled." : "Outbound calling disabled.");
    } catch {
      toast.error("Failed to update outbound calling setting.");
    } finally {
      setTogglingOutbound(false);
    }
  }

  const selectedType = data?.callTypes.find((t) => t.id === selectedTypeId) ?? null;

  function handleSelectType(typeId: string) {
    setSelectedTypeId(typeId);
    setVariables({});
  }

  async function handlePlaceCall(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;

    const missing = selectedType.variables.filter(
      (v) => v.required && !variables[v.name]?.trim()
    );
    if (!toNumber.trim()) {
      toast.error("Enter a phone number to call.");
      return;
    }
    if (missing.length > 0) {
      toast.error(`Fill in required fields: ${missing.map((v) => v.label).join(", ")}`);
      return;
    }

    setPlacingCall(true);
    try {
      const res = await fetch("/api/v1/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_number: toNumber,
          call_type_id: selectedType.id,
          variables,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Failed to place the call.");
        return;
      }
      toast.success("Call placed! It should ring shortly.");
      router.push(`/dashboard/calls/${body.data.id}`);
    } catch {
      toast.error("Failed to place the call.");
    } finally {
      setPlacingCall(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading outbound calling settings…
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn&apos;t load outbound calling</CardTitle>
          <CardDescription>Try refreshing the page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Outbound Calls</h1>
        <p className="text-muted-foreground">
          Have your AI agent place real calls — reminders, confirmations, alerts, and outreach.
        </p>
      </div>

      {!data.hasPhoneNumber && (
        <Card className="border-yellow-500/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium">No phone number assigned</p>
              <p className="text-sm text-muted-foreground">
                This tenant has no active phone number to call from yet, so outbound calls can&apos;t be placed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Enable Outbound Calling</CardTitle>
            <CardDescription>
              Allow this agent to place calls on your behalf.
            </CardDescription>
          </div>
          <Switch
            checked={data.allowOutbound}
            onCheckedChange={handleToggleOutbound}
            disabled={togglingOutbound}
          />
        </CardHeader>
      </Card>

      {data.allowOutbound && data.hasPhoneNumber && (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call Type</CardTitle>
              <CardDescription>
                Available for your {data.industry.replace("_", " ")} business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.callTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleSelectType(type.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedTypeId === type.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{type.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {categoryLabel[type.category] ?? type.category}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
                  {type.requiresConsent && (
                    <p className="mt-1 text-[11px] text-yellow-600 dark:text-yellow-400">
                      Requires prior opt-in
                    </p>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedType ? selectedType.name : "Select a call type"}
              </CardTitle>
              <CardDescription>
                {selectedType?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedType && (
                <form onSubmit={handlePlaceCall} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="to-number">Phone number to call</Label>
                    <Input
                      id="to-number"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={toNumber}
                      onChange={(e) => setToNumber(e.target.value)}
                      required
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedType.variables.map((v) => (
                      <div key={v.name} className="space-y-2">
                        <Label htmlFor={`var-${v.name}`}>
                          {v.label}
                          {v.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <Input
                          id={`var-${v.name}`}
                          type={
                            v.type === "date"
                              ? "date"
                              : v.type === "time"
                                ? "time"
                                : v.type === "number" || v.type === "currency"
                                  ? "number"
                                  : "text"
                          }
                          placeholder={v.description}
                          value={variables[v.name] ?? ""}
                          onChange={(e) =>
                            setVariables((prev) => ({ ...prev, [v.name]: e.target.value }))
                          }
                          required={v.required}
                        />
                      </div>
                    ))}
                  </div>

                  <Button type="submit" disabled={placingCall} className="w-full sm:w-auto">
                    {placingCall ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <PhoneOutgoing className="mr-2 size-4" />
                    )}
                    {placingCall ? "Placing call…" : "Place Call"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
