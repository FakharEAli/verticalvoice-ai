import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getOrCreateInternalUser } from "@/domain/users/service";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { z } from "zod";

const patchSchema = z.object({
  allow_outbound: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { allow_outbound } = parsed.data;

    const tenant_id = await getCurrentTenantId(user.id);
    if (!tenant_id) {
      return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });
    }

    const internalUserId = await getOrCreateInternalUser(user.id, user.email);

    const { data: membership } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("user_id", internalUserId)
      .eq("tenant_id", tenant_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (membership.role !== "admin" && membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only admins can change outbound calling settings" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("policy_settings")
      .update({ allow_outbound })
      .eq("tenant_id", tenant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_events").insert({
      tenant_id,
      actor_id: user.id,
      action: allow_outbound ? "outbound_calling.enabled" : "outbound_calling.disabled",
      resource_type: "tenant",
      resource_id: tenant_id,
    });

    return NextResponse.json({ success: true, allowOutbound: allow_outbound });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
