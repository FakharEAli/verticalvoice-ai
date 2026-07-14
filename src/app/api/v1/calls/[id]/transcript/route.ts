import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { uuidSchema } from "@/lib/validation/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenant_id = request.nextUrl.searchParams.get("tenant_id");

    if (!tenant_id) {
      return NextResponse.json(
        { error: "Invalid input", details: { fieldErrors: { tenant_id: ["Required"] } } },
        { status: 400 }
      );
    }

    const tenantParsed = uuidSchema.safeParse(tenant_id);
    if (!tenantParsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: { fieldErrors: { tenant_id: ["Invalid UUID"] } } },
        { status: 400 }
      );
    }

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

    // Verify the call belongs to this tenant
    const { data: call } = await supabase
      .from("calls")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Query transcripts table (not in generated types, using untyped access)
    const { data: transcript, error } = await supabase
      .from("transcripts" as any)
      .select("*")
      .eq("call_id", id)
      .single();

    if (error || !transcript) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    return NextResponse.json({ data: transcript });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
