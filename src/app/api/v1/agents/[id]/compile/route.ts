import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";
import "@/industries";
import { getIndustryPack } from "@/industries/core/registry";
import { compileAgent } from "@/industries/core/compiler";

const compileSchema = z.object({
  tenant_id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = compileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenant_id } = parsed.data;

    // Verify membership
    const { data: member } = await supabase
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "Not a member of this tenant" },
        { status: 403 }
      );
    }

    // Verify agent exists and belongs to tenant
    const { data: agent } = await supabase
      .from("agents" as any)
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Fetch tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const pack = getIndustryPack(
      tenant.industry as "healthcare" | "restaurant" | "real_estate"
    );

    if (!pack) {
      return NextResponse.json(
        { error: `No industry pack found for: ${tenant.industry}` },
        { status: 400 }
      );
    }

    // Fetch business profile, voice, policy, flags
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    const { data: voice } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    const { data: policy } = await supabase
      .from("policy_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    const { data: flags } = await supabase
      .from("feature_flags")
      .select("flag_name, enabled")
      .eq("tenant_id", tenant_id);

    const featureMap: Record<string, boolean> = {};
    for (const f of flags || []) {
      featureMap[f.flag_name] = f.enabled;
    }

    const tenantConfig = {
      tenantId: tenant_id,
      industryId: tenant.industry as "healthcare" | "restaurant" | "real_estate",
      businessName: profile?.business_name || tenant.name,
      businessPhone: profile?.phone || "",
      timezone: profile?.timezone || "UTC",
      locale: "en-US",
      features: featureMap,
      overrides: {
        voice: voice?.voice_id
          ? { voiceId: voice.voice_id, speed: voice.speed }
          : undefined,
        call: policy
          ? { maxDurationSeconds: policy.max_call_duration_seconds }
          : undefined,
      },
    };

    const compiled = compileAgent(tenantConfig, pack, {});

    // Determine next version number
    const { data: latestVersion } = (await supabase
      .from("agent_versions" as any)
      .select("version")
      .eq("agent_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single()) as { data: any };

    const nextVersion = ((latestVersion as any)?.version || 0) + 1;

    // Store compiled config as a new version
    const { data: version, error: versionError } = await supabase
      .from("agent_versions" as any)
      .insert({
        agent_id: id,
        version: nextVersion,
        config: compiled,
        config_hash: compiled.hash,
        status: "compiled",
      })
      .select()
      .single();

    if (versionError) {
      return NextResponse.json(
        { error: `Failed to store version: ${versionError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      compiled,
      configHash: compiled.hash,
      version,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
