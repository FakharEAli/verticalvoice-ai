import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";

/**
 * Resolves the tenant a dashboard user should currently be operating in.
 *
 * `userId` here is the Supabase Auth user id (`auth.users.id`, i.e.
 * `supabase.auth.getUser().data.user.id`) — NOT the internal `users.id`.
 * `tenant_members.user_id` references the internal `users.id`, so we first
 * resolve `users.auth_id = userId` to get that internal id, then look up
 * tenant membership for it.
 *
 * A user can belong to multiple tenants (via `tenant_members`); this picks
 * the earliest one they joined (ordered by `created_at` ascending). Returns
 * `null` if the user has no internal `users` row or no tenant membership.
 */
export async function getCurrentTenantId(userId: string): Promise<string | null> {
  const supabase = await createServerClient();

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", userId)
    .maybeSingle();

  if (userError) {
    logger.error("Failed to resolve internal user for tenant lookup", {
      userId,
      error: userError.message,
    });
    return null;
  }

  if (!userRow) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userRow.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    logger.error("Failed to resolve tenant membership", {
      userId,
      internalUserId: userRow.id,
      error: membershipError.message,
    });
    return null;
  }

  return membership?.tenant_id ?? null;
}
