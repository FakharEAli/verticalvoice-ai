import { redirectLiveCall } from "@/lib/telephony/twilio";
import { notifyStaff } from "@/lib/notifications/dispatch";
import type { ToolHandler, ToolHandlerMap } from "./types";

/**
 * transfer_call is common to every industry pack's tool catalog (the
 * escalation "get me a human" tool) — one shared implementation covers all
 * three verticals instead of duplicating it per industry.
 */
const handleTransferCall: ToolHandler = async ({ supabase, tenantId, callId, input, isTest }) => {
  const reason = typeof input.reason === "string" ? input.reason : "Caller requested a human.";
  // Different packs name this field differently (healthcare: priority,
  // restaurant/real-estate: no explicit field) — check both, default normal.
  const urgency =
    (typeof input.urgency === "string" && input.urgency) ||
    (typeof input.priority === "string" && input.priority) ||
    "normal";

  const { data: call } = await supabase
    .from("calls")
    .select("provider_call_id")
    .eq("id", callId)
    .single();

  const { data: activeConfig } = await supabase
    .from("active_agent_configs")
    .select("agent_config_version_id")
    .eq("tenant_id", tenantId)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let transferNumber: string | null = null;
  if (activeConfig) {
    const { data: version } = await supabase
      .from("agent_config_versions")
      .select("snapshot")
      .eq("id", activeConfig.agent_config_version_id)
      .single();
    const snapshot = version?.snapshot as { transferNumber?: string } | null;
    transferNumber = snapshot?.transferNumber ?? null;
  }

  await supabase.from("call_events").insert({
    call_id: callId,
    event_type: "escalation",
    data: { reason, urgency, transfer_number: transferNumber },
  });

  if (!isTest) {
    await notifyStaff(supabase, {
      tenantId,
      type: "escalation",
      title: urgency === "emergency" ? "Urgent: call needs a human now" : "Call escalated to a human",
      body: reason,
      data: { call_id: callId, urgency },
    });
  }

  if (transferNumber && call?.provider_call_id) {
    try {
      await redirectLiveCall(call.provider_call_id, transferNumber);
      return { transferred: true, to: transferNumber };
    } catch (err) {
      return {
        transferred: false,
        reason: "redirect_failed",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    transferred: false,
    reason: transferNumber ? "no_active_call_sid" : "no_transfer_number_configured",
    message: "A team member has been notified and will follow up directly.",
  };
};

export const transferCallHandler: ToolHandlerMap = { transfer_call: handleTransferCall };
