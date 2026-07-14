import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";
import "@/industries";
import { getIndustryPack } from "@/industries/core/registry";
import { compileAgent } from "@/industries/core/compiler";

const compileSchema = z.object({
  tenantId: z.string().uuid(),
});

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
    const parsed = compileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId } = parsed.data;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
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

    const { data: policy } = await supabase
      .from("policy_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    const { data: flags } = await supabase
      .from("feature_flags")
      .select("flag_name, enabled")
      .eq("tenant_id", tenantId);

    const featureMap: Record<string, boolean> = {};
    for (const f of flags || []) {
      featureMap[f.flag_name] = f.enabled;
    }

    const tenantConfig = {
      tenantId,
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

    return NextResponse.json({
      compiled,
      configHash: compiled.hash,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
