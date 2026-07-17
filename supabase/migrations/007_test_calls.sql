-- Test Center "Live Test Call" places a real Twilio call through the same
-- inbound webhook a genuine customer call hits, so without a flag, test
-- calls and the bookings/leads/etc they create are indistinguishable from
-- real business data everywhere (Operations dashboard, Call History,
-- Analytics). is_test lets us keep test artifacts scoped to the Test
-- Center and wipeable on demand, without touching real data.
ALTER TABLE calls ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_calls_tenant_is_test ON calls(tenant_id, is_test);
