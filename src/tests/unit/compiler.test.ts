import { describe, expect, it } from "vitest";
import { compileAgent, type TenantConfig } from "@/industries/core/compiler";
import { healthcarePack } from "@/industries/healthcare/pack";
import { restaurantPack } from "@/industries/restaurant/pack";
import { realEstatePack } from "@/industries/real-estate/pack";
import type { IndustryPack } from "@/industries/core/industry-pack";

function makeTenantConfig(
  overrides: Partial<TenantConfig> = {},
): TenantConfig {
  return {
    tenantId: "a0000000-0000-0000-0000-000000000001",
    industryId: "healthcare",
    businessName: "Acme Clinic",
    businessPhone: "+15551234567",
    timezone: "America/New_York",
    locale: "en-US",
    features: {
      intent_book_appointment: true,
      category_scheduling: true,
    },
    overrides: {
      greeting: "Hello, thanks for calling {{businessName}}!",
    },
    ...overrides,
  };
}

const packs: { name: string; pack: IndustryPack }[] = [
  { name: "healthcare", pack: healthcarePack },
  { name: "restaurant", pack: restaurantPack },
  { name: "real_estate", pack: realEstatePack },
];

describe("compileAgent determinism", () => {
  for (const { name, pack } of packs) {
    it(`produces an identical hash across repeated calls for the ${name} pack`, () => {
      const tenant = makeTenantConfig({ industryId: pack.id });
      const onboardingAnswers = { practice_name: "Acme", seating_capacity: 40 };

      const results = Array.from({ length: 5 }, () =>
        compileAgent(tenant, pack, onboardingAnswers),
      );

      const [first, ...rest] = results;
      for (const result of rest) {
        expect(result.hash).toBe(first.hash);
        expect(result.inputHash).toBe(first.inputHash);
        expect(result.compiledAt).toBe(first.compiledAt);
      }
    });

    it(`produces the same hash for structurally-equal but freshly-constructed inputs (${name})`, () => {
      const tenantA = makeTenantConfig({ industryId: pack.id });
      const tenantB = JSON.parse(JSON.stringify(tenantA)) as TenantConfig;
      const onboardingA = { a: 1, b: { c: 2, d: [1, 2, 3] } };
      const onboardingB = JSON.parse(JSON.stringify(onboardingA));

      const resultA = compileAgent(tenantA, pack, onboardingA);
      const resultB = compileAgent(tenantB, pack, onboardingB);

      expect(resultA.hash).toBe(resultB.hash);
    });

    it(`is insensitive to key ordering in nested objects (${name})`, () => {
      const tenant = makeTenantConfig({ industryId: pack.id });

      const onboardingOrderedOne = { alpha: 1, beta: { x: 1, y: 2 } };
      const onboardingOrderedTwo = { beta: { y: 2, x: 1 }, alpha: 1 };

      const resultOne = compileAgent(tenant, pack, onboardingOrderedOne);
      const resultTwo = compileAgent(tenant, pack, onboardingOrderedTwo);

      expect(resultOne.hash).toBe(resultTwo.hash);
    });

    it(`changes the hash when tenant config changes (${name})`, () => {
      const tenant = makeTenantConfig({ industryId: pack.id });
      const changedTenant = makeTenantConfig({
        industryId: pack.id,
        businessName: "A Different Business Name",
      });

      const resultA = compileAgent(tenant, pack, {});
      const resultB = compileAgent(changedTenant, pack, {});

      expect(resultA.hash).not.toBe(resultB.hash);
    });

    it(`produces a well-formed CompiledAgentConfig for the ${name} pack`, () => {
      const tenant = makeTenantConfig({ industryId: pack.id });
      const result = compileAgent(tenant, pack, {});

      expect(result.hash).toMatch(/^[0-9a-f]{8}$/);
      expect(result.inputHash).toMatch(/^[0-9a-f]{8}$/);
      expect(result.tenantId).toBe(tenant.tenantId);
      expect(result.industryId).toBe(pack.id);
      expect(result.systemPrompt.length).toBeGreaterThan(0);
      expect(result.greeting).toContain(tenant.businessName);
      expect(Array.isArray(result.activeIntents)).toBe(true);
      expect(Array.isArray(result.activeTools)).toBe(true);
      expect(Array.isArray(result.activePolicies)).toBe(true);
    });
  }

  it("produces different hashes for different industry packs given the same tenant shape", () => {
    const tenantHealthcare = makeTenantConfig({ industryId: "healthcare" });
    const tenantRestaurant = makeTenantConfig({ industryId: "restaurant" });

    const resultHealthcare = compileAgent(tenantHealthcare, healthcarePack, {});
    const resultRestaurant = compileAgent(tenantRestaurant, restaurantPack, {});

    expect(resultHealthcare.hash).not.toBe(resultRestaurant.hash);
  });

  it("filters intents by feature flags deterministically", () => {
    const tenantAllOff = makeTenantConfig({
      industryId: "healthcare",
      features: {},
    });
    const result = compileAgent(tenantAllOff, healthcarePack, {});
    // With no explicit feature keys set, intents default to active (per
    // filterIntentsByFeatures fallback), so every intent should be present.
    expect(result.activeIntents.length).toBe(healthcarePack.intentCatalog.length);
  });
});
