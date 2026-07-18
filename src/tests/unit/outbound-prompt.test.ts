import { describe, expect, it } from "vitest";
import { buildOutboundSystemPrompt } from "@/lib/telephony/outbound-prompt";
import { compileAgent } from "@/industries/core/compiler";
import { restaurantPack } from "@/industries/restaurant/pack";

/**
 * Regression guards for a defect that reached real callers: outbound built its
 * own throwaway system prompt, so it inherited none of the compiled agent's
 * identity or the shared voice rules. Those reached inbound only, and the same
 * agent sounded like two different people depending on who dialed.
 */
const compiled = compileAgent(
  {
    tenantId: "t1",
    industryId: "restaurant",
    businessName: "Harbor House Kitchen",
    businessPhone: "+13616051492",
    timezone: "America/Chicago",
    locale: "en-US",
    features: {},
    overrides: {},
  },
  restaurantPack,
  { cuisine_type: "coastal American" },
);

function build(overrides: Partial<Parameters<typeof buildOutboundSystemPrompt>[0]> = {}) {
  return buildOutboundSystemPrompt({
    compiledPrompt: compiled.systemPrompt,
    businessName: "Harbor House Kitchen",
    category: "reminder",
    filledScript: "Confirm their reservation for Friday at 7pm.",
    ...overrides,
  });
}

describe("outbound system prompt", () => {
  it("inherits the compiled agent's voice rules", () => {
    const prompt = build();
    expect(prompt).toContain("ONE QUESTION AT A TIME");
    expect(prompt).toContain("ENDING THE CALL");
    expect(prompt).toContain("responsible for ending the call");
  });

  it("keeps the agent's business identity rather than a generic assistant", () => {
    expect(build()).toContain("Harbor House Kitchen");
  });

  it("tells the agent it initiated the call, so it opens by identifying itself", () => {
    const prompt = build();
    expect(prompt).toContain("The person did not call you");
    expect(prompt).toContain("outbound reminder call");
  });

  it("carries the filled call script through", () => {
    expect(build()).toContain("Confirm their reservation for Friday at 7pm.");
  });

  it("instructs the agent to honor an opt-out without re-pitching", () => {
    expect(build()).toContain("Do not argue or re-pitch");
  });

  it("never leaks an unresolved placeholder into spoken output", () => {
    // fillTemplate leaves `{{var}}` behind for absent optional variables; the
    // agent used to read the literal braces aloud.
    const prompt = build({
      filledScript: "Remind {{customer_name}} about their table.",
    });
    expect(prompt).not.toContain("{{");
    expect(prompt.match(/\{\{[^}]+\}\}/g)).toBeNull();
  });

  it("still produces a usable prompt when a tenant has no compiled config", () => {
    // Falling back keeps outbound working instead of failing the call outright.
    const prompt = build({ compiledPrompt: null });
    expect(prompt).toContain("You are the phone agent for Harbor House Kitchen");
    expect(prompt).toContain("Confirm their reservation for Friday at 7pm.");
  });

  it("puts the compiled prompt first so call-specific framing wins on recency", () => {
    const prompt = build();
    expect(prompt.indexOf("Harbor House Kitchen")).toBeLessThan(
      prompt.indexOf("THIS CALL:"),
    );
  });

  it("omits an empty script without leaving a blank gap", () => {
    const prompt = build({ filledScript: "" });
    expect(prompt).not.toContain("\n\n\n");
  });
});
