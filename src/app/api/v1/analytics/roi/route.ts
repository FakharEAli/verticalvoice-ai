import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";
import { uuidSchema } from "@/lib/validation/schemas";

const DEFAULT_COST_PER_CALL = 3.5;

const roiQuerySchema = z.object({
  tenant_id: uuidSchema,
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  cost_per_call: z.coerce.number().min(0).optional(),
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
      cost_per_call:
        request.nextUrl.searchParams.get("cost_per_call") ?? undefined,
    };

    const parsed = roiQuerySchema.safeParse(params);

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
    const costPerCall = parsed.data.cost_per_call ?? DEFAULT_COST_PER_CALL;

    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .eq("tenant_id", parsed.data.tenant_id)
      .eq("status", "completed")
      .eq("is_test", false)
      .gte("created_at", fromDate)
      .lte("created_at", toDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const completedCalls = calls ?? [];
    const callsHandled = completedCalls.length;
    const totalDuration = completedCalls.reduce(
      (sum, c) => sum + (c.duration_seconds ?? 0),
      0
    );
    const estimatedTimeSavedMinutes = Math.round(totalDuration / 60);
    const estimatedCostSaved =
      Math.round(callsHandled * costPerCall * 100) / 100;

    return NextResponse.json({
      calls_handled: callsHandled,
      estimated_time_saved_minutes: estimatedTimeSavedMinutes,
      estimated_cost_saved: estimatedCostSaved,
      cost_per_call: costPerCall,
      period: { from: fromDate, to: toDate },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
