import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { fromUntypedTable } from "@/lib/database/untyped-table";
import { z } from "zod";

const deactivateSchema = z.object({
  tenant_id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = deactivateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenant_id } = parsed.data;

    // Verify membership
    const { data: member } = await supabase
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "Not a member of this tenant" },
        { status: 403 }
      );
    }

    // Update agent status
    const { error: agentError } = await fromUntypedTable(supabase, "agents")
      .update({ status: "inactive" })
      .eq("id", id)
      .eq("tenant_id", tenant_id);

    if (agentError) {
      return NextResponse.json(
        { error: `Failed to deactivate agent: ${agentError.message}` },
        { status: 500 }
      );
    }

    // Log audit event
    const { error: auditError } = await supabase.from("audit_events").insert({
      tenant_id,
      actor_id: user.id,
      action: "agent.deactivated",
      resource_type: "agent",
      resource_id: id,
    });

    if (auditError) {
      console.error("Failed to create audit event:", auditError.message);
    }

    return NextResponse.json({ success: true, status: "inactive" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
