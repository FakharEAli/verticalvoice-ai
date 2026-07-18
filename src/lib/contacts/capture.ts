import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { isRealPhoneNumber } from "@/lib/calls/display";

/**
 * Records the other party of a call in the tenant's contact book.
 *
 * This is the auto-capture half of Contacts: every real number the platform
 * dials or is dialed by becomes a contact automatically, so the book fills
 * itself without anyone typing anything. The manual/CSV paths write to the
 * same (tenant_id, phone) row, which is why this upserts rather than inserts.
 *
 * Two rules shape the implementation:
 *
 *  1. Junk in, nothing out. Twilio Client (the Test Center's browser calling)
 *     reports the caller as `client:browser-test-<uuid>` — an identity string,
 *     not a number. Storing those would fill the book with unreachable rows
 *     that look like contacts, so anything that isn't dialable is dropped.
 *
 *  2. Never throw. This runs inside the call pipelines (reconcile, webhooks).
 *     A contact-bookkeeping failure must never be the reason a call fails to
 *     reconcile, so every error is swallowed — the number is recoverable from
 *     the calls table on a later pass, a lost call outcome is not.
 */
export async function captureContactFromCall(
  supabase: SupabaseClient<Database>,
  args: {
    tenantId: string;
    phone: string | null | undefined;
    name?: string | null;
    direction: string;
    callId: string;
    occurredAt?: string;
  }
): Promise<void> {
  try {
    const { tenantId, phone, name, direction, occurredAt } = args;

    if (!tenantId) return;
    if (!isRealPhoneNumber(phone)) return;

    const number = (phone as string).trim();
    const contactedAt = occurredAt ?? new Date().toISOString();
    const source = direction === "outbound" ? "outbound_call" : "inbound_call";

    const { data: existing, error: lookupError } = await supabase
      .from("contacts")
      .select("id, name, call_count, first_contacted_at")
      .eq("tenant_id", tenantId)
      .eq("phone", number)
      .maybeSingle();

    if (lookupError) return;

    if (existing) {
      // Bump the tally and recency. `name` is only filled in when we have one
      // and the row doesn't — a name a human typed (or an earlier call
      // captured) outranks whatever the carrier hands us this time.
      const patch: Database["public"]["Tables"]["contacts"]["Update"] = {
        call_count: (existing.call_count ?? 0) + 1,
        last_contacted_at: contactedAt,
        updated_at: contactedAt,
      };
      if (!existing.name && name) patch.name = name;
      if (!existing.first_contacted_at) patch.first_contacted_at = contactedAt;

      await supabase.from("contacts").update(patch).eq("id", existing.id).eq("tenant_id", tenantId);
      return;
    }

    await supabase.from("contacts").insert({
      tenant_id: tenantId,
      phone: number,
      name: name ?? null,
      source,
      first_contacted_at: contactedAt,
      last_contacted_at: contactedAt,
      call_count: 1,
    });
  } catch {
    // Intentionally silent — see rule 2 above.
  }
}
