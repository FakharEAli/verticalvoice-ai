/**
 * EHR Integration Factory
 *
 * Entry point for creating EHR adapter instances. Currently only the "demo"
 * adapter is available; real EHR adapters (Epic, Cerner, etc.) will be added
 * here as they are implemented.
 */

import { logger } from "@/lib/observability/logger";
import { DemoEHRAdapter } from "@/integrations/ehr/demo/adapter";
import type { EHRAdapter, EHRAdapterConfig } from "@/integrations/ehr/types";

export type { EHRAdapter, EHRAdapterConfig } from "@/integrations/ehr/types";
export type {
  AppointmentRef,
  CreateEHRAppointmentInput,
  EHRAppointmentType,
  PatientRef,
  PatientSearchQuery,
  ProviderSchedule,
  ScheduleSlot,
} from "@/integrations/ehr/types";

/**
 * Create an EHR adapter for the given provider.
 *
 * @param provider - Adapter identifier (currently only "demo" is supported).
 * @param config   - Connection and credential configuration.
 * @returns An EHRAdapter instance.
 * @throws If the provider is not recognised.
 */
export function createEHRAdapter(provider: string, config: EHRAdapterConfig): EHRAdapter {
  logger.info("createEHRAdapter", { provider, tenantId: config.tenantId });

  switch (provider) {
    case "demo":
      return new DemoEHRAdapter(config);

    default:
      throw new Error(
        `Unknown EHR provider "${provider}". Currently supported: "demo".`,
      );
  }
}
