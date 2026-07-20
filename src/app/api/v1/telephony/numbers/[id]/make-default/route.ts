import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";

/**
 * Makes one number the tenant's default (active) number.
 *
 * Exactly one number is the default at a time: the target is set 'active' and
 * every other number for the tenant is demoted to 'inactive'. Inbound and
 * outbound both resolve the from-number via `status = 'active' limit 1`, so
 * this single-writer flip is what actually re-points the tenant's calling.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const { data: target, error: fetchError } = await admin
      .from("phone_numbers")
      .select("id, number")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: "Couldn't load that number." }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: "That number isn't on your account." }, { status: 404 });
    }

    // Promote the target first so there is never a window with zero active
    // numbers, then demote everyone else. Both writes are tenant-scoped.
    const { error: promoteError } = await admin
      .from("phone_numbers")
      .update({ status: "active" })
      .eq("id", target.id)
      .eq("tenant_id", tenantId);
    if (promoteError) {
      return NextResponse.json({ error: "Couldn't set that number as the default." }, { status: 500 });
    }

    const { error: demoteError } = await admin
      .from("phone_numbers")
      .update({ status: "inactive" })
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .neq("id", target.id);
    if (demoteError) {
      return NextResponse.json({ error: "Couldn't set that number as the default." }, { status: 500 });
    }

    await admin.from("audit_events").insert({
      tenant_id: tenantId,
      actor_id: user.id,
      action: "phone_number.made_default",
      resource_type: "phone_number",
      resource_id: target.id,
      metadata: { number: target.number },
    });

    return NextResponse.json({ data: { id: target.id, is_default: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
