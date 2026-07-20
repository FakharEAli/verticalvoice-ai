import { describe, expect, it } from "vitest";
import "@/industries";
import type { IndustryId } from "@/industries/core/industry-pack";
import { getIndustryPack } from "@/industries/core/registry";
import { getIndustryToolCatalog } from "@/industries/core/tool-catalog";

const INDUSTRIES: IndustryId[] = ["healthcare", "restaurant", "real_estate"];
const MAX_SUMMARY_LENGTH = 90;

describe("getIndustryToolCatalog", () => {
  for (const industry of INDUSTRIES) {
    describe(industry, () => {
      const pack = getIndustryPack(industry);
      const catalog = getIndustryToolCatalog(industry);

      it("covers every tool the pack ships, in order, with no extras", () => {
        expect(catalog.map((entry) => entry.id)).toEqual(
          pack.tools.map((tool) => tool.id)
        );
      });

      for (const tool of pack.tools) {
        it(`has a clean, customer-facing summary for "${tool.id}"`, () => {
          const entry = catalog.find((e) => e.id === tool.id);
          expect(entry).toBeDefined();
          if (!entry) return;

          // Friendly name is present and never falls back to a raw id.
          expect(entry.name.trim().length).toBeGreaterThan(0);
          expect(entry.name).not.toContain("_");

          // Non-empty, one line, within the length budget.
          expect(entry.summary.trim().length).toBeGreaterThan(0);
          expect(entry.summary.length).toBeLessThanOrEqual(MAX_SUMMARY_LENGTH);
          expect(entry.summary).not.toContain("\n");

          // Never leak the raw tool id into customer-facing copy.
          expect(entry.summary).not.toContain(tool.id);
        });
      }
    });
  }

  it("keeps the customer-facing transfer_call summary friendly across packs", () => {
    for (const industry of INDUSTRIES) {
      const entry = getIndustryToolCatalog(industry).find(
        (e) => e.id === "transfer_call"
      );
      expect(entry?.summary).toBe("Hands the call to a human when needed.");
    }
  });
});
