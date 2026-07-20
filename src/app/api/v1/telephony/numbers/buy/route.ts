import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { purchaseNumber, TwilioNumbersError } from "@/lib/telephony/twilio-numbers";

const buySchema = z.object({
  // The number the user picked from a search result, in E.164 as Twilio returns it.
  number: z.string().regex(/^\+[1-9]\d{6,14}$/, "That doesn't look like a valid phone number."),
});

/**
 * Buys ONE specific number from Twilio and records it against the tenant.
 *
 * Purchasing costs real money and happens ONLY here, on an explicit user
 * action — never speculatively. The voice webhook and status callback are set
 * at purchase time so the number is answerable immediately. If the tenant has
 * no active number yet, this one becomes the default (status 'active');
 * otherwise it's added as an inactive spare the user can promote later.
 */
export async function POST(request: NextRequest) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = buySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const { number } = parsed.data;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl?.startsWith("http")) {
      return NextResponse.json(
        { error: "The app isn't fully configured for buying numbers yet. Please contact support." },
        { status: 500 },
      );
    }

    const admin = createAdminClient();

    // Guard against re-buying a number this tenant already holds.
    const { data: existing } = await admin
      .from("phone_numbers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("number", number)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "You already own this number." }, { status: 409 });
    }

    // Does the tenant already have an active (default) number? This one becomes
    // the default only when there's nothing else to be default.
    const { data: activeNumber } = await admin
      .from("phone_numbers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    const willBeDefault = !activeNumber;

    let purchased;
    try {
      purchased = await purchaseNumber({
        number,
        voiceUrl: `${appUrl}/api/v1/webhooks/twilio/voice`,
        statusCallbackUrl: `${appUrl}/api/v1/webhooks/twilio`,
      });
    } catch (err) {
      if (err instanceof TwilioNumbersError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const { data: row, error: insertError } = await admin
      .from("phone_numbers")
      .insert({
        tenant_id: tenantId,
        number: purchased.number,
        provider: "twilio",
        provider_sid: purchased.sid,
        status: willBeDefault ? "active" : "inactive",
      })
      .select("id, number, provider, status, created_at")
      .single();

    if (insertError || !row) {
      // The number is bought on Twilio but we failed to record it. Surface a
      // clear message with the SID so support can reconcile rather than losing it.
      return NextResponse.json(
        {
          error:
            "The number was purchased but couldn't be saved. Please contact support with reference " +
            purchased.sid,
        },
        { status: 500 },
      );
    }

    await admin.from("audit_events").insert({
      tenant_id: tenantId,
      actor_id: user.id,
      action: "phone_number.purchased",
      resource_type: "phone_number",
      resource_id: row.id,
      metadata: { number: purchased.number, provider_sid: purchased.sid, is_default: willBeDefault },
    });

    return NextResponse.json(
      { data: { ...row, is_default: row.status === "active" } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
