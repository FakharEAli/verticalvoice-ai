import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";
import { phoneSchema, uuidSchema } from "@/lib/validation/schemas";

const outboundCallSchema = z.object({
  tenant_id: uuidSchema,
  to_number: phoneSchema,
  from_number: phoneSchema.optional(),
  agent_id: uuidSchema.optional(),
});

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

    const { tenant_id, to_number, from_number, agent_id } = parsed.data;

    // Verify tenant membership
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify tenant has allow_outbound in policy_settings
    const { data: policy } = await supabase
      .from("policy_settings")
      .select("allow_outbound")
      .eq("tenant_id", tenant_id)
      .single();

    if (!policy?.allow_outbound) {
      return NextResponse.json(
        { error: "Outbound calls are not enabled for this tenant" },
        { status: 403 }
      );
    }

    // Create call record with status 'initiating'
    const { data: call, error: insertError } = await supabase
      .from("calls")
      .insert({
        tenant_id,
        direction: "outbound",
        status: "initiating",
        caller_number: from_number ?? null,
        called_number: to_number,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !call) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create call record" },
        { status: 500 }
      );
    }

    // TODO: Integrate with telephony provider (Twilio/Telnyx) to actually initiate the outbound call.
    // This would involve:
    // 1. Calling the provider API to place the call
    // 2. Updating the call record with provider_call_id
    // 3. Setting up webhooks for call status updates
    // For now, we just create the record.

    // Log to audit_events
    await supabase.from("audit_events" as any).insert({
      tenant_id,
      actor_id: user.id,
      action: "call.outbound_initiated",
      resource_type: "call",
      resource_id: call.id,
      metadata: { to_number, from_number, agent_id },
    });

    return NextResponse.json({ data: call }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
