/**
 * Proves the AI disclosure actually reaches Ultravox on an outbound call.
 *
 * Builds the real outbound prompt, creates a call over webRtc — no phone number
 * is dialled and nobody is rung — then reads back the systemPrompt Ultravox
 * stored, so the claim rests on what the engine received rather than on what we
 * believe we sent.
 *
 * Usage: ULTRAVOX_API_KEY=… npx vite-node -c vitest.config.ts scripts/verify-disclosure.ts
 */
import { buildOutboundSystemPrompt } from "@/lib/telephony/outbound-prompt";

const key = process.env.ULTRAVOX_API_KEY;
if (!key) {
  console.error("need ULTRAVOX_API_KEY");
  process.exit(1);
}

const prompt = buildOutboundSystemPrompt({
  compiledPrompt: "You are the phone agent for Harbor House Kitchen.",
  businessName: "Harbor House Kitchen",
  category: "reminder",
  filledScript: "Confirm their reservation.",
});

const res = await fetch("https://api.ultravox.ai/api/calls", {
  method: "POST",
  headers: { "X-API-Key": key, "Content-Type": "application/json" },
  body: JSON.stringify({ systemPrompt: prompt, medium: { webRtc: {} } }),
});

const body = (await res.json()) as { systemPrompt?: string };
if (!res.ok) {
  console.error(`ultravox rejected: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  process.exit(1);
}

const got = body.systemPrompt ?? "";
const checks: [string, boolean][] = [
  ["ultravox accepted the prompt", res.status === 201],
  ["discloses it is an AI", got.includes("You are an AI assistant, and you must say so")],
  ["names the business in the example", got.includes("I'm the AI assistant at Harbor House Kitchen")],
  ["disclosure bounded to once", got.includes("do not mention it again later")],
  ["answers 'are you real' without hedging", got.includes("without hedging")],
  ["still honours an opt-out", got.includes("Do not argue or re-pitch")],
];

for (const [label, ok] of checks) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
