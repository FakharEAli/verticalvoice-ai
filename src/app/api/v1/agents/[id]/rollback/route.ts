import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { fromUntypedTable } from "@/lib/database/untyped-table";
import { z } from "zod";

type AgentVersionRow = {
  id: string;
  version: number;
  config: unknown;
  config_hash: string;
};

const rollbackSchema = z.object({
  tenant_id: z.string().uuid(),
  version_id: z.string().uuid(),
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
    const parsed = rollbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenant_id, version_id } = parsed.data;

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

    // Verify agent belongs to tenant
    const { data: agent } = await fromUntypedTable(supabase, "agents")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Fetch the target version to rollback to
    const { data: targetVersionData } = await fromUntypedTable(supabase, "agent_versions")
      .select("*")
      .eq("id", version_id)
      .eq("agent_id", id)
      .single();
    const targetVersion = targetVersionData as AgentVersionRow | null;

    if (!targetVersion) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Determine next version number
    const { data: latestVersionData } = await fromUntypedTable(supabase, "agent_versions")
      .select("version")
      .eq("agent_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    const latestVersion = latestVersionData as Pick<AgentVersionRow, "version"> | null;

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Create a new version entry with the rolled-back config
    const { data: newVersion, error: insertError } = await fromUntypedTable(supabase, "agent_versions")
      .insert({
        agent_id: id,
        version: nextVersion,
        config: targetVersion.config,
        config_hash: targetVersion.config_hash,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create rollback version: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Log audit event
    const { error: auditError } = await supabase.from("audit_events").insert({
      tenant_id,
      actor_id: user.id,
      action: "agent.rolled_back",
      resource_type: "agent",
      resource_id: id,
      metadata: {
        rolled_back_to_version_id: version_id,
        rolled_back_to_version: targetVersion.version,
        new_version: nextVersion,
      },
    });

    if (auditError) {
      console.error("Failed to create audit event:", auditError.message);
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
