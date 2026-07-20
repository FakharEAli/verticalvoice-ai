import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Volume2,
  Wrench,
  Hash,
  Clock,
  Package,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Timer,
  FileText,
  Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { getAgentConfig } from "@/domain/agents/service";
import { LiveCallOrb } from "@/components/shared/live-call-orb";
import { SystemPromptEditor } from "./system-prompt-editor";
import { VoiceStudio } from "./voice-studio";
import { EngineConfig } from "./engine-config";
import { ToolManager } from "./tool-manager";
import type { Json } from "@/lib/database/types";

interface AgentSnapshot {
  draft_id?: string;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  tools?: Json;
  business_name?: string;
  voice?: {
    provider?: string;
    voice_id?: string | null;
    speed?: number;
    language?: string;
  } | null;
  compiled_at?: string;
}

function asAgentSnapshot(snapshot: Json): AgentSnapshot {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    return snapshot as AgentSnapshot;
  }
  return {};
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Narrows the Json `tools` field to the string array the compiler emits. */
function toolNames(tools: Json | undefined): string[] {
  if (!Array.isArray(tools)) return [];
  return tools.filter((t): t is string => typeof t === "string");
}

/** "check_table_availability" -> "Check table availability". */
function humanizeTool(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  if (!words) return name;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "fixie-ai/ultravox-70B" -> "ultravox-70B" (full value kept in a title). */
function shortModel(model: string): string {
  const parts = model.split("/");
  return parts[parts.length - 1] || model;
}

/** Seconds -> "3m 20s", or "0m 00s" when there is nothing to show. */
function formatDurationShort(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

/** Vertical jewel metadata: CSS var + display label, else null (neutral). */
function verticalMeta(
  industry: string | null | undefined,
): { label: string; varName: string } | null {
  switch (industry) {
    case "healthcare":
      return { label: "Healthcare", varName: "--vertical-healthcare" };
    case "restaurant":
      return { label: "Restaurant", varName: "--vertical-restaurant" };
    case "real_estate":
    case "realestate":
      return { label: "Real Estate", varName: "--vertical-realestate" };
    default:
      return null;
  }
}

function PageHeader({ vertical }: { vertical: ReturnType<typeof verticalMeta> }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Configuration</h1>
        <p className="text-muted-foreground">
          Real-time view of your active AI calling agent&apos;s compiled configuration.
        </p>
      </div>
      {vertical && (
        <span
          className="inline-flex items-center gap-1.5 rounded-4xl border px-2.5 py-1 text-xs font-medium"
          style={{
            color: `var(${vertical.varName})`,
            borderColor: `color-mix(in srgb, var(${vertical.varName}) 30%, transparent)`,
            backgroundColor: `color-mix(in srgb, var(${vertical.varName}) 12%, transparent)`,
          }}
        >
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ backgroundColor: `var(${vertical.varName})` }}
            aria-hidden="true"
          />
          {vertical.label} pack
        </span>
      )}
    </div>
  );
}

/**
 * One "at a glance" row: which tab owns the setting, the setting itself,
 * and an optional detail line. Icons are decorative.
 */
function GlanceItem({
  icon: Icon,
  tab,
  value,
  detail,
  valueTitle,
  mono,
}: {
  icon: LucideIcon;
  tab: string;
  value: string;
  detail?: string;
  valueTitle?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-4">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"
        aria-hidden="true"
      >
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tab}</p>
        <p
          className={`break-words text-sm font-semibold ${mono ? "font-mono" : ""}`}
          title={valueTitle}
        >
          {value}
        </p>
        {detail ? (
          <p className="break-words text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <PageHeader vertical={null} />
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default async function AgentPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        title="No tenant configured for this account"
        description="Your account isn't linked to any tenant yet, so there's nothing to show here."
      />
    );
  }

  const tenantId = await getCurrentTenantId(user.id);

  if (!tenantId) {
    return (
      <EmptyState
        title="No tenant configured for this account"
        description="Your account isn't linked to any tenant yet, so there's nothing to show here. Contact an administrator to be added to a tenant."
      />
    );
  }

  const activeConfig = await getAgentConfig(tenantId);

  if (!activeConfig) {
    return (
      <EmptyState
        title="No agent configured yet"
        description="This tenant doesn't have an active agent configuration. Compile and activate a config to see it here."
      />
    );
  }

  const [{ data: versionRow }, { data: tenant }, { data: callRows }] = await Promise.all([
    supabase
      .from("agent_config_versions")
      .select("version, snapshot, draft_id")
      .eq("id", activeConfig.agent_config_version_id)
      .maybeSingle(),
    // Additive, tenant-scoped read of the industry only, so the active
    // vertical can be badged in its jewel. Same column the Overview page reads.
    supabase.from("tenants").select("industry").eq("id", tenantId).maybeSingle(),
    // Agent-scoped activity only (how much real traffic this agent has taken,
    // and how much of it this config version has handled). The main Overview
    // page remains the place for full call analytics.
    supabase
      .from("calls")
      .select("status, duration_seconds, started_at")
      .eq("tenant_id", tenantId)
      .eq("is_test", false),
  ]);

  const snapshot = versionRow ? asAgentSnapshot(versionRow.snapshot) : {};

  // Degrade quietly: a null/errored result just means we show no numbers.
  const calls = callRows ?? [];
  const hasCallData = callRows !== null;
  const activatedAtMs = activeConfig.activated_at
    ? new Date(activeConfig.activated_at).getTime()
    : null;
  const callsOnThisVersion =
    activatedAtMs === null
      ? null
      : calls.filter((c) => {
          if (!c.started_at) return false;
          const t = new Date(c.started_at).getTime();
          return Number.isFinite(t) && t >= activatedAtMs;
        }).length;
  const completedDurations = calls
    .filter((c) => c.status === "completed" && typeof c.duration_seconds === "number")
    .map((c) => c.duration_seconds as number);
  const avgDurationSeconds =
    completedDurations.length > 0
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
      : null;

  const tools = toolNames(snapshot.tools);
  const previewTools = tools.slice(0, 3);
  const extraToolCount = Math.max(0, tools.length - previewTools.length);

  const voiceSummary =
    [
      snapshot.voice?.voice_id,
      snapshot.voice?.provider
        ? snapshot.voice.provider.charAt(0).toUpperCase() + snapshot.voice.provider.slice(1)
        : null,
      snapshot.voice?.language,
      typeof snapshot.voice?.speed === "number"
        ? `${snapshot.voice.speed.toFixed(1)}x`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Not set";

  const promptChars = snapshot.system_prompt?.length ?? 0;
  const vertical = verticalMeta(tenant?.industry);
  const accent = vertical ? `var(${vertical.varName})` : "var(--brand)";

  let industryPackName: string | null = null;
  const draftId = snapshot.draft_id ?? versionRow?.draft_id ?? null;
  if (draftId) {
    const { data: draft } = await supabase
      .from("agent_drafts")
      .select("industry_pack_id")
      .eq("id", draftId)
      .maybeSingle();
    if (draft?.industry_pack_id) {
      const { data: pack } = await supabase
        .from("industry_packs")
        .select("name")
        .eq("id", draft.industry_pack_id)
        .maybeSingle();
      industryPackName = pack?.name ?? null;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader vertical={vertical} />

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">
            <Bot className="mr-1.5 size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="voice">
            <Volume2 className="mr-1.5 size-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="engine">
            <Wrench className="mr-1.5 size-4" />
            Engine
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="mr-1.5 size-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="policy">
            <ShieldCheck className="mr-1.5 size-4" />
            Instructions
          </TabsTrigger>
        </TabsList>

        {/* Overview: current config status */}
        <TabsContent value="overview" className="space-y-6">
          {/* Live status hero */}
          <Card>
            <CardContent className="flex flex-col items-center gap-6 py-6 sm:flex-row sm:items-center sm:gap-8">
              <LiveCallOrb size="md" state="live" accent={accent} showTimer={false} />
              <div className="min-w-0 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="success" className="gap-1.5">
                    <span
                      className="inline-block size-1.5 rounded-full bg-current"
                      aria-hidden="true"
                    />
                    Live
                  </Badge>
                  {versionRow?.version != null && (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      v{versionRow.version}
                    </span>
                  )}
                </div>
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {snapshot.business_name ?? "Your business"}
                </h2>
                <p className="max-w-prose text-sm text-muted-foreground">
                  Your agent is answering calls with this configuration. Everything below is
                  compiled and in production right now.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Deployment stats */}
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5" aria-hidden="true" />
              Current Configuration
            </CardTitle>
            <CardDescription>Active deployment status and version information.</CardDescription>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="size-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Version</p>
                <p className="font-mono font-semibold tabular-nums">
                  {versionRow?.version != null ? `v${versionRow.version}` : "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Hash className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Config ID</p>
                <p className="font-mono text-xs font-semibold">
                  {activeConfig.agent_config_version_id.slice(0, 8)}…
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Clock className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activated</p>
                <p className="font-semibold">{formatDate(activeConfig.activated_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                <Package className="size-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry Pack</p>
                <p className="font-semibold">{industryPackName ?? "Custom / none"}</p>
              </div>
            </div>
          </div>

          {/* At a glance: what the other tabs contain */}
          <div className="space-y-4">
            <CardHeader className="px-0">
              <CardTitle className="text-lg">At a glance</CardTitle>
              <CardDescription>
                A summary of what is configured across the other tabs.
              </CardDescription>
            </CardHeader>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <GlanceItem
                icon={Volume2}
                tab="Voice"
                value={voiceSummary}
                detail={
                  snapshot.voice?.voice_id
                    ? "Voice profile compiled into this config."
                    : "No voice profile captured."
                }
              />
              <GlanceItem
                icon={Cpu}
                tab="Engine"
                value={snapshot.model ? shortModel(snapshot.model) : "Not set"}
                valueTitle={snapshot.model ?? undefined}
                mono
                detail={
                  typeof snapshot.temperature === "number"
                    ? `Creativity ${snapshot.temperature}`
                    : "Creativity not set"
                }
              />
              <GlanceItem
                icon={Wrench}
                tab="Tools"
                value={
                  tools.length > 0
                    ? `${tools.length} enabled`
                    : "None enabled"
                }
                detail={
                  previewTools.length > 0
                    ? `${previewTools.map(humanizeTool).join(", ")}${
                        extraToolCount > 0 ? `, +${extraToolCount} more` : ""
                      }`
                    : "No tools compiled into this config."
                }
              />
              <GlanceItem
                icon={FileText}
                tab="Instructions"
                value={promptChars > 0 ? `${promptChars.toLocaleString()} characters` : "Not set"}
                detail={
                  snapshot.compiled_at
                    ? `Compiled ${formatDate(snapshot.compiled_at)}`
                    : "No compile timestamp captured."
                }
              />
            </div>
          </div>

          {/* Agent-scoped call activity */}
          <div className="space-y-4">
            <CardHeader className="px-0">
              <CardTitle className="text-lg">Call activity</CardTitle>
              <CardDescription>
                Real (non test) calls this agent has handled. See the Calls page for full history.
              </CardDescription>
            </CardHeader>
            {hasCallData ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-4" aria-hidden="true" />
                    Total calls
                  </div>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                    {calls.length.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    On this version
                  </div>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                    {callsOnThisVersion !== null ? callsOnThisVersion.toLocaleString() : "0"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="size-4" aria-hidden="true" />
                    Average duration
                  </div>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                    {avgDurationSeconds !== null
                      ? formatDurationShort(avgDurationSeconds)
                      : "No data"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Call activity is unavailable right now.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Voice & Tone */}
        <TabsContent value="voice" className="space-y-5">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="size-5" />
              Voice &amp; Tone
            </CardTitle>
            <CardDescription>
              Voice profile and speech configuration captured in this config.
            </CardDescription>
          </CardHeader>
          {/* Live sample */}
          <div className="flex justify-center rounded-lg border border-border bg-muted/40 py-5">
            <LiveCallOrb size="md" state="live" accent={accent} showTimer={false} />
          </div>

          <VoiceStudio currentVoiceId={snapshot.voice?.voice_id ?? null} />
        </TabsContent>

        {/* Model & Tools */}
        <TabsContent value="engine" className="space-y-4">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5" />
              Model &amp; Tools
            </CardTitle>
            <CardDescription>
              The language model and capabilities compiled into this config.
            </CardDescription>
          </CardHeader>
          <EngineConfig
            initialTemperature={snapshot.temperature ?? null}
            initialSpeed={snapshot.voice?.speed ?? null}
            initialLanguage={snapshot.voice?.language ?? null}
            initialModel={snapshot.model ?? null}
          />
        </TabsContent>

        {/* Tools — enable/disable, inspect, and build custom ones */}
        <TabsContent value="tools" className="space-y-4">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5" />
              Tools
            </CardTitle>
            <CardDescription>
              What your agent can actually do on a call. Turn tools on or off, see exactly what each
              one collects, and add your own.
            </CardDescription>
          </CardHeader>
          <ToolManager />
        </TabsContent>

        {/* Policy & Behavior (system prompt) */}
        <TabsContent value="policy" className="space-y-4">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Policy &amp; Behavior
            </CardTitle>
            <CardDescription>
              The instructions and guardrails driving this agent&apos;s behavior on calls.
              Edit them here and save to publish a new version.
            </CardDescription>
          </CardHeader>
          {snapshot.system_prompt ? (
            <SystemPromptEditor initialPrompt={snapshot.system_prompt} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No system prompt was captured in this config.
            </p>
          )}
          {snapshot.compiled_at && (
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Compiled {formatDate(snapshot.compiled_at)}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
