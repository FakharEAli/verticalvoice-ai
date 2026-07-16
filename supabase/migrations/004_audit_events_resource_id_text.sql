-- resource_id was UUID, but callers legitimately store external provider
-- IDs there too (Twilio CallSids like "CAxxxx...", Ultravox call IDs,
-- etc.) which are never valid UUIDs — every such insert failed with
-- "invalid input syntax for type uuid". Widen to TEXT; UUIDs remain
-- valid TEXT values so no existing data is affected.
ALTER TABLE audit_events ALTER COLUMN resource_id TYPE TEXT;
