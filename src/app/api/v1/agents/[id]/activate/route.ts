import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { fromUntypedTable } from "@/lib/database/untyped-table";
import { z } from "zod";

const activateSchema = z.object({
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
    const parsed = activateSchema.safeParse(body);

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
      .update({ status: "active" })
      .eq("id", id)
      .eq("tenant_id", tenant_id);

    if (agentError) {
      return NextResponse.json(
        { error: `Failed to activate agent: ${agentError.message}` },
        { status: 500 }
      );
    }

    // Update latest agent_version status to active
    const { data: latestVersion } = await fromUntypedTable(supabase, "agent_versions")
      .select("id")
      .eq("agent_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (latestVersion) {
      const versionId = (latestVersion as { id: string }).id;
      await fromUntypedTable(supabase, "agent_versions")
        .update({ status: "active" })
        .eq("id", versionId);
    }

    // Log audit event
    const { error: auditError } = await supabase.from("audit_events").insert({
      tenant_id,
      actor_id: user.id,
      action: "agent.activated",
      resource_type: "agent",
      resource_id: id,
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
