/**
 * Places a real outbound call, driving the same modules the outbound route
 * uses so the test exercises production code rather than a parallel copy.
 *
 * The HTTP route itself needs a Supabase SSR cookie session, which is awkward
 * to mint from a shell. Everything below the auth layer — prompt composition,
 * tool wiring, Ultravox call creation, the Twilio helper, the call row — is
 * identical to `src/app/api/v1/calls/outbound/route.ts`.
 *
 * Usage:
 *   SUPABASE_URL=… SERVICE_KEY=… TOOL_TOKEN_SECRET=… \
 *   npx vite-node -c vitest.config.ts scripts/place-test-call.ts <e164_number>
 */
import "@/industries";
import { getIndustryPack } from "@/industries/core/registry";
import { buildOutboundSystemPrompt } from "@/lib/telephony/outbound-prompt";
import { withCurrentDateContext } from "@/lib/telephony/prompt-context";
import { buildSelectedTools } from "@/lib/telephony/ultravox-tools";
import { createUltravoxCall } from "@/lib/telephony/ultravox";
import { placeOutboundCall } from "@/lib/telephony/twilio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SERVICE_KEY;
const TENANT = "c8460639-2c35-480f-8b2f-c7b425740207";
const toNumber = process.argv[2];

if (!SUPABASE_URL || !SERVICE_KEY || !toNumber) {
  console.error("need SUPABASE_URL, SERVICE_KEY env and <e164_number> arg");
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${REST}/${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function main() {
  const [tenant] = await get<any[]>(`tenants?select=*&id=eq.${TENANT}`);
  const [profile] = await get<any[]>(`business_profiles?select=*&tenant_id=eq.${TENANT}`);
  const [phone] = await get<any[]>(
    `phone_numbers?select=number&tenant_id=eq.${TENANT}&status=eq.active`,
  );
  if (!phone) throw new Error("tenant has no active phone number");

  const pack = getIndustryPack(tenant.industry);
  if (!pack) throw new Error(`no pack for ${tenant.industry}`);

  const [active] = await get<any[]>(
    `active_agent_configs?select=agent_config_version_id&tenant_id=eq.${TENANT}`,
  );
  const [version] = await get<any[]>(
    `agent_config_versions?select=snapshot,version&id=eq.${active.agent_config_version_id}`,
  );
  const compiledPrompt: string | null = version?.snapshot?.system_prompt ?? null;
  const voiceId: string | null = version?.snapshot?.voice?.voice_id ?? null;

  const callType = pack.outboundCallTypes[0];
  const businessName = profile?.business_name ?? tenant.name;

  const base = buildOutboundSystemPrompt({
    compiledPrompt,
    businessName,
    category: callType.category,
    filledScript:
      "This is a live system test. Greet them, confirm you can hear each other clearly, ask if they would like to book a table, and handle it if they say yes. Keep it short.",
  });
  const systemPrompt = withCurrentDateContext(base, profile?.timezone);

  console.log(`agent config      : v${version.version}`);
  console.log(`prompt chars      : ${systemPrompt.length}`);
  console.log(`unresolved {{ }}  : ${/\{\{[^}]+\}\}/.test(systemPrompt)}`);
  console.log(`voice rules present: ${systemPrompt.includes("ONE QUESTION AT A TIME")}`);
  console.log(`from -> to        : ${phone.number} -> ${toNumber}`);

  const insertRes = await fetch(`${REST}/calls`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      tenant_id: TENANT,
      direction: "outbound",
      status: "initiating",
      caller_number: phone.number,
      called_number: toNumber,
      started_at: new Date().toISOString(),
      outbound_purpose: callType.id,
      outbound_context: { source: "operator_test_call" },
    }),
  });
  if (!insertRes.ok) throw new Error(`call insert failed: ${await insertRes.text()}`);
  const [call] = await insertRes.json();
  console.log(`call row          : ${call.id}`);

  const selectedTools = buildSelectedTools(pack, {
    callId: call.id,
    tenantId: TENANT,
    industry: pack.id,
  });
  console.log(`tools wired       : ${selectedTools.length}`);

  const uv = await createUltravoxCall(systemPrompt, voiceId, selectedTools);
  if (!uv.joinUrl) throw new Error("Ultravox returned no joinUrl");
  console.log(`ultravox call     : ${uv.callId}`);

  const twilio = await placeOutboundCall({
    to: toNumber,
    from: phone.number,
    ultravoxJoinUrl: uv.joinUrl,
    statusCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/webhooks/twilio`,
  });

  await fetch(`${REST}/calls?id=eq.${call.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      provider_call_id: twilio.sid,
      ultravox_call_id: uv.callId,
      updated_at: new Date().toISOString(),
    }),
  });

  console.log(`\n*** CALL PLACED — your phone should ring ***`);
  console.log(`twilio sid        : ${twilio.sid}`);
  console.log(`internal call id  : ${call.id}`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
