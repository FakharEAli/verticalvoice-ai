ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS outbound_purpose TEXT,
  ADD COLUMN IF NOT EXISTS outbound_context JSONB;
