// ---------------------------------------------------------------------------
// Demo Calendar Adapter – in-memory mock for development & testing
// ---------------------------------------------------------------------------

import { logger } from "@/lib/observability/logger";
import type {
  CalendarAdapter,
  CalendarAdapterConfig,
  CalendarEvent,
  TimeSlot,
  AvailabilityQuery,
  CreateEventInput,
  UpdateEventInput,
  CancelEventInput,
} from "../types";

// ---- Pre-seeded busy blocks (business hours with some gaps) --------------

/**
 * Returns deterministic busy blocks for a given date (YYYY-MM-DD).
 * Simulates a calendar with meetings scattered through 9 AM – 5 PM.
 */
function seededBusyBlocks(dateStr: string): { start: string; end: string }[] {
  // Simple hash of the date string to vary the pattern day-to-day
  let hash = 0;
  for (const ch of dateStr) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  hash = Math.abs(hash);

  const blocks: { start: string; end: string }[] = [];

  // Always block 12:00–13:00 (lunch)
  blocks.push({
    start: `${dateStr}T12:00:00`,
    end: `${dateStr}T13:00:00`,
  });

  // Conditionally add a morning standup 09:00–09:30
  if (hash % 3 !== 0) {
    blocks.push({
      start: `${dateStr}T09:00:00`,
      end: `${dateStr}T09:30:00`,
    });
  }

  // Conditionally add an afternoon block 14:00–15:00
  if (hash % 2 === 0) {
    blocks.push({
      start: `${dateStr}T14:00:00`,
      end: `${dateStr}T15:00:00`,
    });
  }

  return blocks;
}

// ---- Adapter -------------------------------------------------------------

export class DemoCalendarAdapter implements CalendarAdapter {
  private readonly events = new Map<string, CalendarEvent>();
  private readonly tenantId: string;

  constructor(config: CalendarAdapterConfig) {
    this.tenantId = config.tenantId;
    logger.debug("DemoCalendarAdapter initialised", { tenantId: this.tenantId });
  }

  async listAvailability(query: AvailabilityQuery): Promise<TimeSlot[]> {
    const windowStart = new Date(query.startDate).getTime();
    const windowEnd = new Date(query.endDate).getTime();
    const step = query.durationMinutes * 60_000;
    const slots: TimeSlot[] = [];

    // Collect busy blocks for every day in the range
    const allBusy: { start: number; end: number }[] = [];
    const dayMs = 86_400_000;
    for (let d = windowStart; d < windowEnd; d += dayMs) {
      const dateStr = new Date(d).toISOString().slice(0, 10);
      for (const b of seededBusyBlocks(dateStr)) {
        allBusy.push({
          start: new Date(b.start).getTime(),
          end: new Date(b.end).getTime(),
        });
      }
    }

    // Also treat any in-memory events as busy
    for (const evt of this.events.values()) {
      if (evt.status === "cancelled") continue;
      allBusy.push({
        start: new Date(evt.startTime).getTime(),
        end: new Date(evt.endTime).getTime(),
      });
    }

    for (let t = windowStart; t + step <= windowEnd; t += step) {
      const slotStart = t;
      const slotEnd = t + step;

      // Only mark available within business hours (09–17)
      const hour = new Date(slotStart).getUTCHours();
      const withinBusinessHours = hour >= 9 && hour < 17;

      const overlaps = allBusy.some(
        (b) => slotStart < b.end && slotEnd > b.start,
      );

      slots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotEnd).toISOString(),
        available: withinBusinessHours && !overlaps,
      });
    }

    logger.debug("Demo availability computed", {
      tenantId: this.tenantId,
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => s.available).length,
    });

    return slots;
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const id = crypto.randomUUID();

    const event: CalendarEvent = {
      id,
      calendarId: input.calendarId,
      title: input.title,
      description: input.description ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location ?? null,
      attendees: input.attendees ?? [],
      status: "confirmed",
      externalId: id,
      metadata: input.metadata ?? null,
    };

    this.events.set(id, event);

    logger.info("Demo event created", {
      tenantId: this.tenantId,
      eventId: id,
      title: input.title,
    });

    return event;
  }

  async updateEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    const existing = this.events.get(input.eventId);
    if (!existing) {
      throw new Error(`Demo event not found: ${input.eventId}`);
    }

    const updated: CalendarEvent = {
      ...existing,
      title: input.title ?? existing.title,
      description: input.description !== undefined ? input.description ?? null : existing.description,
      startTime: input.startTime ?? existing.startTime,
      endTime: input.endTime ?? existing.endTime,
      location: input.location !== undefined ? input.location ?? null : existing.location,
      attendees: input.attendees ?? existing.attendees,
    };

    this.events.set(input.eventId, updated);

    logger.info("Demo event updated", {
      tenantId: this.tenantId,
      eventId: input.eventId,
    });

    return updated;
  }

  async cancelEvent(input: CancelEventInput): Promise<void> {
    const existing = this.events.get(input.eventId);
    if (!existing) {
      throw new Error(`Demo event not found: ${input.eventId}`);
    }

    this.events.set(input.eventId, { ...existing, status: "cancelled" });

    logger.info("Demo event cancelled", {
      tenantId: this.tenantId,
      eventId: input.eventId,
      reason: input.reason,
    });
  }
}
