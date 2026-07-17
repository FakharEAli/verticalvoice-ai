import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { createVoiceAccessToken } from "@/lib/telephony/access-token";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: phoneNumber } = await admin
      .from("phone_numbers")
      .select("number")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "This tenant has no active phone number to test against." },
        { status: 400 }
      );
    }

    const identity = `browser-test-${user.id}`;
    const token = createVoiceAccessToken(identity);

    return NextResponse.json({ token, identity, toNumber: phoneNumber.number });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
