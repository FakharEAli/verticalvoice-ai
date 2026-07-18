-- ============================================================================
-- Migration 009: Contacts — the tenant's phone book.
--
-- Until now every phone number the platform touched lived only inside the
-- `calls` rows that used it, so there was no way to answer "who have we ever
-- spoken to?", no way to bulk-load a list to dial, and no place to record a
-- do-not-call flag. This table is that book: every real dialable number the
-- tenant has called, been called by, uploaded, or typed in by hand.
--
-- Deliberately NOT a child of `calls`: a contact outlives any single call
-- (uploaded lists have no call at all), and the same number recurring across
-- many calls must collapse to ONE row — hence the (tenant_id, phone) unique
-- index, which is also the upsert conflict target used by the auto-capture
-- path and the CSV importer.
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT,
  tags TEXT[],
  -- inbound_call | outbound_call | uploaded | manual
  source TEXT NOT NULL DEFAULT 'manual',
  first_contacted_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  call_count INTEGER NOT NULL DEFAULT 0,
  do_not_call BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per number per tenant. Doubles as the ON CONFLICT target for the
-- call-capture upsert and the CSV import, so a number seen 40 times stays a
-- single contact whose call_count is 40.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_tenant_phone ON contacts(tenant_id, phone);

-- Default listing order (newest first), tenant-scoped.
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_created ON contacts(tenant_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- Row Level Security — mirrors the standard tenant-scoped pattern from
-- migration 001 (see the `tenant_tables` DO block there). Migration 001's
-- RLS-enable loop ran over the tables that existed at the time, so a table
-- added later must enable RLS and declare its four policies explicitly;
-- without this block `contacts` would be readable by any authenticated user
-- of any tenant, since migration 002 GRANTs table privileges broadly and
-- relies on RLS alone to scope rows.
-- ----------------------------------------------------------------------------
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_tenant_select ON contacts;
DROP POLICY IF EXISTS contacts_tenant_insert ON contacts;
DROP POLICY IF EXISTS contacts_tenant_update ON contacts;
DROP POLICY IF EXISTS contacts_tenant_delete ON contacts;

CREATE POLICY contacts_tenant_select ON contacts FOR SELECT
  USING (is_tenant_member(tenant_id));
CREATE POLICY contacts_tenant_insert ON contacts FOR INSERT
  WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY contacts_tenant_update ON contacts FOR UPDATE
  USING (is_tenant_member(tenant_id));
CREATE POLICY contacts_tenant_delete ON contacts FOR DELETE
  USING (is_tenant_member(tenant_id));

-- ----------------------------------------------------------------------------
-- Table privileges — the same grants migration 002 applies to every other
-- public table. Migration 002's ALTER DEFAULT PRIVILEGES only covers tables
-- created by the same role, so this is stated explicitly rather than assumed.
-- Row scoping is enforced by the RLS policies above, not by withholding the
-- GRANT (that is the project-wide pattern established in 002).
-- ----------------------------------------------------------------------------
GRANT ALL ON TABLE contacts TO postgres, anon, authenticated, service_role;
