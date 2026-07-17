import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { getAgentConfig } from "@/domain/agents/service";
import type { Json } from "@/lib/database/types";

// ─────────────────────────────────────────────────────────────────────────
// This endpoint powers the Test Center's "Text Simulator". It takes a raw
// caller statement and matches it against the tenant's currently active
// agent configuration's compiled intent catalog (activeIntents, as produced
// by industries/core/compiler.ts and stored on agent_config_versions.snapshot).
// Matching is a deterministic token-overlap (Jaccard) scorer — no external
// LLM call — so the result is always grounded in this tenant's real,
// currently-active intents rather than canned copy.
// ─────────────────────────────────────────────────────────────────────────

const analyzeSchema = z.object({
  text: z.string().trim().min(1, "Caller statement is required").max(2000),
});

interface SnapshotSlot {
  name?: string;
  required?: boolean;
  description?: string;
}

interface SnapshotIntentExample {
  text?: string;
}

interface SnapshotIntent {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  examples?: SnapshotIntentExample[];
  slots?: SnapshotSlot[];
}

interface AgentSnapshot {
  business_name?: string;
  activeIntents?: SnapshotIntent[];
}

function asSnapshot(json: Json): AgentSnapshot {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    return json as AgentSnapshot;
  }
  return {};
}

const STOPWORDS = new Set([
  "a", "an", "the", "i", "im", "i'm", "you", "your", "yours", "me", "my",
  "is", "are", "was", "were", "be", "been", "to", "of", "for", "and", "or",
  "on", "in", "at", "with", "it", "this", "that", "please", "hi", "hello",
  "hey", "can", "could", "would", "just", "so", "about", "need", "want",
]);

function tokenize(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9']+/)
      .filter((token) => token.length > 1 && !STOPWORDS.has(token)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreIntent(inputTokens: Set<string>, intent: SnapshotIntent): number {
  const exampleScores = (intent.examples ?? []).map((example) =>
    example.text ? jaccardSimilarity(inputTokens, tokenize(example.text)) : 0,
  );
  const bestExampleScore = exampleScores.length > 0 ? Math.max(...exampleScores) : 0;

  const nameDescTokens = tokenize(`${intent.name ?? ""} ${intent.description ?? ""}`);
  const nameDescScore = jaccardSimilarity(inputTokens, nameDescTokens);

  return bestExampleScore * 0.8 + nameDescScore * 0.2;
}

function buildSuggestedResponse(
  intent: SnapshotIntent | null,
  businessName: string,
): string {
  if (!intent || !intent.name) {
    return "I want to make sure I understand — could you tell me a bit more about what you're calling about today?";
  }

  const requiredSlots = (intent.slots ?? []).filter(
    (slot) => slot.required && (slot.description || slot.name),
  );

  if (requiredSlots.length > 0) {
    const asks = requiredSlots
      .slice(0, 2)
      .map((slot) => (slot.description ?? slot.name ?? "").replace(/\.$/, "").toLowerCase())
      .filter(Boolean)
      .join(" and ");
    return `I'd be happy to help with that. Could you share ${asks || "a few more details"}?`;
  }

  return `I'd be happy to help with ${intent.name.toLowerCase()}${
    businessName ? ` at ${businessName}` : ""
  }. Let me take care of that for you.`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const tenantId = await getCurrentTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant configured for this account" },
        { status: 403 },
      );
    }

    const activeConfig = await getAgentConfig(tenantId);
    if (!activeConfig) {
      return NextResponse.json(
        {
          error:
            "This tenant doesn't have an active agent configuration. Compile and activate a config before testing.",
        },
        { status: 404 },
      );
    }

    const { data: versionRow, error: versionError } = await supabase
      .from("agent_config_versions")
      .select("snapshot")
      .eq("id", activeConfig.agent_config_version_id)
      .maybeSingle();

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }

    const snapshot = versionRow ? asSnapshot(versionRow.snapshot) : {};
    const intents = snapshot.activeIntents ?? [];
    const businessName = snapshot.business_name ?? "";

    if (intents.length === 0) {
      return NextResponse.json({
        matched: false,
        intentName: "Unclear",
        intentCategory: null,
        confidence: 0,
        suggestedResponse: buildSuggestedResponse(null, businessName),
        note: "This tenant's active configuration has no intents defined to match against.",
      });
    }

    const inputTokens = tokenize(parsed.data.text);

    let bestIntent: SnapshotIntent | null = null;
    let bestScore = 0;

    for (const intent of intents) {
      const score = scoreIntent(inputTokens, intent);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const CONFIDENCE_THRESHOLD = 0.12;
    const matched = bestIntent !== null && bestScore >= CONFIDENCE_THRESHOLD;
    const confidence = Math.round(Math.min(bestScore, 1) * 100);
    const resolvedIntent = matched ? bestIntent : null;

    return NextResponse.json({
      matched,
      intentName: resolvedIntent
        ? resolvedIntent.name ?? resolvedIntent.id ?? "Unknown intent"
        : "Unclear",
      intentCategory: resolvedIntent?.category ?? null,
      confidence,
      suggestedResponse: buildSuggestedResponse(resolvedIntent, businessName),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
