import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";

const activateSchema = z.object({
  tenantId: z.string().uuid(),
});

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

    const body = await request.json();
    const parsed = activateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId } = parsed.data;

    const { error } = await supabase
      .from("tenants")
      .update({ status: "active" })
      .eq("id", tenantId);

    if (error) {
      return NextResponse.json(
        { error: `Failed to activate: ${error.message}` },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabase.from("audit_events").insert({
      tenant_id: tenantId,
      actor_id: user.id,
      action: "tenant.activated",
      resource_type: "tenant",
      resource_id: tenantId,
    });

    if (auditError) {
      console.error("Failed to create audit event:", auditError.message);
    }

    return NextResponse.json({ success: true, status: "active" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
