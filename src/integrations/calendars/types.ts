// ---------------------------------------------------------------------------
// Calendar Integration – shared types & adapter interface
// ---------------------------------------------------------------------------

/** A discrete time window with availability information. */
export interface TimeSlot {
  start: string; // ISO-8601
  end: string;   // ISO-8601
  available: boolean;
}

/** Canonical representation of an event on an external calendar. */
export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description: string | null;
  startTime: string; // ISO-8601
  endTime: string;   // ISO-8601
  location: string | null;
  attendees: string[];
  status: "confirmed" | "tentative" | "cancelled";
  externalId: string | null;
  metadata: Record<string, unknown> | null;
}

// ---- Query / Input shapes ------------------------------------------------

export interface AvailabilityQuery {
  calendarId: string;
  startDate: string;  // ISO-8601 date or datetime
  endDate: string;    // ISO-8601 date or datetime
  durationMinutes: number;
  timezone: string;
}

export interface CreateEventInput {
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEventInput {
  eventId: string;
  calendarId: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: string[];
}

export interface CancelEventInput {
  eventId: string;
  calendarId: string;
  reason?: string;
}

// ---- Adapter config & interface ------------------------------------------

export interface CalendarAdapterConfig {
  connectionId: string;
  tenantId: string;
  credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string; // ISO-8601
  };
}

/**
 * Common interface every calendar provider adapter must implement.
 * Each method operates against the external calendar API.
 */
export interface CalendarAdapter {
  listAvailability(query: AvailabilityQuery): Promise<TimeSlot[]>;
  createEvent(input: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(input: UpdateEventInput): Promise<CalendarEvent>;
  cancelEvent(input: CancelEventInput): Promise<void>;
}
