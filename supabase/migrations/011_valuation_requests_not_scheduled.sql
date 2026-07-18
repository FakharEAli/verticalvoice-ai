-- ============================================================================
-- Migration 011: A valuation request is a REQUEST, not an appointment.
--
-- `submit_valuation_request` fabricated a calendar commitment: because
-- `scheduled_at` was NOT NULL, the handler invented a slot (now + 3 business
-- days at 10:00) and filed the row with status 'scheduled'. Staff saw a
-- confirmed valuation appointment that no one had agreed to, at a time the
-- property owner had never been told, and which existed nowhere except this
-- row. Either the owner shows up to nothing, or nobody shows up to the owner.
--
-- The honest shape is: the agent captured a request, and a human still has to
-- call back and agree a real time. That means `scheduled_at` must be allowed
-- to be NULL until that call happens, and the lifecycle gains a 'requested'
-- state that precedes 'scheduled'.
--
-- Existing rows are deliberately NOT rewritten. A row already in this table
-- may be a real appointment a human genuinely arranged, or a fabricated
-- placeholder — this migration cannot tell them apart, and silently blanking a
-- real appointment would be a worse failure than leaving a stale one visible.
-- Staff triage those from the Operations panel.
-- ============================================================================

ALTER TABLE valuation_appointments
  ALTER COLUMN scheduled_at DROP NOT NULL;

COMMENT ON COLUMN valuation_appointments.scheduled_at IS
  'When the valuation visit will happen. NULL while status = ''requested'' — the caller asked for a valuation but no time has been agreed with them yet.';

COMMENT ON COLUMN valuation_appointments.status IS
  'requested (captured on a call, no time agreed) | scheduled | completed | cancelled';
