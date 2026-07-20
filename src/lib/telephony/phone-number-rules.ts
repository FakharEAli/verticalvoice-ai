/**
 * Pure, side-effect-free rules for the phone-number management feature.
 *
 * These are separated from the Twilio REST helpers and the API routes so the
 * two decisions that actually matter — "is this search input sane?" and "is it
 * safe to release this number?" — can be unit-tested without a network, a
 * database, or a signed-in user.
 */

/** ISO 3166-1 alpha-2 country code, e.g. "US". */
export function normalizeCountry(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

/** True for a well-formed two-letter country code. */
export function isValidCountry(raw: string | null | undefined): boolean {
  return /^[A-Z]{2}$/.test(normalizeCountry(raw));
}

/** Digits only; strips spaces, parens and dashes a user might paste in. */
export function normalizeAreaCode(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * An area code is optional (a search can be country-wide). When supplied it
 * must be 2–6 digits — narrow enough to reject a full phone number pasted into
 * the area-code box, wide enough for the various national numbering plans.
 */
export function isValidAreaCode(raw: string | null | undefined): boolean {
  const digits = normalizeAreaCode(raw);
  if (digits === "") return true;
  return /^\d{2,6}$/.test(digits);
}

export interface ReleaseGuardInput {
  /** Is the number being released currently the tenant's active (default) one? */
  numberIsActive: boolean;
  /** How many OTHER active numbers the tenant has (excluding the one being released). */
  otherActiveNumbersCount: number;
  /** Does the tenant have at least one campaign in the 'running' state? */
  hasRunningCampaign: boolean;
}

export type ReleaseGuardResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Decides whether a number may be released.
 *
 * The one hard refusal: you cannot pull the tenant's LAST active number out
 * from under a campaign that is currently dialing. Doing so would leave the
 * running dialer with no number to call from — every subsequent call would
 * fail with "no active phone number", silently, one stranded target at a time.
 * Any other combination is allowed (releasing an inactive spare, or releasing
 * the active number while nothing is running).
 */
export function evaluateReleaseGuard(input: ReleaseGuardInput): ReleaseGuardResult {
  const isLastActive = input.numberIsActive && input.otherActiveNumbersCount === 0;
  if (isLastActive && input.hasRunningCampaign) {
    return {
      allowed: false,
      reason:
        "This is your only active number and a campaign is currently running. " +
        "Pause the campaign, or make another number the default, before releasing it.",
    };
  }
  return { allowed: true };
}
