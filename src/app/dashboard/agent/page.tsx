import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Volume2,
  Wrench,
  Hash,
  Clock,
  Package,
  Mic,
  Gauge,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { getAgentConfig } from "@/domain/agents/service";
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

function toolList(tools: Json | undefined): string[] {
  if (!Array.isArray(tools)) return [];
  return tools.map((tool, i) => {
    if (tool && typeof tool === "object" && !Array.isArray(tool)) {
      const record = tool as Record<string, Json | undefined>;
      const name = record.name ?? record.type;
      if (typeof name === "string") return name;
    }
    if (typeof tool === "string") return tool;
    return `Tool ${i + 1}`;
  });
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Agent Configuration</h1>
      <p className="text-muted-foreground">
        Real-time view of your active AI calling agent&apos;s compiled configuration.
      </p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <PageHeader />
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

  const { data: versionRow } = await supabase
    .from("agent_config_versions")
    .select("version, snapshot, draft_id")
    .eq("id", activeConfig.agent_config_version_id)
    .maybeSingle();

  const snapshot = versionRow ? asAgentSnapshot(versionRow.snapshot) : {};
  const tools = toolList(snapshot.tools);

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
      <PageHeader />

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
                <p className="font-semibold">
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
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Package className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry Pack</p>
                <p className="font-semibold">{industryPackName ?? "Custom / none"}</p>
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
              Voice profile and speech configuration captured in this config.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.voice ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Provider</span>
                  </div>
                  <span className="text-sm font-medium capitalize">
                    {snapshot.voice.provider ?? "Not set"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Voice ID</span>
                  </div>
                  <span className="text-sm font-medium">{snapshot.voice.voice_id ?? "Not set"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Speed</span>
                  </div>
                  <span className="text-sm font-medium">
                    {snapshot.voice.speed != null ? `${snapshot.voice.speed}x` : "Default"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Language</span>
                  <span className="text-sm font-medium">{snapshot.voice.language ?? "Not set"}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No voice profile was captured in this config.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Model & Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5" />
              Model &amp; Tools
            </CardTitle>
            <CardDescription>
              The language model and capabilities compiled into this config.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Model</span>
              <span className="text-sm font-medium">{snapshot.model ?? "Not set"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Temperature</span>
              <span className="text-sm font-medium">
                {snapshot.temperature != null ? snapshot.temperature : "Not set"}
              </span>
            </div>
            <Separator />
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Enabled Tools</p>
              {tools.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tools.map((tool, i) => (
                    <Badge key={`${tool}-${i}`} variant="secondary">
                      {tool}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tools configured.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            The compiled instructions driving this agent&apos;s behavior on calls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.system_prompt ? (
            <div>
              {/*
                Plain checkbox + label toggle instead of native <details>/<summary>.
                This needs no client-side JS (the page stays a Server Component),
                and a <label htmlFor> click reliably toggles its checkbox in every
                browser and automated click tool — unlike native <details>, whose
                "activation behavior" toggle has been unreliable here under
                coordinate-based clicks even though element.click() worked.
              */}
              <input type="checkbox" id="system-prompt-toggle" className="peer sr-only" />
              <label
                htmlFor="system-prompt-toggle"
                className="inline-flex cursor-pointer select-none items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View full system prompt ({snapshot.system_prompt.length.toLocaleString()} characters)
              </label>
              <pre className="mt-3 hidden max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs leading-relaxed peer-checked:block">
                {snapshot.system_prompt}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No system prompt was captured in this config.
            </p>
          )}
          {snapshot.compiled_at && (
            <p className="mt-4 text-xs text-muted-foreground">
              Compiled {formatDate(snapshot.compiled_at)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
