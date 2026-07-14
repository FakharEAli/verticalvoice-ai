import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";

const businessSchema = z.object({
  tenantId: z.string().uuid(),
  businessName: z.string().min(1).max(200),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  country: z.string().min(2).max(100),
  timezone: z.string().min(1),
  mainPhone: z.string().min(1),
  businessAddress: z.string().optional(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  preferredLanguage: z.string().default("en"),
  secondaryLanguage: z.string().optional(),
  numberOfLocations: z.number().int().min(1).default(1),
  businessSize: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = businessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId, ...fields } = parsed.data;

    const { error: profileError } = await supabase
      .from("business_profiles")
      .update({
        business_name: fields.businessName,
        website: fields.websiteUrl || null,
        country: fields.country,
        timezone: fields.timezone,
        phone: fields.mainPhone,
        address_line1: fields.businessAddress || null,
        email: fields.contactEmail,
      })
      .eq("tenant_id", tenantId);

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to update profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    const { error: tenantError } = await supabase
      .from("tenants")
      .update({ name: fields.businessName })
      .eq("id", tenantId);

    if (tenantError) {
      return NextResponse.json(
        { error: `Failed to update tenant: ${tenantError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
