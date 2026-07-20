import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
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

  const [{ data: versionRow }, { data: tenant }] = await Promise.all([
    supabase
      .from("agent_config_versions")
      .select("version, snapshot, draft_id")
      .eq("id", activeConfig.agent_config_version_id)
      .maybeSingle(),
    // Additive, tenant-scoped read of the industry only, so the active
    // vertical can be badged in its jewel. Same column the Overview page reads.
    supabase.from("tenants").select("industry").eq("id", tenantId).maybeSingle(),
  ]);

  const snapshot = versionRow ? asAgentSnapshot(versionRow.snapshot) : {};
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
        <TabsContent value="overview" className="space-y-4">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5" />
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
