/**
 * Twilio REST helpers for phone-number provisioning: searching Twilio's
 * inventory, buying a number, and releasing one.
 *
 * Follows the same fetch-based, Basic-auth-from-env approach as
 * `@/lib/telephony/twilio.ts` — no `twilio` npm SDK. Every function here maps
 * Twilio's raw HTTP errors to a plain-English message via `TwilioNumbersError`
 * so a route can surface something a human can act on, never a JSON blob.
 */

export class TwilioNumbersError extends Error {
  /** Suggested HTTP status for the API route to return. */
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "TwilioNumbersError";
    this.status = status;
  }
}

export interface AvailableNumber {
  number: string;
  locality: string | null;
  region: string | null;
}

export interface PurchasedNumber {
  sid: string;
  number: string;
}

function credentials(): { accountSid: string; authToken: string; authHeader: string } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new TwilioNumbersError(
      "Phone provisioning isn't configured yet. Add your Twilio credentials before buying numbers.",
      500,
    );
  }
  return {
    accountSid,
    authToken,
    authHeader: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
  };
}

/**
 * Pulls a human-readable reason out of Twilio's error JSON so we never hand a
 * raw `{"code":21422,...}` payload to a dashboard user. Twilio bodies look like
 * `{ "message": "...", "code": 20404, "more_info": "..." }`.
 */
async function friendlyTwilioError(res: Response, fallback: string): Promise<TwilioNumbersError> {
  let message = fallback;
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) message = body.message;
  } catch {
    // Non-JSON error body — keep the fallback wording.
  }
  // 401/403 mean our own credentials are wrong; don't leak that phrasing.
  if (res.status === 401 || res.status === 403) {
    return new TwilioNumbersError(
      "Phone provisioning rejected our credentials. Check the Twilio account configuration.",
      500,
    );
  }
  return new TwilioNumbersError(message, res.status === 400 ? 400 : 502);
}

/**
 * Searches Twilio's inventory for voice-capable local numbers in a country,
 * optionally narrowed to an area code.
 */
export async function searchAvailableNumbers(params: {
  country: string;
  areaCode?: string;
  limit?: number;
}): Promise<AvailableNumber[]> {
  const { accountSid, authHeader } = credentials();

  const query = new URLSearchParams({
    VoiceEnabled: "true",
    PageSize: String(Math.min(Math.max(params.limit ?? 20, 1), 50)),
  });
  if (params.areaCode) query.set("AreaCode", params.areaCode);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${encodeURIComponent(
    params.country,
  )}/Local.json?${query.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: authHeader } });
  } catch {
    throw new TwilioNumbersError(
      "Couldn't reach the phone-number provider. Please try again in a moment.",
    );
  }

  if (!res.ok) {
    // A bad country code comes back as 404 from Twilio; say so plainly.
    if (res.status === 404) {
      throw new TwilioNumbersError(
        `No number inventory found for country "${params.country}". Check the country code.`,
        400,
      );
    }
    throw await friendlyTwilioError(res, "Couldn't search for available numbers right now.");
  }

  const data = (await res.json()) as {
    available_phone_numbers?: Array<{
      phone_number?: string;
      locality?: string | null;
      region?: string | null;
    }>;
  };

  return (data.available_phone_numbers ?? [])
    .filter((n): n is { phone_number: string; locality?: string | null; region?: string | null } =>
      Boolean(n.phone_number),
    )
    .map((n) => ({
      number: n.phone_number,
      locality: n.locality ?? null,
      region: n.region ?? null,
    }));
}

/**
 * Buys a specific number and wires its voice webhook + status callback at the
 * moment of purchase, so the number is answerable the instant it's owned.
 * Money moves here — call this only from an explicit user "buy" action.
 */
export async function purchaseNumber(params: {
  number: string;
  voiceUrl: string;
  statusCallbackUrl: string;
}): Promise<PurchasedNumber> {
  const { accountSid, authHeader } = credentials();

  const body = new URLSearchParams({
    PhoneNumber: params.number,
    VoiceUrl: params.voiceUrl,
    VoiceMethod: "POST",
    StatusCallback: params.statusCallbackUrl,
    StatusCallbackMethod: "POST",
  });

  let res: Response;
  try {
    res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
  } catch {
    throw new TwilioNumbersError(
      "Couldn't reach the phone-number provider to complete the purchase. Please try again.",
    );
  }

  if (!res.ok) {
    throw await friendlyTwilioError(
      res,
      "That number couldn't be purchased. It may have just been taken — try searching again.",
    );
  }

  const data = (await res.json()) as { sid?: string; phone_number?: string };
  if (!data.sid || !data.phone_number) {
    throw new TwilioNumbersError("The provider confirmed the purchase without returning the number.");
  }
  return { sid: data.sid, number: data.phone_number };
}

/**
 * Releases a number back to Twilio. Best-effort: a 404 (already gone on
 * Twilio's side) is treated as success so the local row can still be removed.
 * Returns true when Twilio actually released it, false when it was already gone.
 */
export async function releaseNumber(sid: string): Promise<boolean> {
  const { accountSid, authHeader } = credentials();

  let res: Response;
  try {
    res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${encodeURIComponent(
        sid,
      )}.json`,
      { method: "DELETE", headers: { Authorization: authHeader } },
    );
  } catch {
    throw new TwilioNumbersError(
      "Couldn't reach the phone-number provider to release the number. Please try again.",
    );
  }

  if (res.status === 404) return false; // already released upstream
  if (!res.ok) {
    throw await friendlyTwilioError(res, "That number couldn't be released right now.");
  }
  return true;
}
