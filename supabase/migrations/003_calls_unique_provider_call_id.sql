-- provider_call_id had an index but no unique constraint, so
-- .upsert(..., { onConflict: 'provider_call_id' }) in the Twilio webhook
-- routes silently failed (Postgres requires a matching unique constraint
-- for ON CONFLICT) — every inbound/outbound call upsert was a no-op.
-- NULLs remain unconstrained under a plain UNIQUE constraint, which is
-- correct here (rows created before a provider_call_id is known).
ALTER TABLE calls ADD CONSTRAINT calls_provider_call_id_unique UNIQUE (provider_call_id);
