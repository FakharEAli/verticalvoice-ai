-- The post-call data pipeline polls Ultravox (the authoritative source for
-- a call's end time, duration, transcript, recording, and summary) after a
-- call finishes. To poll it we must remember which Ultravox call each of our
-- `calls` rows corresponds to — Twilio's provider_call_id isn't enough.
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ultravox_call_id TEXT;
CREATE INDEX IF NOT EXISTS idx_calls_ultravox_call_id ON calls(ultravox_call_id);
