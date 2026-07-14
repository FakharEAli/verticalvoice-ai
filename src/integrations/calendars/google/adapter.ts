// ---------------------------------------------------------------------------
// Google Calendar Adapter – OAuth2 + Calendar API v3
// ---------------------------------------------------------------------------

import { z } from "zod";
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

// ---- Zod schemas for Google API responses --------------------------------

const GoogleEventSchema = z.object({
  id: z.string(),
  summary: z.string().optional().default("(no title)"),
  description: z.string().optional().nullable(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  location: z.string().optional().nullable(),
  attendees: z
    .array(z.object({ email: z.string() }))
    .optional()
    .default([]),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional().default("confirmed"),
  htmlLink: z.string().optional().nullable(),
});

const FreeBusyResponseSchema = z.object({
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(
        z.object({ start: z.string(), end: z.string() }),
      ),
    }),
  ),
});

const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

// ---- Helpers -------------------------------------------------------------

const BASE_URL = "https://www.googleapis.com/calendar/v3";

function toCalendarEvent(raw: z.infer<typeof GoogleEventSchema>, calendarId: string): CalendarEvent {
  return {
    id: raw.id,
    calendarId,
    title: raw.summary,
    description: raw.description ?? null,
    startTime: raw.start.dateTime ?? raw.start.date ?? "",
    endTime: raw.end.dateTime ?? raw.end.date ?? "",
    location: raw.location ?? null,
    attendees: raw.attendees.map((a) => a.email),
    status: raw.status,
    externalId: raw.id,
    metadata: raw.htmlLink ? { htmlLink: raw.htmlLink } : null,
  };
}

// ---- Adapter -------------------------------------------------------------

export class GoogleCalendarAdapter implements CalendarAdapter {
  private accessToken: string;
  private refreshToken: string | undefined;
  private expiresAt: Date | undefined;
  private readonly connectionId: string;
  private readonly tenantId: string;

  constructor(config: CalendarAdapterConfig) {
    this.accessToken = config.credentials.accessToken;
    this.refreshToken = config.credentials.refreshToken;
    this.expiresAt = config.credentials.expiresAt
      ? new Date(config.credentials.expiresAt)
      : undefined;
    this.connectionId = config.connectionId;
    this.tenantId = config.tenantId;
  }

  // -- Public API ----------------------------------------------------------

  async listAvailability(query: AvailabilityQuery): Promise<TimeSlot[]> {
    const body = {
      timeMin: query.startDate,
      timeMax: query.endDate,
      timeZone: query.timezone,
      items: [{ id: query.calendarId }],
    };

    const res = await this.authedFetch(`${BASE_URL}/freeBusy`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const json = await res.json();
    const parsed = FreeBusyResponseSchema.parse(json);
    const busySlots = parsed.calendars[query.calendarId]?.busy ?? [];

    return this.buildSlots(query, busySlots);
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const body: Record<string, unknown> = {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.startTime, timeZone: input.timezone },
      end: { dateTime: input.endTime, timeZone: input.timezone },
      location: input.location,
      attendees: input.attendees?.map((email) => ({ email })),
    };

    const res = await this.authedFetch(
      `${BASE_URL}/calendars/${encodeURIComponent(input.calendarId)}/events`,
      { method: "POST", body: JSON.stringify(body) },
    );

    const json = await res.json();
    const parsed = GoogleEventSchema.parse(json);
    logger.info("Google Calendar event created", {
      tenantId: this.tenantId,
      eventId: parsed.id,
    });
    return toCalendarEvent(parsed, input.calendarId);
  }

  async updateEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body.summary = input.title;
    if (input.description !== undefined) body.description = input.description;
    if (input.startTime !== undefined) body.start = { dateTime: input.startTime };
    if (input.endTime !== undefined) body.end = { dateTime: input.endTime };
    if (input.location !== undefined) body.location = input.location;
    if (input.attendees !== undefined)
      body.attendees = input.attendees.map((email) => ({ email }));

    const res = await this.authedFetch(
      `${BASE_URL}/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );

    const json = await res.json();
    const parsed = GoogleEventSchema.parse(json);
    logger.info("Google Calendar event updated", {
      tenantId: this.tenantId,
      eventId: parsed.id,
    });
    return toCalendarEvent(parsed, input.calendarId);
  }

  async cancelEvent(input: CancelEventInput): Promise<void> {
    await this.authedFetch(
      `${BASE_URL}/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      { method: "DELETE" },
    );

    logger.info("Google Calendar event cancelled", {
      tenantId: this.tenantId,
      eventId: input.eventId,
      reason: input.reason,
    });
  }

  // -- Private helpers -----------------------------------------------------

  private async authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    await this.ensureValidToken();

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.accessToken}`);
    headers.set("Content-Type", "application/json");

    const res = await fetch(url, { ...init, headers });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      logger.error("Google Calendar API error", {
        tenantId: this.tenantId,
        connectionId: this.connectionId,
        status: res.status,
        url,
        body: errorBody.slice(0, 500),
      });
      throw new Error(
        `Google Calendar API responded with ${res.status}: ${errorBody.slice(0, 200)}`,
      );
    }

    return res;
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.refreshToken) return;
    if (this.expiresAt && this.expiresAt.getTime() > Date.now() + 60_000) return;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.warn("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET – skipping token refresh", {
        tenantId: this.tenantId,
      });
      return;
    }

    logger.debug("Refreshing Google OAuth2 token", {
      tenantId: this.tenantId,
      connectionId: this.connectionId,
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("Google token refresh failed", {
        tenantId: this.tenantId,
        status: res.status,
        body: body.slice(0, 300),
      });
      throw new Error(`Google token refresh failed with ${res.status}`);
    }

    const json = await res.json();
    const tokens = TokenResponseSchema.parse(json);
    this.accessToken = tokens.access_token;
    this.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  }

  /**
   * Converts a list of busy periods into discrete TimeSlots aligned to
   * `durationMinutes` within the queried window.
   */
  private buildSlots(
    query: AvailabilityQuery,
    busy: { start: string; end: string }[],
  ): TimeSlot[] {
    const windowStart = new Date(query.startDate).getTime();
    const windowEnd = new Date(query.endDate).getTime();
    const step = query.durationMinutes * 60_000;
    const slots: TimeSlot[] = [];

    for (let t = windowStart; t + step <= windowEnd; t += step) {
      const slotStart = t;
      const slotEnd = t + step;
      const overlaps = busy.some((b) => {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        return slotStart < be && slotEnd > bs;
      });

      slots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotEnd).toISOString(),
        available: !overlaps,
      });
    }

    return slots;
  }
}
