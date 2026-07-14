import { describe, expect, it } from "vitest";
import {
  allEvaluationScenarios,
  scenarioCounts,
  healthcareEvaluationScenarios,
  restaurantEvaluationScenarios,
  realEstateEvaluationScenarios,
  adversarialEvaluationScenarios,
} from "@/tests/scenarios/index";

describe("evaluation scenario suite counts", () => {
  it("totals exactly 140 scenarios (40 + 40 + 40 + 20)", () => {
    expect(healthcareEvaluationScenarios).toHaveLength(40);
    expect(restaurantEvaluationScenarios).toHaveLength(40);
    expect(realEstateEvaluationScenarios).toHaveLength(40);
    expect(adversarialEvaluationScenarios).toHaveLength(20);
    expect(allEvaluationScenarios).toHaveLength(140);
  });

  it("scenarioCounts matches the actual array lengths", () => {
    expect(scenarioCounts.healthcare).toBe(healthcareEvaluationScenarios.length);
    expect(scenarioCounts.restaurant).toBe(restaurantEvaluationScenarios.length);
    expect(scenarioCounts.realEstate).toBe(realEstateEvaluationScenarios.length);
    expect(scenarioCounts.adversarial).toBe(adversarialEvaluationScenarios.length);
    expect(scenarioCounts.total).toBe(140);
  });
});

describe("every scenario has all required fields non-empty", () => {
  it.each(allEvaluationScenarios.map((s) => [s.id, s] as const))(
    "scenario %s is well-formed",
    (_id, scenario) => {
      expect(scenario.id).toBeTruthy();
      expect(scenario.name).toBeTruthy();
      expect(scenario.description).toBeTruthy();
      expect(scenario.intentId).toBeTruthy();
      expect(Array.isArray(scenario.tags)).toBe(true);
      expect(scenario.tags.length).toBeGreaterThan(0);
      expect(Array.isArray(scenario.turns)).toBe(true);
      expect(scenario.turns.length).toBeGreaterThan(0);
      for (const turn of scenario.turns) {
        expect(turn.role).toBeTruthy();
        expect(turn.text).toBeTruthy();
      }
      expect(Array.isArray(scenario.assertions)).toBe(true);
      expect(scenario.assertions.length).toBeGreaterThan(0);
      for (const assertion of scenario.assertions) {
        expect(assertion.dimension).toBeTruthy();
        expect(assertion.check).toBeTruthy();
        expect(assertion.target).toBeTruthy();
        expect(assertion.value !== undefined && assertion.value !== "").toBe(true);
        expect(typeof assertion.weight).toBe("number");
      }
      expect(["success", "escalation", "failure"]).toContain(scenario.expectedOutcome);
    },
  );

  it("has no duplicate scenario ids across the combined suite", () => {
    const ids = allEvaluationScenarios.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("critical-safety-level scenarios document required safe behavior", () => {
  const criticalScenarios = allEvaluationScenarios.filter((s) => s.tags.includes("critical"));

  it("the combined suite contains at least one critical scenario", () => {
    expect(criticalScenarios.length).toBeGreaterThan(0);
  });

  it.each(criticalScenarios.map((s) => [s.id, s] as const))(
    "critical scenario %s is blocked/escalated AND documents required safe behavior",
    (_id, scenario) => {
      // The data model represents "must be blocked" via expectedOutcome plus
      // a blocking-relevant assertion (see toEvaluationScenario adapters in
      // src/tests/scenarios/*.ts): industry adapters use a `policy_compliance`
      // assertion with value "true" when blocked; the adversarial adapter
      // uses a `safety` assertion with value "true" when blocked. Either way,
      // EvaluationScenario itself has no standalone `expectedBlocked` field,
      // so this is the closest equivalent the data model actually supports.
      expect(scenario.expectedOutcome).toBe("escalation");

      const blockingAssertion = scenario.assertions.find(
        (a) => (a.dimension === "policy_compliance" || a.dimension === "safety") && a.value === "true",
      );
      expect(blockingAssertion).toBeDefined();

      // "Non-empty expectedActions array documenting the required safe
      // behavior": industry adapters carry a `task_completion` assertion
      // whose value is the required action; the adversarial adapter instead
      // documents required safe behavior via its non-empty `hallucination`
      // and `intent_accuracy` assertions. Either way, every critical
      // scenario must carry at least one non-blocking assertion with a
      // truthy, documented value.
      const documentingAssertions = scenario.assertions.filter(
        (a) => a.dimension !== "policy_compliance" && a.dimension !== "safety",
      );
      expect(documentingAssertions.length).toBeGreaterThan(0);
      for (const assertion of documentingAssertions) {
        expect(assertion.value).toBeTruthy();
      }
    },
  );
});
