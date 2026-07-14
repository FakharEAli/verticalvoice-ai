import { describe, expect, it } from "vitest";
import {
  checkFairHousing,
  sanitizeListingDescription,
  validateQualification,
} from "@/domain/real-estate/fair-housing";

describe("checkFairHousing", () => {
  it("flags familial-status discriminatory language", () => {
    const result = checkFairHousing("This unit is adults only, no children allowed.");
    expect(result.has_violations).toBe(true);
    expect(result.violations.some((v) => v.term === "adults only")).toBe(true);
    expect(result.violations.some((v) => v.category === "familial_status")).toBe(true);
  });

  it("flags race/national-origin discriminatory language", () => {
    const result = checkFairHousing("Located in an exclusive neighborhood, english only preferred.");
    expect(result.has_violations).toBe(true);
    const terms = result.violations.map((v) => v.term);
    expect(terms).toContain("exclusive neighborhood");
    expect(terms).toContain("english only");
  });

  it("flags disability-related discriminatory language", () => {
    const result = checkFairHousing("Must be able-bodied, no wheelchairs.");
    expect(result.has_violations).toBe(true);
    expect(result.violations.some((v) => v.category === "disability")).toBe(true);
  });

  it("flags religion-related discriminatory language", () => {
    const result = checkFairHousing("Perfect for a christian community, near church.");
    expect(result.has_violations).toBe(true);
    expect(result.violations.some((v) => v.category === "religion")).toBe(true);
  });

  it("is case-insensitive", () => {
    const result = checkFairHousing("NO CHILDREN allowed in this building.");
    expect(result.has_violations).toBe(true);
  });

  it("reports the character position of each violation", () => {
    const text = "Great home. No kids please.";
    const result = checkFairHousing(text);
    expect(result.has_violations).toBe(true);
    const violation = result.violations.find((v) => v.term === "no kids");
    expect(violation).toBeDefined();
    expect(violation!.position).toBe(text.toLowerCase().indexOf("no kids"));
  });

  it("passes objective property questions with no discriminatory language", () => {
    const result = checkFairHousing(
      "This 3-bedroom, 2-bath home has 1,800 square feet, a two-car garage, and a fenced backyard, listed at $450,000.",
    );
    expect(result.has_violations).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it("passes neutral questions about schools, commute, and amenities", () => {
    const result = checkFairHousing(
      "What school district is this in? How far is the commute downtown, and does the HOA include lawn care?",
    );
    expect(result.has_violations).toBe(false);
  });

  it("does not flag unrelated uses of similar-looking words", () => {
    // "integrated" and "segregated" are on the list, but plain neutral text
    // describing square footage/appliances should not trip other terms.
    const result = checkFairHousing(
      "The kitchen has stainless steel appliances and an open floor plan.",
    );
    expect(result.has_violations).toBe(false);
  });
});

describe("sanitizeListingDescription", () => {
  it("removes discriminatory terms and reports what was removed", () => {
    const { sanitized, removed_terms } = sanitizeListingDescription(
      "Adults only community, no kids, walking distance to shops.",
    );
    expect(sanitized).not.toMatch(/adults only/i);
    expect(sanitized).not.toMatch(/no kids/i);
    expect(removed_terms.length).toBeGreaterThan(0);
  });

  it("leaves clean listing text unchanged", () => {
    const text = "Spacious 2-bedroom apartment near public transit with in-unit laundry.";
    const { sanitized, removed_terms } = sanitizeListingDescription(text);
    expect(sanitized).toBe(text);
    expect(removed_terms).toHaveLength(0);
  });
});

describe("validateQualification", () => {
  it("flags protected-class fields used in lead scoring data", () => {
    const result = validateQualification({
      credit_score: 720,
      race: "unspecified",
      income: 85000,
    });
    expect(result.is_valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain("race");
  });

  it("flags nested/variant field names that reference protected classes", () => {
    const result = validateQualification({
      applicant_religion: "n/a",
      familial_status_notes: "none",
    });
    expect(result.is_valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it("passes objective, non-protected qualification data", () => {
    const result = validateQualification({
      credit_score: 700,
      income: 90000,
      employment_verified: true,
      requested_move_in_date: "2024-08-01",
    });
    expect(result.is_valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
