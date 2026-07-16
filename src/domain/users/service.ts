import { createServerClient } from "@/lib/database/supabase-server";

/**
 * Resolves the internal `users.id` for the currently-authenticated Supabase
 * Auth user, creating the row on first login if it doesn't exist yet.
 *
 * Nothing else in the app inserts into `users` — without this, any code that
 * references `users.id` (e.g. `tenant_members.user_id`) fails for every real
 * account, since only the seeded demo user has a `users` row.
 */
export async function getOrCreateInternalUser(
  authId: string,
  email: string,
  fullName?: string | null
): Promise<string> {
  const supabase = await createServerClient();

  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up internal user: ${lookupError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({ auth_id: authId, email, full_name: fullName ?? null })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to create internal user: ${insertError.message}`);
  }

  return created.id;
}
