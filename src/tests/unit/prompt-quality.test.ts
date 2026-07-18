import { describe, expect, it } from "vitest";
import { compileAgent } from "@/industries/core/compiler";
import { restaurantPack } from "@/industries/restaurant/pack";
import { healthcarePack } from "@/industries/healthcare/pack";
import { realEstatePack } from "@/industries/real-estate/pack";
import type { IndustryPack } from "@/industries/core/industry-pack";

/**
 * Regression guards for two bugs that reached real callers:
 *
 *  1. The agent said "Thank you for calling {{restaurant_name}}" out loud,
 *     because the packs use industry-specific variable names the compiler
 *     never supplied.
 *  2. The agent never hung up, because the prompt literally instructed it to
 *     "ask if there is anything else you can help with" before ending — an
 *     instruction with no exit condition.
 */
function compile(pack: IndustryPack) {
  return compileAgent(
    {
      tenantId: "t1",
      industryId: pack.id,
      businessName: "Harbor House Kitchen",
      businessPhone: "+13616051492",
      timezone: "America/New_York",
      locale: "en-US",
      features: {},
      overrides: {},
    },
    pack,
    { cuisine_type: "coastal American" },
  );
}

const packs: [string, IndustryPack][] = [
  ["restaurant", restaurantPack],
  ["healthcare", healthcarePack],
  ["real_estate", realEstatePack],
];

describe.each(packs)("compiled %s prompt is speakable", (_name, pack) => {
  const compiled = compile(pack);

  it("leaves no unresolved template placeholder in the prompt or greeting", () => {
    expect(compiled.systemPrompt.match(/\{\{[^}]+\}\}/g)).toBeNull();
    expect(compiled.greeting.match(/\{\{[^}]+\}\}/g)).toBeNull();
  });

  it("names the actual business", () => {
    expect(compiled.systemPrompt).toContain("Harbor House Kitchen");
  });

  it("carries the shared voice conversation rules", () => {
    expect(compiled.systemPrompt).toContain("ONE QUESTION AT A TIME");
    expect(compiled.systemPrompt).toContain("ENDING THE CALL");
  });

  it("makes the agent responsible for ending the call", () => {
    expect(compiled.systemPrompt).toContain("responsible for ending the call");
  });

  it("no longer contains the open-ended 'anything else' loop", () => {
    expect(compiled.systemPrompt).not.toContain(
      "ask if there is anything else you can help with",
    );
  });
});

describe("restaurant prompt specifics", () => {
  const compiled = compile(restaurantPack);

  it("interpolates the cuisine descriptor from onboarding answers", () => {
    expect(compiled.systemPrompt).toContain("coastal American");
  });

  it("does not instruct a full item-by-item read-back", () => {
    expect(compiled.systemPrompt).not.toContain("always repeat back");
  });
});
