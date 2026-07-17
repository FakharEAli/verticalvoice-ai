import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";
import "@/industries";
import { getIndustryPack } from "@/industries/core/registry";

export async function GET(_request: NextRequest) {
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

    const { data: tenant } = await admin
      .from("tenants")
      .select("industry")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const pack = getIndustryPack(tenant.industry as "healthcare" | "restaurant" | "real_estate");
    if (!pack) {
      return NextResponse.json({ error: `No industry pack found for: ${tenant.industry}` }, { status: 400 });
    }

    const { data: policy } = await admin
      .from("policy_settings")
      .select("allow_outbound")
      .eq("tenant_id", tenantId)
      .single();

    const { data: phoneNumber } = await admin
      .from("phone_numbers")
      .select("number")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      industry: tenant.industry,
      allowOutbound: policy?.allow_outbound ?? false,
      hasPhoneNumber: !!phoneNumber,
      callTypes: pack.outboundCallTypes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
