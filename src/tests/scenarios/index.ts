/**
 * Combined evaluation scenario suite.
 *
 * Re-exports every industry-specific and adversarial scenario set, plus a
 * single `allScenarios` array that merges them for full-suite evaluation runs.
 */

export {
  healthcareTestScenarios,
  healthcareEvaluationScenarios,
} from "./healthcare";
export type { HealthcareTestScenario } from "./healthcare";

export {
  restaurantTestScenarios,
  restaurantEvaluationScenarios,
} from "./restaurant";
export type { RestaurantTestScenario } from "./restaurant";

export {
  realEstateTestScenarios,
  realEstateEvaluationScenarios,
} from "./real-estate";
export type { RealEstateTestScenario } from "./real-estate";

export {
  adversarialTestScenarios,
  adversarialEvaluationScenarios,
} from "./adversarial";
export type { AdversarialTestScenario } from "./adversarial";

// ─── Combined Suite ─────────────────────────────────────────────────────────

import type { EvaluationScenario } from "@/industries/core/industry-pack";
import { healthcareEvaluationScenarios } from "./healthcare";
import { restaurantEvaluationScenarios } from "./restaurant";
import { realEstateEvaluationScenarios } from "./real-estate";
import { adversarialEvaluationScenarios } from "./adversarial";

/** All 140 evaluation scenarios across all industries + adversarial. */
export const allEvaluationScenarios: EvaluationScenario[] = [
  ...healthcareEvaluationScenarios,
  ...restaurantEvaluationScenarios,
  ...realEstateEvaluationScenarios,
  ...adversarialEvaluationScenarios,
];

/** Scenario counts for quick reference. */
export const scenarioCounts = {
  healthcare: healthcareEvaluationScenarios.length,
  restaurant: restaurantEvaluationScenarios.length,
  realEstate: realEstateEvaluationScenarios.length,
  adversarial: adversarialEvaluationScenarios.length,
  total: 0 as number,
};
scenarioCounts.total =
  scenarioCounts.healthcare +
  scenarioCounts.restaurant +
  scenarioCounts.realEstate +
  scenarioCounts.adversarial;
