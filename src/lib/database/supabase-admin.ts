import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Service-role Supabase client for trusted server-to-server paths (provider
 * webhooks, background workers) that have no browser session/cookies to
 * authenticate against RLS. These callers are authenticated by other means
 * (webhook signature validation, call-scoped tokens) and are expected to
 * read/write across tenants, so they intentionally bypass RLS.
 *
 * Never use this in a request path that handles direct browser/user input
 * without its own authorization check — use `createServerClient` (RLS-scoped
 * to the signed-in user) for anything reachable from the dashboard.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
