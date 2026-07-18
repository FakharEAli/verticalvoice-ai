import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { createUltravoxCall } from "@/lib/telephony/ultravox";
import { buildSelectedTools } from "@/lib/telephony/ultravox-tools";
import { withCurrentDateContext } from "@/lib/telephony/prompt-context";
import { placeOutboundCall } from "@/lib/telephony/twilio";
import { z } from "zod";
import { phoneSchema } from "@/lib/validation/schemas";
import "@/industries";
import { getIndustryPack } from "@/industries/core/registry";
import { buildOutboundSystemPrompt } from "@/lib/telephony/outbound-prompt";

const outboundCallSchema = z.object({
  to_number: phoneSchema,
  call_type_id: z.string().min(1),
  variables: z.record(z.string(), z.string()).default({}),
});

function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = outboundCallSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { to_number, call_type_id, variables } = parsed.data;

    const tenant_id = await getCurrentTenantId(user.id);
    if (!tenant_id) {
      return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: policy } = await admin
      .from("policy_settings")
      .select("allow_outbound")
      .eq("tenant_id", tenant_id)
      .single();

    if (!policy?.allow_outbound) {
      return NextResponse.json(
        { error: "Outbound calling is not enabled for this tenant. Enable it first." },
        { status: 403 }
      );
    }

    const { data: tenant } = await admin
      .from("tenants")
      .select("industry")
      .eq("id", tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const pack = getIndustryPack(tenant.industry as "healthcare" | "restaurant" | "real_estate");
    if (!pack) {
      return NextResponse.json({ error: `No industry pack found for: ${tenant.industry}` }, { status: 400 });
    }

    const callType = pack.outboundCallTypes.find((t) => t.id === call_type_id);
    if (!callType) {
      return NextResponse.json(
        { error: `Unknown call_type_id "${call_type_id}" for industry ${tenant.industry}` },
        { status: 400 }
      );
    }

    const missingVars = callType.variables
      .filter((v) => v.required && !variables[v.name]?.trim())
      .map((v) => v.name);
    if (missingVars.length > 0) {
      return NextResponse.json(
        { error: `Missing required variables: ${missingVars.join(", ")}` },
        { status: 400 }
      );
    }

    // Respect the contact book's do-not-call flag — a flag that doesn't stop
    // a dial is worse than no flag at all.
    const { data: dncContact } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("phone", to_number)
      .eq("do_not_call", true)
      .maybeSingle();

    if (dncContact) {
      return NextResponse.json(
        { error: "This number is marked do-not-call in your contacts." },
        { status: 403 }
      );
    }

    const { data: businessProfile } = await admin
      .from("business_profiles")
      .select("business_name, timezone")
      .eq("tenant_id", tenant_id)
      .single();

    const { data: phoneNumber } = await admin
      .from("phone_numbers")
      .select("number")
      .eq("tenant_id", tenant_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "This tenant has no active phone number to call from." },
        { status: 400 }
      );
    }

    const { data: activeConfig } = await admin
      .from("active_agent_configs")
      .select("agent_config_version_id")
      .eq("tenant_id", tenant_id)
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let voiceId: string | null = null;
    let compiledPrompt: string | null = null;
    if (activeConfig) {
      const { data: version } = await admin
        .from("agent_config_versions")
        .select("snapshot")
        .eq("id", activeConfig.agent_config_version_id)
        .single();
      const snapshot = version?.snapshot as {
        system_prompt?: string;
        voice?: { voice_id?: string } | null;
      } | null;
      voiceId = snapshot?.voice?.voice_id ?? null;
      compiledPrompt = snapshot?.system_prompt ?? null;
    }

    const businessName = businessProfile?.business_name ?? "the business";
    const baseSystemPrompt = buildOutboundSystemPrompt({
      compiledPrompt,
      businessName,
      category: callType.category,
      filledScript: fillTemplate(callType.promptTemplate, variables),
    });
    const systemPrompt = withCurrentDateContext(baseSystemPrompt, businessProfile?.timezone);

    // Insert the call row first (provider_call_id is nullable) so we have
    // our internal call.id to scope this call's tools to before Ultravox
    // or Twilio are ever contacted.
    const { data: call, error: insertError } = await admin
      .from("calls")
      .insert({
        tenant_id,
        direction: "outbound",
        status: "initiating",
        caller_number: phoneNumber.number,
        called_number: to_number,
        started_at: new Date().toISOString(),
        outbound_purpose: call_type_id,
        outbound_context: variables,
      })
      .select()
      .single();

    if (insertError || !call) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create call record" },
        { status: 500 }
      );
    }

    const selectedTools = buildSelectedTools(pack, {
      callId: call.id,
      tenantId: tenant_id,
      industry: pack.id,
    });

    const ultravoxCall = await createUltravoxCall(systemPrompt, voiceId, selectedTools);
    if (!ultravoxCall.joinUrl) {
      await admin.from("calls").update({ status: "failed" }).eq("id", call.id);
      return NextResponse.json(
        { error: "Ultravox call was created without a joinUrl" },
        { status: 502 }
      );
    }

    // Twilio rejects a relative StatusCallback, which would silently cost us
    // every status transition for the call. Fail loudly at the source instead.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl?.startsWith("http")) {
      await admin.from("calls").update({ status: "failed" }).eq("id", call.id);
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL must be an absolute URL for call status callbacks." },
        { status: 500 }
      );
    }
    const statusCallbackUrl = `${appUrl}/api/v1/webhooks/twilio`;

    // A Twilio rejection (unverified caller ID, geo-permission, bad number)
    // used to escape to the generic 500 handler, leaving the call row stuck in
    // "initiating" forever and hiding Twilio's actual reason from the operator.
    let twilioCall;
    try {
      twilioCall = await placeOutboundCall({
        to: to_number,
        from: phoneNumber.number,
        ultravoxJoinUrl: ultravoxCall.joinUrl,
        statusCallbackUrl,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Twilio call failed";
      // `calls` has no failure-reason column, so the durable record of *why*
      // goes to audit_events; the row itself just stops lying about being live.
      await admin
        .from("calls")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", call.id);
      await admin.from("audit_events").insert({
        tenant_id,
        actor_id: user.id,
        action: "call.outbound_failed",
        resource_type: "call",
        resource_id: call.id,
        metadata: { to_number, call_type_id, reason: reason.slice(0, 500) },
      });
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    await admin
      .from("calls")
      .update({
        provider_call_id: twilioCall.sid,
        ultravox_call_id: ultravoxCall.callId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", call.id);
    call.provider_call_id = twilioCall.sid;

    await admin.from("audit_events").insert({
      tenant_id,
      actor_id: user.id,
      action: "call.outbound_initiated",
      resource_type: "call",
      resource_id: call.id,
      metadata: { to_number, call_type_id, provider_call_id: twilioCall.sid },
    });

    return NextResponse.json({ data: call }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
