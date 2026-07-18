import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ShieldCheck,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { getAgentConfig } from "@/domain/agents/service";
import { LiveCallOrb } from "@/components/shared/live-call-orb";
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

/** In-page anchored section nav (no client JS; a plain sticky link row). */
function SectionNav() {
  const items = [
    { id: "overview", label: "Overview" },
    { id: "voice", label: "Voice & Tone" },
    { id: "tools", label: "Tools" },
    { id: "policy", label: "Policy & Behavior" },
  ];
  return (
    <nav
      aria-label="Agent configuration sections"
      className="sticky top-4 z-10 -mx-1 flex flex-wrap gap-1 rounded-lg border border-border bg-card/80 p-1 backdrop-blur"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
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
  const tools = toolList(snapshot.tools);
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

      <SectionNav />

      {/* Current Config Status */}
      <Card id="overview" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            Current Configuration
          </CardTitle>
          <CardDescription>Active deployment status and version information.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voice & Tone */}
        <Card id="voice" className="scroll-mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="size-5" />
              Voice &amp; Tone
            </CardTitle>
            <CardDescription>
              Voice profile and speech configuration captured in this config.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Live sample */}
            <div className="flex justify-center rounded-lg border border-border bg-muted/40 py-5">
              <LiveCallOrb size="md" state="live" accent={accent} showTimer={false} />
            </div>

            {snapshot.voice ? (
              <div className="space-y-4">
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
                  <span className="font-mono text-sm font-medium">
                    {snapshot.voice.voice_id ?? "Not set"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Speed</span>
                  </div>
                  <span className="font-mono text-sm font-medium tabular-nums">
                    {snapshot.voice.speed != null ? `${snapshot.voice.speed}x` : "Default"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Language</span>
                  <span className="text-sm font-medium">{snapshot.voice.language ?? "Not set"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No voice profile was captured in this config.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Model & Tools */}
        <Card id="tools" className="scroll-mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5" />
              Model &amp; Tools
            </CardTitle>
            <CardDescription>
              The language model and capabilities compiled into this config.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Model</span>
              <span className="font-mono text-sm font-medium">{snapshot.model ?? "Not set"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Temperature</span>
              <span className="font-mono text-sm font-medium tabular-nums">
                {snapshot.temperature != null ? snapshot.temperature : "Not set"}
              </span>
            </div>
            <Separator />
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Enabled Tools</p>
              {tools.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tools.map((tool, i) => (
                    <div
                      key={`${tool}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                    >
                      <span className="truncate font-mono text-sm font-medium">{tool}</span>
                      {/* Read-only enabled switch (compiled config is a view) */}
                      <span
                        className="inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-success/70 px-0.5"
                        role="img"
                        aria-label="Enabled"
                      >
                        <span className="ml-auto size-3 rounded-full bg-background" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tools configured.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy & Behavior (system prompt) */}
      <Card id="policy" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Policy &amp; Behavior
          </CardTitle>
          <CardDescription>
            The compiled instructions and guardrails driving this agent&apos;s behavior on calls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.system_prompt ? (
            <div>
              {/*
                Plain checkbox + label toggle instead of native <details>/<summary>.
                This needs no client-side JS (the page stays a Server Component),
                and a <label htmlFor> click reliably toggles its checkbox in every
                browser and automated click tool.
              */}
              <input type="checkbox" id="system-prompt-toggle" className="peer sr-only" />
              <label
                htmlFor="system-prompt-toggle"
                className="inline-flex cursor-pointer select-none items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                View full system prompt ({snapshot.system_prompt.length.toLocaleString()} characters)
              </label>
              <pre className="mt-3 hidden max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed peer-checked:block">
                {snapshot.system_prompt}
              </pre>
            </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
