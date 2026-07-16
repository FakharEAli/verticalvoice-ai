import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createTenant, type Industry } from "@/domain/tenants/service";
import { getOrCreateInternalUser } from "@/domain/users/service";
import { z } from "zod";
import "@/industries";
import { getIndustryPack } from "@/industries/core/registry";
import { compileAgent, type TenantConfig } from "@/industries/core/compiler";
import type { Json } from "@/lib/database/types";

const finalizeSchema = z.object({
  industry: z.enum(["healthcare", "restaurant", "real_estate"]),
  businessName: z.string().min(1).max(200),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  country: z.string().min(1),
  timezone: z.string().min(1),
  mainPhone: z.string().min(1),
  businessAddress: z.string().optional(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  preferredLanguage: z.string().default("en"),
  secondaryLanguage: z.string().optional(),
  numberOfLocations: z.number().int().min(1).default(1),
  businessSize: z.string().optional(),
  industryConfig: z.record(z.string(), z.unknown()).default({}),
  voiceId: z.string().min(1),
  tone: z.enum(["warm", "professional", "energetic", "calm"]),
  speakingPace: z.enum(["slower", "natural", "faster"]),
  greetingStyle: z.enum(["formal", "friendly", "minimal"]),
  aiDisclosure: z.boolean(),
  transferNumber: z.string().optional(),
  afterHoursBehavior: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = finalizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const fields = parsed.data;

    const internalUserId = await getOrCreateInternalUser(
      user.id,
      user.email,
      fields.contactName
    );

    const tenant = await createTenant({
      name: fields.businessName,
      industry: fields.industry as Industry,
      userId: internalUserId,
    });

    const speedMap = { slower: 0.85, natural: 1.0, faster: 1.15 };

    const { error: profileError } = await supabase
      .from("business_profiles")
      .update({
        business_name: fields.businessName,
        website: fields.websiteUrl || null,
        country: fields.country,
        timezone: fields.timezone,
        phone: fields.mainPhone,
        address_line1: fields.businessAddress || null,
        email: fields.contactEmail,
        contact_name: fields.contactName,
        preferred_language: fields.preferredLanguage,
        secondary_language: fields.secondaryLanguage || null,
        number_of_locations: fields.numberOfLocations,
        business_size: fields.businessSize || null,
      })
      .eq("tenant_id", tenant.id);

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to save business profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    const { error: voiceError } = await supabase
      .from("voice_profiles")
      .update({
        voice_id: fields.voiceId,
        speed: speedMap[fields.speakingPace],
        greeting: fields.greetingStyle,
      })
      .eq("tenant_id", tenant.id);

    if (voiceError) {
      return NextResponse.json(
        { error: `Failed to save voice profile: ${voiceError.message}` },
        { status: 500 }
      );
    }

    const { error: policyError } = await supabase
      .from("policy_settings")
      .update({
        recording_consent_required: fields.aiDisclosure,
      })
      .eq("tenant_id", tenant.id);

    if (policyError) {
      return NextResponse.json(
        { error: `Failed to save policy settings: ${policyError.message}` },
        { status: 500 }
      );
    }

    const pack = getIndustryPack(fields.industry);
    if (!pack) {
      return NextResponse.json(
        { error: `No industry pack found for: ${fields.industry}` },
        { status: 400 }
      );
    }

    const tenantConfig: TenantConfig = {
      tenantId: tenant.id,
      industryId: fields.industry,
      businessName: fields.businessName,
      businessPhone: fields.mainPhone,
      timezone: fields.timezone,
      locale: fields.preferredLanguage === "en" ? "en-US" : fields.preferredLanguage,
      features: {},
      overrides: {
        voice: { voiceId: fields.voiceId, speed: speedMap[fields.speakingPace] },
      },
    };

    const compiled = compileAgent(tenantConfig, pack, {});

    const { data: draft, error: draftError } = await supabase
      .from("agent_drafts")
      .insert({
        tenant_id: tenant.id,
        name: `${fields.businessName} Agent`,
        system_prompt: compiled.systemPrompt,
        model: "gpt-4o",
        temperature: 0.7,
        tools: compiled.activeTools as unknown as Json,
        config: {
          ...compiled,
          industryConfig: fields.industryConfig,
          transferNumber: fields.transferNumber || null,
          afterHoursBehavior: fields.afterHoursBehavior || null,
        } as unknown as Json,
        created_by: internalUserId,
      })
      .select()
      .single();

    if (draftError) {
      return NextResponse.json(
        { error: `Failed to save agent draft: ${draftError.message}` },
        { status: 500 }
      );
    }

    const { data: version, error: versionError } = await supabase
      .from("agent_config_versions")
      .insert({
        tenant_id: tenant.id,
        draft_id: draft.id,
        version: 1,
        snapshot: compiled as unknown as Json,
        published_by: internalUserId,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (versionError) {
      return NextResponse.json(
        { error: `Failed to save agent config version: ${versionError.message}` },
        { status: 500 }
      );
    }

    const { error: activeConfigError } = await supabase
      .from("active_agent_configs")
      .insert({
        tenant_id: tenant.id,
        agent_config_version_id: version.id,
        activated_at: new Date().toISOString(),
        activated_by: internalUserId,
      });

    if (activeConfigError) {
      return NextResponse.json(
        { error: `Failed to activate agent config: ${activeConfigError.message}` },
        { status: 500 }
      );
    }

    const { error: tenantStatusError } = await supabase
      .from("tenants")
      .update({ status: "active" })
      .eq("id", tenant.id);

    if (tenantStatusError) {
      return NextResponse.json(
        { error: `Failed to activate tenant: ${tenantStatusError.message}` },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabase.from("audit_events").insert({
      tenant_id: tenant.id,
      actor_id: user.id,
      action: "tenant.activated",
      resource_type: "tenant",
      resource_id: tenant.id,
    });

    if (auditError) {
      console.error("Failed to create audit event:", auditError.message);
    }

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      status: "active",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
