import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";

/**
 * Lists this tenant's phone numbers, newest first.
 *
 * The tenant's usable inbound/outbound number is the single row with
 * status = 'active' (see the outbound and browser-token paths, which both
 * select `status = 'active' limit 1`). That row is surfaced here as the
 * default via `is_default`; every other owned number is a spare.
 */
export async function GET() {
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

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("phone_numbers")
      .select("id, number, provider, status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Couldn't load your phone numbers right now." }, { status: 500 });
    }

    const numbers = (data ?? []).map((n) => ({
      id: n.id,
      number: n.number,
      provider: n.provider,
      status: n.status,
      created_at: n.created_at,
      is_default: n.status === "active",
    }));

    return NextResponse.json({ data: numbers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
