import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { evaluateReleaseGuard } from "@/lib/telephony/phone-number-rules";
import { releaseNumber, TwilioNumbersError } from "@/lib/telephony/twilio-numbers";

/**
 * Releases (gives up) one of the tenant's numbers.
 *
 * Guarded: the tenant's LAST active number cannot be released while a campaign
 * is running (see evaluateReleaseGuard). Twilio release is best-effort — if the
 * number is already gone on Twilio's side (404), the local row is still removed
 * so the dashboard doesn't keep showing a number the tenant no longer holds.
 */
export async function DELETE(
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
      .select("id, number, provider_sid, status")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: "Couldn't load that number." }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: "That number isn't on your account." }, { status: 404 });
    }

    const numberIsActive = target.status === "active";

    // How many OTHER active numbers exist, and is a campaign dialing right now?
    const [otherActive, runningCampaign] = await Promise.all([
      admin
        .from("phone_numbers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .neq("id", target.id),
      admin
        .from("campaigns")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "running")
        .limit(1)
        .maybeSingle(),
    ]);

    const guard = evaluateReleaseGuard({
      numberIsActive,
      otherActiveNumbersCount: otherActive.count ?? 0,
      hasRunningCampaign: Boolean(runningCampaign.data),
    });
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 409 });
    }

    // Best-effort Twilio release. A 404 (already gone) is fine and returns
    // false; any other provider error is surfaced and we do NOT delete locally,
    // so the user can retry rather than silently orphaning a paid number.
    try {
      await releaseNumber(target.provider_sid);
    } catch (err) {
      if (err instanceof TwilioNumbersError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const { error: deleteError } = await admin
      .from("phone_numbers")
      .delete()
      .eq("id", target.id)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      return NextResponse.json(
        { error: "The number was released but couldn't be removed from your list. Please refresh." },
        { status: 500 },
      );
    }

    await admin.from("audit_events").insert({
      tenant_id: tenantId,
      actor_id: user.id,
      action: "phone_number.released",
      resource_type: "phone_number",
      resource_id: target.id,
      metadata: { number: target.number, provider_sid: target.provider_sid },
    });

    return NextResponse.json({ data: { id: target.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
