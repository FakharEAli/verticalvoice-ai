import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";
import { uuidSchema } from "@/lib/validation/schemas";

const callsQuerySchema = z.object({
  tenant_id: uuidSchema,
  from_date: z.string().datetime(),
  to_date: z.string().datetime(),
  group_by: z.enum(["day", "week", "month"]).default("day"),
});

function getGroupKey(
  dateStr: string,
  groupBy: "day" | "week" | "month"
): string {
  const date = new Date(dateStr);
  if (groupBy === "day") {
    return date.toISOString().slice(0, 10);
  }
  if (groupBy === "week") {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
  }
  // month
  return date.toISOString().slice(0, 7);
}

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

    const params = {
      tenant_id: request.nextUrl.searchParams.get("tenant_id") ?? "",
      from_date: request.nextUrl.searchParams.get("from_date") ?? "",
      to_date: request.nextUrl.searchParams.get("to_date") ?? "",
      group_by: request.nextUrl.searchParams.get("group_by") ?? "day",
    };

    const parsed = callsQuerySchema.safeParse(params);

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

    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .eq("tenant_id", parsed.data.tenant_id)
      .eq("is_test", false)
      .gte("created_at", parsed.data.from_date)
      .lte("created_at", parsed.data.to_date)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const groups = new Map<
      string,
      {
        total: number;
        answered: number;
        missed: number;
        totalDuration: number;
      }
    >();

    for (const call of calls ?? []) {
      const key = getGroupKey(call.created_at, parsed.data.group_by);
      const group = groups.get(key) ?? {
        total: 0,
        answered: 0,
        missed: 0,
        totalDuration: 0,
      };

      group.total++;
      if (call.status === "completed") group.answered++;
      if (call.status === "missed" || call.status === "no-answer")
        group.missed++;
      group.totalDuration += call.duration_seconds ?? 0;

      groups.set(key, group);
    }

    const data = Array.from(groups.entries()).map(([period, g]) => ({
      period,
      total: g.total,
      answered: g.answered,
      missed: g.missed,
      avg_duration: g.total > 0 ? Math.round(g.totalDuration / g.total) : 0,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
