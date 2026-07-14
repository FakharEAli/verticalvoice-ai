import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Json } from "@/lib/database/types";

// Mirrors knowledge_sources schema from types.ts
export interface KnowledgeSource {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  origin_url: string | null;
  status: string;
  last_synced_at: string | null;
  config: Json | null;
  created_at: string;
  updated_at: string;
}

// Mirrors knowledge_facts schema from types.ts
export interface KnowledgeFact {
  id: string;
  tenant_id: string;
  document_id: string | null;
  chunk_id: string | null;
  fact_text: string;
  category: string | null;
  confidence: number;
  is_verified: boolean;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddSourceInput {
  type: string;
  name: string;
  origin_url?: string;
  config?: Record<string, unknown>;
}

export interface FaqChunk {
  id: string;
  fact_text: string;
  category: string | null;
  confidence: number;
}

export async function addSource(
  tenantId: string,
  source: AddSourceInput
): Promise<KnowledgeSource> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert({
      tenant_id: tenantId,
      type: source.type,
      name: source.name,
      origin_url: source.origin_url ?? null,
      status: "pending",
      config: (source.config ?? {}) as Json,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to add knowledge source", { tenantId, error: error.message });
    throw new Error(`Failed to add knowledge source: ${error.message}`);
  }

  logger.info("Knowledge source added", { tenantId, sourceId: data.id, type: source.type });
  return data;
}

export async function extractFromWebsite(
  tenantId: string,
  url: string
): Promise<KnowledgeSource> {
  const supabase = await createServerClient();

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  // Create the source record in processing state
  const source = await addSource(tenantId, {
    type: "website",
    name: hostname,
    origin_url: url,
    config: { extraction_started_at: new Date().toISOString() },
  });

  // Mark as processing
  const { error: updateError } = await supabase
    .from("knowledge_sources")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", source.id);

  if (updateError) {
    logger.warn("Failed to mark source as processing", { sourceId: source.id });
  }

  // NOTE: Actual extraction is handled asynchronously by a background job.
  // This function creates the source and marks it for processing.
  // The extraction pipeline will:
  // 1. Fetch the URL content
  // 2. Extract facts (business hours, services, FAQs, etc.)
  // 3. Store them in knowledge_facts
  // 4. Update the source status to 'ready' or 'failed'

  logger.info("Website extraction initiated", { tenantId, url, sourceId: source.id });
  return { ...source, status: "processing" };
}

export async function listFacts(tenantId: string): Promise<KnowledgeFact[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("knowledge_facts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to list knowledge facts", { tenantId, error: error.message });
    throw new Error(`Failed to list facts: ${error.message}`);
  }

  return (data ?? []) as KnowledgeFact[];
}

export async function updateFact(
  tenantId: string,
  factId: string,
  value: string
): Promise<KnowledgeFact> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("knowledge_facts")
    .update({
      fact_text: value,
      is_verified: true,
      confidence: 1.0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", factId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to update fact", { tenantId, factId, error: error.message });
    throw new Error(`Failed to update fact: ${error.message}`);
  }

  logger.info("Knowledge fact updated", { tenantId, factId });
  return data as KnowledgeFact;
}

export async function detectConflicts(
  tenantId: string
): Promise<Array<{ category: string; facts: KnowledgeFact[] }>> {
  const supabase = await createServerClient();

  // Use the knowledge_conflicts table if populated, otherwise detect in-memory
  const { data: storedConflicts } = await supabase
    .from("knowledge_conflicts")
    .select("*")
    .eq("tenant_id", tenantId);

  if (storedConflicts && storedConflicts.length > 0) {
    logger.info("Returning stored conflicts", { tenantId, count: storedConflicts.length });
    // Group by category
    const grouped = new Map<string, KnowledgeFact[]>();
    for (const conflict of storedConflicts) {
      const cat = (conflict as Record<string, unknown>).category as string ?? "uncategorized";
      if (!grouped.has(cat)) grouped.set(cat, []);
    }
    return Array.from(grouped.entries()).map(([category, facts]) => ({ category, facts }));
  }

  // Fallback: detect conflicts by finding duplicate fact_text with different values
  const { data: allFacts, error } = await supabase
    .from("knowledge_facts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("category", { ascending: true });

  if (error) {
    logger.error("Failed to detect conflicts", { tenantId, error: error.message });
    throw new Error(`Failed to detect conflicts: ${error.message}`);
  }

  const facts = (allFacts ?? []) as KnowledgeFact[];
  const byCategory = new Map<string, KnowledgeFact[]>();

  for (const fact of facts) {
    const cat = fact.category ?? "uncategorized";
    const existing = byCategory.get(cat) ?? [];
    existing.push(fact);
    byCategory.set(cat, existing);
  }

  const conflicts: Array<{ category: string; facts: KnowledgeFact[] }> = [];

  for (const [category, group] of byCategory) {
    if (group.length <= 1) continue;

    // Check if fact texts actually differ within the same category
    const uniqueTexts = new Set(group.map((f) => f.fact_text.trim().toLowerCase()));
    if (uniqueTexts.size > 1) {
      conflicts.push({ category, facts: group });
    }
  }

  if (conflicts.length > 0) {
    logger.warn("Knowledge conflicts detected", { tenantId, count: conflicts.length });
  }

  return conflicts;
}

export async function getFaqChunks(
  tenantId: string,
  query: string
): Promise<FaqChunk[]> {
  const supabase = await createServerClient();

  // Text-based search over FAQ facts
  // NOTE: For production, this should use vector similarity search via knowledge_chunks.
  // This implementation uses ILIKE as a baseline.
  const { data, error } = await supabase
    .from("knowledge_facts")
    .select("id, fact_text, category, confidence")
    .eq("tenant_id", tenantId)
    .ilike("fact_text", `%${query}%`)
    .order("confidence", { ascending: false })
    .limit(10);

  if (error) {
    logger.error("Failed to search FAQ chunks", { tenantId, error: error.message });
    throw new Error(`Failed to search FAQs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    fact_text: row.fact_text,
    category: row.category,
    confidence: row.confidence,
  }));
}
