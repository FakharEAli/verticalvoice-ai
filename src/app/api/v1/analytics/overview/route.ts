import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";
import { uuidSchema } from "@/lib/validation/schemas";

const overviewQuerySchema = z.object({
  tenant_id: uuidSchema,
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
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

    const params = {
      tenant_id: request.nextUrl.searchParams.get("tenant_id") ?? "",
      from_date: request.nextUrl.searchParams.get("from_date") ?? undefined,
      to_date: request.nextUrl.searchParams.get("to_date") ?? undefined,
    };

    const parsed = overviewQuerySchema.safeParse(params);

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

    const fromDate =
      parsed.data.from_date ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = parsed.data.to_date ?? new Date().toISOString();

    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .eq("tenant_id", parsed.data.tenant_id)
      .eq("is_test", false)
      .gte("created_at", fromDate)
      .lte("created_at", toDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allCalls = calls ?? [];
    const totalCalls = allCalls.length;
    const answeredCalls = allCalls.filter(
      (c) => c.status === "completed"
    ).length;
    const missedCalls = allCalls.filter(
      (c) => c.status === "missed" || c.status === "no-answer"
    ).length;
    const totalDuration = allCalls.reduce(
      (sum, c) => sum + (c.duration_seconds ?? 0),
      0
    );
    const avgDuration =
      totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const answerRate =
      totalCalls > 0
        ? Math.round((answeredCalls / totalCalls) * 10000) / 100
        : 0;

    return NextResponse.json({
      total_calls: totalCalls,
      answered_calls: answeredCalls,
      missed_calls: missedCalls,
      answer_rate: answerRate,
      avg_duration_seconds: avgDuration,
      total_duration_seconds: totalDuration,
      period: { from: fromDate, to: toDate },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
