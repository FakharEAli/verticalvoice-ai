import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";

export type Industry = "healthcare" | "restaurant" | "real_estate";

export interface CreateTenantInput {
  name: string;
  industry: Industry;
  userId: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function createTenant(input: CreateTenantInput) {
  // Bootstrapping a brand-new tenant has no RLS-eligible session context yet
  // (tenants/tenant_members/business_profiles/etc. have no INSERT policy that
  // a not-yet-a-member user can satisfy), so this runs as the service role,
  // same as the webhook/worker admin-client pattern.
  const supabase = createAdminClient();
  const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: input.name, slug, industry: input.industry })
    .select()
    .single();

  if (tenantError) throw new Error(`Failed to create tenant: ${tenantError.message}`);

  const { error: memberError } = await supabase
    .from("tenant_members")
    .insert({ tenant_id: tenant.id, user_id: input.userId, role: "owner" });

  if (memberError) throw new Error(`Failed to add owner: ${memberError.message}`);

  const { error: profileError } = await supabase
    .from("business_profiles")
    .insert({ tenant_id: tenant.id, business_name: input.name });

  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

  const { error: policyError } = await supabase
    .from("policy_settings")
    .insert({ tenant_id: tenant.id });

  if (policyError) throw new Error(`Failed to create policies: ${policyError.message}`);

  const { error: voiceError } = await supabase
    .from("voice_profiles")
    .insert({ tenant_id: tenant.id });

  if (voiceError) throw new Error(`Failed to create voice profile: ${voiceError.message}`);

  return tenant;
}

export async function getTenantForUser(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(*)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error) return null;
  return { tenantId: data.tenant_id, role: data.role, tenant: data.tenants };
}

export async function getTenantById(tenantId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error) return null;
  return data;
}

export async function updateTenantStatus(tenantId: string, status: string) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("tenants")
    .update({ status })
    .eq("id", tenantId);

  if (error) throw new Error(`Failed to update tenant status: ${error.message}`);
}
