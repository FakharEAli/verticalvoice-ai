-- ============================================================================
-- Migration 002: Grant base table/sequence/routine privileges to the
-- standard Supabase API roles (anon, authenticated, service_role).
--
-- Migration 001 enables Row Level Security on every public table and
-- defines RLS policies, but never GRANTs the underlying SELECT/INSERT/
-- UPDATE/DELETE privileges those roles need to even attempt an operation.
-- In Postgres, GRANT and RLS are independent gates: RLS restricts *which
-- rows* a role can see/touch, but the role still needs a table-level GRANT
-- to attempt the operation at all. Hosted Supabase projects provision these
-- grants automatically as part of the platform bootstrap; local/self-hosted
-- stacks driven purely by `supabase/migrations/*.sql` do not get them for
-- free, so without this migration every request from anon/authenticated/
-- service_role fails with "permission denied for table X" before RLS is
-- even evaluated.
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
