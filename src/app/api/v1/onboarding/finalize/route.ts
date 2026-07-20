import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { createTenant, type Industry } from "@/domain/tenants/service";
import { getOrCreateInternalUser } from "@/domain/users/service";
import { z } from "zod";
import "@/industries";
import { getIndustryPack } from "@/industries/core/registry";
import { compileAgent, type TenantConfig } from "@/industries/core/compiler";
import { logger } from "@/lib/observability/logger";
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
  // Pack tools the operator switched OFF in the onboarding tools step. Absent
  // means "keep every tool the industry pack ships with".
  disabledToolIds: z.array(z.string()).default([]),
});

/**
 * A stable, unique, obviously-fictional phone number for a brand-new tenant.
 *
 * Every dashboard test call and inbound route resolves the tenant by the dialed
 * number in `phone_numbers`, so a tenant with no number cannot place a test
 * call at all — which is exactly what stranded new customers. This gives them a
 * working number the moment onboarding finishes; a real Twilio number is bought
 * later from the Phone Numbers page. Uses the 555-01xx range reserved for
 * fiction so it can never collide with a real dialable number, and derives the
 * digits from the tenant id so it is deterministic and unique per tenant.
 */
function demoNumberForTenant(tenantId: string): string {
  let h = 0;
  for (const ch of tenantId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const areaCode = 200 + (h % 800); // 200–999
  const lastTwo = String(h % 100).padStart(2, "0");
  return `+1${areaCode}55501${lastTwo}`;
}

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

    // Provisioning writes below run as the service role: tenants, business
    // profiles, agent drafts/configs, etc. have no RLS policy that a
    // not-yet-a-member user's cookie-scoped session could satisfy.
    const admin = createAdminClient();

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

    const { error: profileError } = await admin
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

    const { error: voiceError } = await admin
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

    const { error: policyError } = await admin
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

    // Give the tenant a working phone number immediately. Without an active
    // phone_numbers row the Test Center refuses every call ("no active phone
    // number"), which is the dead end new customers hit right after finishing
    // setup. This demo number makes the browser test call route correctly from
    // the first click; a real Twilio number is added later from the Phone
    // Numbers page. Non-fatal: a number hiccup must not fail the whole signup.
    const { error: phoneError } = await admin.from("phone_numbers").insert({
      tenant_id: tenant.id,
      number: demoNumberForTenant(tenant.id),
      provider: "demo",
      provider_sid: "",
      status: "active",
    });
    if (phoneError) {
      logger.warn("onboarding: could not provision demo phone number", {
        tenantId: tenant.id,
        error: phoneError.message,
      });
    }

    // Persist the tools the operator turned off. A missing row means "on", so
    // we only write the off ones — the default stays "every pack tool enabled".
    if (fields.disabledToolIds.length > 0) {
      const { error: toolError } = await admin.from("agent_tool_settings").insert(
        fields.disabledToolIds.map((toolId) => ({
          tenant_id: tenant.id,
          tool_id: toolId,
          enabled: false,
        }))
      );
      if (toolError) {
        logger.warn("onboarding: could not save tool selections", {
          tenantId: tenant.id,
          error: toolError.message,
        });
      }
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

    const { data: draft, error: draftError } = await admin
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

    const agentPageSnapshot = {
      draft_id: draft.id,
      system_prompt: compiled.systemPrompt,
      model: "gpt-4o",
      temperature: 0.7,
      tools: compiled.activeTools,
      business_name: fields.businessName,
      voice: {
        provider: compiled.voice.provider,
        voice_id: compiled.voice.voiceId,
        speed: compiled.voice.speed,
        language: compiled.voice.language,
      },
      compiled_at: compiled.compiledAt,
    };

    const { data: version, error: versionError } = await admin
      .from("agent_config_versions")
      .insert({
        tenant_id: tenant.id,
        draft_id: draft.id,
        version: 1,
        snapshot: agentPageSnapshot as unknown as Json,
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

    const { error: activeConfigError } = await admin
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

    const { error: tenantStatusError } = await admin
      .from("tenants")
      .update({ status: "active" })
      .eq("id", tenant.id);

    if (tenantStatusError) {
      return NextResponse.json(
        { error: `Failed to activate tenant: ${tenantStatusError.message}` },
        { status: 500 }
      );
    }

    const { error: auditError } = await admin.from("audit_events").insert({
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
