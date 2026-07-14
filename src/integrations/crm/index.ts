import { logger } from "@/lib/observability/logger";
import { DemoCRMAdapter } from "./demo/adapter";
import { HubSpotCRMAdapter } from "./hubspot/adapter";
import type { CRMAdapter, CRMAdapterConfig } from "./types";

export type { CRMAdapter, CRMAdapterConfig } from "./types";
export type {
  CRMLeadRef,
  CRMContact,
  CRMTaskRef,
  CreateLeadInput,
  UpdateLeadInput,
  ContactQuery,
  CreateTaskInput,
} from "./types";

export function createCRMAdapter(provider: string, config: CRMAdapterConfig): CRMAdapter {
  logger.info("Creating CRM adapter", { provider, tenantId: config.tenantId });

  switch (provider) {
    case "hubspot":
      return new HubSpotCRMAdapter(config);
    case "demo":
      return new DemoCRMAdapter();
    default:
      throw new Error(`Unknown CRM provider: ${provider}`);
  }
}
