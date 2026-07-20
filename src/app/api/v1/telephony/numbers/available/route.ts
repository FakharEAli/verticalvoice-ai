import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import {
  isValidAreaCode,
  isValidCountry,
  normalizeAreaCode,
  normalizeCountry,
} from "@/lib/telephony/phone-number-rules";
import { searchAvailableNumbers, TwilioNumbersError } from "@/lib/telephony/twilio-numbers";

/**
 * Proxies Twilio's AvailablePhoneNumbers/{country}/Local search for
 * voice-capable numbers. Read-only: this searches inventory, it never buys.
 * All errors come back as plain English — a Twilio JSON body never reaches
 * the browser.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });
    }

    const country = normalizeCountry(request.nextUrl.searchParams.get("country") ?? "US");
    const areaCodeRaw = request.nextUrl.searchParams.get("areaCode");

    if (!isValidCountry(country)) {
      return NextResponse.json(
        { error: "Enter a two-letter country code, like US or CA." },
        { status: 400 },
      );
    }
    if (!isValidAreaCode(areaCodeRaw)) {
      return NextResponse.json(
        { error: "That area code doesn't look right — enter digits only, or leave it blank." },
        { status: 400 },
      );
    }

    const areaCode = normalizeAreaCode(areaCodeRaw);
    const numbers = await searchAvailableNumbers({
      country,
      areaCode: areaCode || undefined,
    });

    return NextResponse.json({ data: numbers });
  } catch (error) {
    if (error instanceof TwilioNumbersError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Couldn't search for available numbers right now. Please try again." },
      { status: 500 },
    );
  }
}
