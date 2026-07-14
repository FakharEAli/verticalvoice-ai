import { logger } from "@/lib/observability/logger";
import type { POSAdapter, POSAdapterConfig } from "@/integrations/pos/types";
import { DemoPOSAdapter } from "@/integrations/pos/demo/adapter";
import { SquarePOSAdapter } from "@/integrations/pos/square/adapter";

export type { POSAdapter, POSAdapterConfig } from "@/integrations/pos/types";
export type {
  POSMenuItem,
  POSOrderInput,
  POSOrderItemInput,
  OrderConfirmation,
  OrderStatus,
} from "@/integrations/pos/types";

/**
 * Create a POS adapter for the given provider.
 *
 * @param provider - "demo" | "square"
 * @param config   - connection and credential details
 */
export function createPOSAdapter(
  provider: string,
  config: POSAdapterConfig,
): POSAdapter {
  switch (provider) {
    case "demo": {
      logger.info("POS: creating DemoPOSAdapter", {
        tenantId: config.tenantId,
      });
      return new DemoPOSAdapter();
    }

    case "square": {
      logger.info("POS: creating SquarePOSAdapter", {
        tenantId: config.tenantId,
        connectionId: config.connectionId,
      });
      return new SquarePOSAdapter(config);
    }

    default:
      throw new Error(
        `Unknown POS provider: "${provider}". Supported providers: demo, square`,
      );
  }
}
