import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Tenant-isolation / RLS integration tests.
 *
 * These connect DIRECTLY to a live local Supabase stack (not the Next.js
 * server helpers) using @supabase/supabase-js: one service-role client to
 * seed/clean up fixtures, and one anon-key client per authenticated test
 * user to exercise Row Level Security exactly as the app's browser client
 * would.
 *
 * If the local Supabase stack (`supabase start`) isn't reachable, every
 * test in this file is skipped rather than failed, so CI environments
 * without Docker/Supabase running don't hard-fail.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let dbAvailable = false;

async function checkHealth(): Promise<boolean> {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // PostgREST root responds 200 (OpenAPI spec) when reachable.
    return res.status < 500;
  } catch {
    return false;
  }
}

interface TenantFixture {
  tenantId: string;
  userId: string; // public.users.id
  authUserId: string; // auth.users.id
  email: string;
  password: string;
  client: SupabaseClient; // session-scoped, signed in as this user
}

describe("Row Level Security / tenant isolation", () => {
  let admin: SupabaseClient;
  let tenantA: TenantFixture;
  let tenantB: TenantFixture;
  const createdTenantIds: string[] = [];
  const createdAuthUserIds: string[] = [];

  beforeAll(async () => {
    dbAvailable = await checkHealth();
    if (!dbAvailable) return;

    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const suffix = randomUUID().slice(0, 8);

    async function seedTenant(
      name: string,
      industry: string,
      slugPrefix: string,
    ): Promise<TenantFixture> {
      const { data: tenant, error: tenantError } = await admin
        .from("tenants")
        .insert({ name, slug: `${slugPrefix}-${suffix}`, industry, status: "active" })
        .select("id")
        .single();
      if (tenantError || !tenant) {
        throw new Error(`Failed to seed tenant: ${tenantError?.message}`);
      }
      createdTenantIds.push(tenant.id);

      const email = `rls-test-${slugPrefix}-${suffix}@example.com`;
      const password = `Test-Password-${suffix}!`;

      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError || !authUser?.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }
      createdAuthUserIds.push(authUser.user.id);

      const { data: publicUser, error: userError } = await admin
        .from("users")
        .insert({ auth_id: authUser.user.id, email })
        .select("id")
        .single();
      if (userError || !publicUser) {
        throw new Error(`Failed to seed public.users row: ${userError?.message}`);
      }

      const { error: memberError } = await admin
        .from("tenant_members")
        .insert({ tenant_id: tenant.id, user_id: publicUser.id, role: "owner" });
      if (memberError) {
        throw new Error(`Failed to seed tenant_members row: ${memberError.message}`);
      }

      const sessionClient = createClient(SUPABASE_URL!, ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: signInData, error: signInError } = await sessionClient.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !signInData.session) {
        throw new Error(`Failed to sign in seeded user: ${signInError?.message}`);
      }

      return {
        tenantId: tenant.id,
        userId: publicUser.id,
        authUserId: authUser.user.id,
        email,
        password,
        client: sessionClient,
      };
    }

    tenantA = await seedTenant("RLS Test Clinic A", "healthcare", "rls-tenant-a");
    tenantB = await seedTenant("RLS Test Restaurant B", "restaurant", "rls-tenant-b");

    // Seed one row per table, per tenant, using the service-role client
    // (bypasses RLS so we control the fixture data precisely).
    for (const t of [tenantA, tenantB]) {
      const { error: callError } = await admin.from("calls").insert({
        tenant_id: t.tenantId,
        direction: "inbound",
        status: "completed",
        caller_number: "+15550001111",
        called_number: "+15559998888",
      });
      if (callError) throw new Error(`Failed to seed calls row: ${callError.message}`);

      const { error: profileError } = await admin.from("business_profiles").insert({
        tenant_id: t.tenantId,
        business_name: `Business for ${t.tenantId}`,
      });
      if (profileError) {
        throw new Error(`Failed to seed business_profiles row: ${profileError.message}`);
      }

      const { error: apptError } = await admin.from("appointments").insert({
        tenant_id: t.tenantId,
        patient_name: "Test Patient",
        patient_phone: "+15551230000",
        scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
      if (apptError) throw new Error(`Failed to seed appointments row: ${apptError.message}`);
    }
  }, 30000);

  afterAll(async () => {
    if (!dbAvailable) return;
    // Deleting the tenant cascades to tenant_members/calls/business_profiles/
    // appointments (all declared ON DELETE CASCADE from tenants).
    for (const id of createdTenantIds) {
      await admin.from("tenants").delete().eq("id", id);
    }
    for (const authId of createdAuthUserIds) {
      await admin.auth.admin.deleteUser(authId).catch(() => {
        // Best-effort cleanup; don't fail the suite on teardown errors.
      });
    }
  }, 30000);

  it("health check: local Supabase is reachable", async (ctx) => {
    if (!dbAvailable) {
      ctx.skip();
      return;
    }
    expect(await checkHealth()).toBe(true);
  });

  describe("cross-tenant read isolation", () => {
    it("user A cannot read tenant B's calls", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("calls")
        .select("*")
        .eq("tenant_id", tenantB.tenantId);

      // RLS filters rows silently rather than erroring on SELECT.
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it("user A cannot read tenant B's business_profiles", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("business_profiles")
        .select("*")
        .eq("tenant_id", tenantB.tenantId);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it("user A cannot read tenant B's appointments", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("appointments")
        .select("*")
        .eq("tenant_id", tenantB.tenantId);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it("an unscoped select() only ever returns the caller's own tenant rows", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client.from("calls").select("tenant_id");

      expect(error).toBeNull();
      for (const row of data ?? []) {
        expect(row.tenant_id).toBe(tenantA.tenantId);
      }
    });
  });

  describe("cross-tenant write isolation", () => {
    it("user A cannot insert a call row into tenant B", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { error } = await tenantA.client.from("calls").insert({
        tenant_id: tenantB.tenantId,
        direction: "inbound",
        status: "completed",
      });

      // RLS WITH CHECK on INSERT rejects rows outside the caller's tenant.
      expect(error).not.toBeNull();
    });

    it("user A cannot update tenant B's business_profiles", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("business_profiles")
        .update({ business_name: "Hijacked Name" })
        .eq("tenant_id", tenantB.tenantId)
        .select();

      // RLS USING clause on UPDATE means zero rows match/are affected.
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: verify } = await admin
        .from("business_profiles")
        .select("business_name")
        .eq("tenant_id", tenantB.tenantId)
        .single();
      expect(verify?.business_name).not.toBe("Hijacked Name");
    });

    it("user A cannot delete tenant B's appointments", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("appointments")
        .delete()
        .eq("tenant_id", tenantB.tenantId)
        .select();

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { count } = await admin
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantB.tenantId);
      expect(count).toBe(1);
    });
  });

  describe("own-tenant access", () => {
    it("user A can read their own tenant's calls", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("calls")
        .select("*")
        .eq("tenant_id", tenantA.tenantId);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(1);
    });

    it("user A can read their own tenant's business_profiles", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("business_profiles")
        .select("*")
        .eq("tenant_id", tenantA.tenantId);

      expect(error).toBeNull();
      expect(data?.[0]?.business_name).toBe(`Business for ${tenantA.tenantId}`);
    });

    it("user A can insert and then read a new appointment in their own tenant", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data: inserted, error: insertError } = await tenantA.client
        .from("appointments")
        .insert({
          tenant_id: tenantA.tenantId,
          patient_name: "Own Tenant Patient",
          patient_phone: "+15559991234",
          scheduled_at: new Date(Date.now() + 172_800_000).toISOString(),
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(inserted?.tenant_id).toBe(tenantA.tenantId);

      const { data: reread, error: readError } = await tenantA.client
        .from("appointments")
        .select("*")
        .eq("id", inserted!.id)
        .single();

      expect(readError).toBeNull();
      expect(reread?.patient_name).toBe("Own Tenant Patient");
    });

    it("user A can update their own tenant's business_profiles", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantA.client
        .from("business_profiles")
        .update({ business_name: "Updated By Owner" })
        .eq("tenant_id", tenantA.tenantId)
        .select();

      expect(error).toBeNull();
      expect(data?.[0]?.business_name).toBe("Updated By Owner");
    });
  });

  describe("symmetry: user B is equally isolated from tenant A", () => {
    it("user B cannot read tenant A's calls", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantB.client
        .from("calls")
        .select("*")
        .eq("tenant_id", tenantA.tenantId);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it("user B can read their own tenant's calls", async (ctx) => {
      if (!dbAvailable) { ctx.skip(); return; }
      const { data, error } = await tenantB.client
        .from("calls")
        .select("*")
        .eq("tenant_id", tenantB.tenantId);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(1);
    });
  });
});
