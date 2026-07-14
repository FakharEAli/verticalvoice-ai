import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Escape hatch for querying/mutating tables that exist in the live database
 * but are not yet represented in the generated `Database` types
 * (see `./types.ts`). Using this keeps call sites free of `any` (which
 * ESLint's `@typescript-eslint/no-explicit-any` forbids) while making the
 * intentional opt-out of compile-time schema checking explicit and
 * greppable in one place.
 *
 * Prefer adding the table to `Database` in `./types.ts` and using the
 * regular typed client instead of reaching for this helper when possible.
 */
type UntypedSupabaseClient = {
  from: (table: string) => ReturnType<SupabaseClient['from']>;
};

export function fromUntypedTable(
  client: Pick<SupabaseClient, 'from'>,
  table: string
) {
  return (client as unknown as UntypedSupabaseClient).from(table);
}
