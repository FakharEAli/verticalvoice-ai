import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Json } from "@/lib/database/types";

// Mirrors the active_agent_configs + agent_config_versions schema
export interface AgentConfig {
  id: string;
  tenant_id: string;
  agent_config_version_id: string;
  phone_number_id: string | null;
  location_id: string | null;
  activated_at: string;
  activated_by: string | null;
  created_at: string;
}

export interface AgentConfigVersion {
  id: string;
  tenant_id: string;
  draft_id: string;
  version: number;
  snapshot: Json;
  published_by: string | null;
  published_at: string;
  created_at: string;
}

export async function getAgentConfig(tenantId: string): Promise<AgentConfig | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("active_agent_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("Failed to get agent config", { tenantId, error: error.message });
    throw new Error(`Failed to get agent config: ${error.message}`);
  }

  return data;
}

export async function compileAndSave(tenantId: string): Promise<AgentConfigVersion> {
  const supabase = await createServerClient();

  // Get the current draft to compile from
  const { data: draft, error: draftError } = await supabase
    .from("agent_drafts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (draftError) {
    logger.error("Failed to load agent draft for compilation", { tenantId, error: draftError.message });
    throw new Error(`Failed to load agent draft: ${draftError.message}`);
  }

  // Determine next version number
  const { data: latestVersion } = await supabase
    .from("agent_config_versions")
    .select("version")
    .eq("tenant_id", tenantId)
    .eq("draft_id", draft.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

  // Gather tenant settings needed for the snapshot
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  const { data: voice } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  const snapshot: Record<string, unknown> = {
    draft_id: draft.id,
    system_prompt: draft.system_prompt,
    model: draft.model,
    temperature: draft.temperature,
    tools: draft.tools,
    config: draft.config,
    business_name: profile?.business_name ?? null,
    voice: voice
      ? { provider: voice.provider, voice_id: voice.voice_id, speed: voice.speed, language: voice.language }
      : null,
    compiled_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("agent_config_versions")
    .insert({
      tenant_id: tenantId,
      draft_id: draft.id,
      version: nextVersion,
      snapshot: snapshot as Json,
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to save compiled agent config", { tenantId, error: error.message });
    throw new Error(`Failed to save compiled agent config: ${error.message}`);
  }

  logger.info("Agent config compiled and saved", { tenantId, version: nextVersion });
  return data;
}

export async function activateConfig(tenantId: string, configVersionId: string): Promise<void> {
  const supabase = await createServerClient();

  // Verify the version belongs to this tenant
  const { data: version, error: findError } = await supabase
    .from("agent_config_versions")
    .select("id")
    .eq("id", configVersionId)
    .eq("tenant_id", tenantId)
    .single();

  if (findError || !version) {
    throw new Error("Config version not found for this tenant");
  }

  // Remove current active config for this tenant
  const { error: deleteError } = await supabase
    .from("active_agent_configs")
    .delete()
    .eq("tenant_id", tenantId);

  if (deleteError) {
    logger.error("Failed to remove previous active config", { tenantId, error: deleteError.message });
    throw new Error(`Failed to deactivate previous config: ${deleteError.message}`);
  }

  // Insert new active config
  const { error } = await supabase
    .from("active_agent_configs")
    .insert({
      tenant_id: tenantId,
      agent_config_version_id: configVersionId,
      activated_at: new Date().toISOString(),
    });

  if (error) {
    logger.error("Failed to activate config", { tenantId, configVersionId, error: error.message });
    throw new Error(`Failed to activate config: ${error.message}`);
  }

  logger.info("Agent config activated", { tenantId, configVersionId });
}

export async function deactivateConfig(tenantId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("active_agent_configs")
    .delete()
    .eq("tenant_id", tenantId);

  if (error) {
    logger.error("Failed to deactivate config", { tenantId, error: error.message });
    throw new Error(`Failed to deactivate config: ${error.message}`);
  }

  logger.info("Agent config deactivated", { tenantId });
}

export async function rollbackConfig(tenantId: string, versionId: string): Promise<void> {
  // Verify the target version belongs to this tenant
  const supabase = await createServerClient();
  const { data: target, error: findError } = await supabase
    .from("agent_config_versions")
    .select("id, version")
    .eq("id", versionId)
    .eq("tenant_id", tenantId)
    .single();

  if (findError || !target) {
    throw new Error("Config version not found for this tenant");
  }

  // Activate the target version (which handles deactivating the current one)
  await activateConfig(tenantId, target.id);

  logger.info("Agent config rolled back", { tenantId, rolledBackTo: target.version });
}

export async function listVersions(tenantId: string): Promise<AgentConfigVersion[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("agent_config_versions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("version", { ascending: false });

  if (error) {
    logger.error("Failed to list agent config versions", { tenantId, error: error.message });
    throw new Error(`Failed to list config versions: ${error.message}`);
  }

  return data ?? [];
}
