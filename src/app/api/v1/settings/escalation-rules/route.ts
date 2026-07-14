import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { fromUntypedTable } from "@/lib/database/untyped-table";
import { z } from "zod";
import { uuidSchema } from "@/lib/validation/schemas";

const escalationRuleSchema = z.object({
  trigger: z.string().min(1),
  action: z.string().min(1),
  destination: z.string().min(1),
  priority: z.number().int().min(0),
});

const updateRulesSchema = z.object({
  tenant_id: uuidSchema,
  rules: z.array(escalationRuleSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = request.nextUrl.searchParams.get("tenant_id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 }
      );
    }

    // Verify tenant membership
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: rules, error } = await fromUntypedTable(supabase, "escalation_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("priority", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rules });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const parsed = updateRulesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify tenant membership
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", parsed.data.tenant_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete existing rules
    const { error: deleteError } = await fromUntypedTable(supabase, "escalation_rules")
      .delete()
      .eq("tenant_id", parsed.data.tenant_id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Insert new rules
    const rows = parsed.data.rules.map((r) => ({
      tenant_id: parsed.data.tenant_id,
      trigger: r.trigger,
      action: r.action,
      destination: r.destination,
      priority: r.priority,
    }));

    const { data: rules, error: insertError } = await fromUntypedTable(supabase, "escalation_rules")
      .insert(rows)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ rules });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
