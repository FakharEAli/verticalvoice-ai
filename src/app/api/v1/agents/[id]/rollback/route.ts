import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";

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
    const { data: agent } = await supabase
      .from("agents" as any)
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
    const { data: targetVersion } = (await supabase
      .from("agent_versions" as any)
      .select("*")
      .eq("id", version_id)
      .eq("agent_id", id)
      .single()) as { data: any };

    if (!targetVersion) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Determine next version number
    const { data: latestVersion } = (await supabase
      .from("agent_versions" as any)
      .select("version")
      .eq("agent_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single()) as { data: any };

    const nextVersion = ((latestVersion as any)?.version || 0) + 1;

    // Create a new version entry with the rolled-back config
    const { data: newVersion, error: insertError } = (await supabase
      .from("agent_versions" as any)
      .insert({
        agent_id: id,
        version: nextVersion,
        config: (targetVersion as any).config,
        config_hash: (targetVersion as any).config_hash,
        status: "active",
      })
      .select()
      .single()) as { data: any; error: any };

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
        rolled_back_to_version: (targetVersion as any).version,
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
