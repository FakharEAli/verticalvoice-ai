/**
 * Prepends the current date/time (in the business's timezone) to an agent
 * system prompt. Without this the model has no idea what "today" is, so when
 * a caller says "book a table for tonight" it guesses a date — and guesses
 * wrong (e.g. a year in the past), which then never surfaces in the
 * upcoming-bookings views. Giving it an explicit "now" fixes bookings at the
 * source.
 */
export function withCurrentDateContext(systemPrompt: string, timezone?: string | null): string {
  const tz = timezone || "UTC";
  const now = new Date();

  let dateStr: string;
  let year: string;
  try {
    dateStr = now.toLocaleString("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    year = now.toLocaleString("en-US", { timeZone: tz, year: "numeric" });
  } catch {
    // Invalid timezone string — fall back to UTC.
    dateStr = now.toLocaleString("en-US", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    year = String(now.getUTCFullYear());
  }

  const preamble =
    `CURRENT DATE AND TIME: ${dateStr}. ` +
    `Always resolve relative dates and times the caller mentions ("today", "tonight", "tomorrow", "this Friday", "next week") against this exact moment. ` +
    `The current year is ${year} — never book or schedule anything in a past year, and never guess the date.`;

  return `${preamble}\n\n${systemPrompt}`;
}
