import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { verifyToolToken } from "@/lib/telephony/tool-token";
import { getToolHandler } from "@/lib/tools/registry";
import { notifyStaff } from "@/lib/notifications/dispatch";
import { isPositiveToolOutcome } from "@/lib/calls/summarize";
import { logger } from "@/lib/observability/logger";
import type { Json } from "@/lib/database/types";

/**
 * What the AI agent is told when a handler throws.
 *
 * Whatever this route returns is handed straight to the model by Ultravox and
 * can be read aloud to the caller, so the raw error must never reach it: a
 * Postgres message like `duplicate key value violates unique constraint
 * "appointments_pkey"` is a customer-hostile thing to say on a phone call, and
 * leaks schema internals besides. The real error still goes to the server log
 * and to `call_tool_runs.error_message`, so staff lose nothing.
 *
 * Phrased as an instruction rather than an opaque code so the agent recovers
 * gracefully instead of improvising a technical explanation.
 */
export const CALLER_SAFE_TOOL_ERROR =
  "That action could not be completed right now. Apologize briefly to the caller, do not mention any technical details, and offer to take their name and number so a staff member can follow up.";

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
    if (!auth.is_test && isPositiveToolOutcome(output)) {
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

    logger.error("tool-execute: handler threw", {
      toolId,
      tenantId: auth.tenant_id,
      callId: auth.call_id,
      industry: auth.industry,
      isTest: auth.is_test,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

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

    // Status stays 500 so Ultravox's own retry/timeout semantics are unchanged;
    // only the body the model sees is sanitized.
    return NextResponse.json({ error: CALLER_SAFE_TOOL_ERROR }, { status: 500 });
  }
}
