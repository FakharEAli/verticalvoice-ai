import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { verifyToolToken } from "@/lib/telephony/tool-token";
import { getToolHandler } from "@/lib/tools/registry";
import { notifyStaff } from "@/lib/notifications/dispatch";
import type { Json } from "@/lib/database/types";

const POSITIVE_OUTCOME_KEYS = ["booked", "confirmed", "captured", "submitted", "created"];

function describeOutcome(toolId: string, output: Record<string, unknown>): string {
  const idField = Object.entries(output).find(([k, v]) => k.endsWith("_id") && typeof v === "string");
  const detail = idField ? ` (${idField[0]}: ${idField[1]})` : "";
  return `${toolId.replace(/_/g, " ")}${detail}`;
}

/**
 * Single dispatch point every Ultravox tool call hits mid-conversation
 * (wired via buildSelectedTools' http.baseUrlPattern). Auth is a signed
 * token scoped to one call/tenant/industry — Ultravox itself has no
 * concept of "which call is this", so identity travels with the tool
 * definition rather than the request.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { toolId } = await params;
  const handler = getToolHandler(auth.industry, toolId);
  if (!handler) {
    return NextResponse.json(
      { error: `Unknown tool "${toolId}" for industry ${auth.industry}` },
      { status: 404 }
    );
  }

  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const supabase = createAdminClient();
  const startedAt = Date.now();

  try {
    const output = await handler({
      supabase,
      tenantId: auth.tenant_id,
      callId: auth.call_id,
      input,
      isTest: auth.is_test,
    });

    await supabase.from("call_tool_runs").insert({
      call_id: auth.call_id,
      tool_name: toolId,
      input: input as unknown as Json,
      output: output as unknown as Json,
      status: "success",
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    });

    // Fire a staff notification for genuinely positive outcomes only (the
    // handler's own {booked:true}/{confirmed:true}/etc marker) — not for
    // read-only lookups like check_availability/get_menu/search_listings.
    // Never for test calls: a business owner testing their agent shouldn't
    // get spammed with "new booking" emails for their own test bookings.
    if (!auth.is_test && POSITIVE_OUTCOME_KEYS.some((k) => output[k] === true)) {
      await notifyStaff(supabase, {
        tenantId: auth.tenant_id,
        type: toolId,
        title: `New: ${describeOutcome(toolId, output)}`,
        body: `Your AI agent just completed "${toolId.replace(/_/g, " ")}" during a call. Check the Operations dashboard for details.`,
        data: { call_id: auth.call_id, tool_id: toolId, output },
      });
    }

    return NextResponse.json(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed";

    await supabase.from("call_tool_runs").insert({
      call_id: auth.call_id,
      tool_name: toolId,
      input: input as unknown as Json,
      output: { error: message } as unknown as Json,
      status: "error",
      error_message: message,
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
