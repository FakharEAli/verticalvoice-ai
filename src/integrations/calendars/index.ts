// ---------------------------------------------------------------------------
// Calendar Adapter Factory
// ---------------------------------------------------------------------------

import { logger } from "@/lib/observability/logger";
import type { CalendarAdapter, CalendarAdapterConfig } from "./types";
import { GoogleCalendarAdapter } from "./google/adapter";
import { DemoCalendarAdapter } from "./demo/adapter";

export type { CalendarAdapter, CalendarAdapterConfig } from "./types";
export type {
  TimeSlot,
  CalendarEvent,
  AvailabilityQuery,
  CreateEventInput,
  UpdateEventInput,
  CancelEventInput,
} from "./types";

/**
 * Instantiate the correct calendar adapter for `provider`.
 *
 * @throws Error if the provider is not recognised.
 */
export function createCalendarAdapter(
  provider: string,
  config: CalendarAdapterConfig,
): CalendarAdapter {
  switch (provider) {
    case "google":
      logger.debug("Creating GoogleCalendarAdapter", {
        tenantId: config.tenantId,
        connectionId: config.connectionId,
      });
      return new GoogleCalendarAdapter(config);

    case "demo":
      logger.debug("Creating DemoCalendarAdapter", {
        tenantId: config.tenantId,
        connectionId: config.connectionId,
      });
      return new DemoCalendarAdapter(config);

    default:
      throw new Error(`Unknown calendar provider: "${provider}"`);
  }
}
