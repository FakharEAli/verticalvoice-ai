import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { fromUntypedTable } from "@/lib/database/untyped-table";
import { z } from "zod";
import { uuidSchema, urlSchema } from "@/lib/validation/schemas";

const importSchema = z.object({
  tenant_id: uuidSchema,
  url: urlSchema,
  max_pages: z.number().int().min(1).max(100).optional(),
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
    const parsed = importSchema.safeParse(body);

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

    // Create a knowledge_source entry with status 'importing'
    // TODO: trigger actual web scraping job
    const { data: source, error } = await fromUntypedTable(supabase, "knowledge_sources")
      .insert({
        tenant_id: parsed.data.tenant_id,
        type: "website",
        name: parsed.data.url,
        url: parsed.data.url,
        status: "importing",
        metadata: { max_pages: parsed.data.max_pages ?? 10 },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sourceId = (source as { id: string } | null)?.id;

    return NextResponse.json(
      { source_id: sourceId, status: "importing" },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
