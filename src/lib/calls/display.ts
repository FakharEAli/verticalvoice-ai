/**
 * Human-friendly rendering of a call's "who" field.
 *
 * Twilio Client (the Test Center's browser calling) reports the caller as an
 * opaque identity string like `client:browser-test-3d6a5826-7fc3-...`, which
 * is unreadable in a dashboard. Real PSTN calls arrive as E.164 numbers.
 */
export function displayCallerName(callerNumber: string | null | undefined): string {
  if (!callerNumber) return "Unknown caller";
  if (callerNumber.startsWith("client:browser-test")) return "Browser test call";
  if (callerNumber.startsWith("client:")) return "Web call";
  return formatPhoneNumber(callerNumber);
}

/** True when the value is a real dialable number rather than a soft-client id. */
export function isRealPhoneNumber(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.startsWith("client:")) return false;
  return /^\+?[0-9][0-9\s().-]{6,}$/.test(value);
}

/** +15550001234 -> +1 (555) 000-1234; anything unexpected is returned as-is. */
export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const digits = value.replace(/[^\d+]/g, "");
  const us = digits.match(/^\+?1(\d{3})(\d{3})(\d{4})$/);
  if (us) return `+1 (${us[1]}) ${us[2]}-${us[3]}`;
  return value;
}

/** "Jul 17, 7:30 PM" — the standard short timestamp used across the dashboard. */
export function formatDateTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    ...(timeZone ? { timeZone } : {}),
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 125 -> "2m 5s"; null -> "—". Plain English rather than a bare mm:ss. */
export function formatDurationWords(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/** snake_case / kebab -> "Sentence case" for statuses, tool names, categories. */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** 4599 -> "$45.99" */
export function formatMoneyFromCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
