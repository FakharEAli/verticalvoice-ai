import { z } from 'zod';
import { logger } from '@/lib/observability/logger';
import { createClient } from '@/lib/database/supabase-server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutboundRequest {
  tenantId: string;
  phone: string;
  purpose: string;
  context: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface OutboundResult {
  success: boolean;
  callId?: string;
  blockedReason?: string;
  checks: ComplianceCheck[];
}

export interface ComplianceCheck {
  name: string;
  passed: boolean;
  reason: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const QUIET_HOURS_START = 21; // 9 PM
const QUIET_HOURS_END = 8;   // 8 AM
const MAX_CALLS_PER_DAY = 3;
const MAX_CALLS_PER_WEEK = 10;

const AI_DISCLOSURE_STATEMENT =
  'This call is being made by an AI assistant on behalf of the business. ' +
  'You are speaking with an artificial intelligence system, not a human. ' +
  'If you would like to speak with a human representative, please let me know at any time.';

// ─── Validation ─────────────────────────────────────────────────────────────

const outboundRequestSchema = z.object({
  tenantId: z.string().uuid(),
  phone: z.string().min(7, 'Phone number too short').max(20, 'Phone number too long'),
  purpose: z.string().min(1, 'Purpose is required').max(500),
  context: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return '***' + phone.slice(-4);
}

// ─── Compliance Checks ──────────────────────────────────────────────────────

/**
 * Check if we have active consent to call this number.
 */
async function checkConsent(tenantId: string, phone: string): Promise<ComplianceCheck> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('consent_records')
    .select('id, status, granted_at, revoked_at')
    .eq('tenant_id', tenantId)
    .eq('phone_number', phone)
    .eq('consent_type', 'outbound_call')
    .eq('status', 'granted')
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn('outbound: consent check query failed', { tenantId, error: error.message });
    return {
      name: 'consent',
      passed: false,
      reason: `Consent check failed: ${error.message}`,
    };
  }

  if (!data) {
    return {
      name: 'consent',
      passed: false,
      reason: 'No active consent record found for this phone number',
    };
  }

  return {
    name: 'consent',
    passed: true,
    reason: `Active consent granted at ${data.granted_at}`,
  };
}

/**
 * Check if the number is on the tenant's suppression list.
 */
async function checkSuppression(tenantId: string, phone: string): Promise<ComplianceCheck> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('suppression_entries')
    .select('id, reason, expires_at')
    .eq('tenant_id', tenantId)
    .eq('phone_number', phone)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn('outbound: suppression check query failed', { tenantId, error: error.message });
    return {
      name: 'suppression',
      passed: false,
      reason: `Suppression check failed: ${error.message}`,
    };
  }

  if (data) {
    // Check if suppression has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return {
        name: 'suppression',
        passed: true,
        reason: 'Suppression entry has expired',
      };
    }
    return {
      name: 'suppression',
      passed: false,
      reason: `Number is suppressed: ${data.reason}`,
    };
  }

  return {
    name: 'suppression',
    passed: true,
    reason: 'Number not on suppression list',
  };
}

/**
 * Check if the number is on the Do Not Call registry.
 * Uses cached DNC check results; if no recent check exists, defaults to pass
 * with a flag (production should wire to an external DNC API).
 */
async function checkDNC(tenantId: string, phone: string): Promise<ComplianceCheck> {
  const supabase = await createClient();

  // Look for a recent DNC check (valid within the last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('dnc_checks')
    .select('id, is_listed, checked_at, valid_until')
    .eq('tenant_id', tenantId)
    .eq('phone_number', phone)
    .gte('checked_at', thirtyDaysAgo.toISOString())
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn('outbound: DNC check query failed', { error: error.message });
    return {
      name: 'dnc',
      passed: false,
      reason: `DNC check failed: ${error.message}`,
    };
  }

  if (!data) {
    // No recent DNC check exists -- pass with warning (production should query external API)
    logger.info('outbound: no recent DNC check found, defaulting to pass', {
      phone: maskPhone(phone),
    });
    return {
      name: 'dnc',
      passed: true,
      reason: 'No recent DNC check on file (external DNC API not yet integrated)',
    };
  }

  if (data.is_listed) {
    return {
      name: 'dnc',
      passed: false,
      reason: `Number is listed on Do Not Call registry (checked ${data.checked_at})`,
    };
  }

  return {
    name: 'dnc',
    passed: true,
    reason: `Number not on DNC registry (last checked ${data.checked_at})`,
  };
}

/**
 * Check quiet hours: no calls before 8 AM or after 9 PM.
 * In production, resolve callee timezone from area code or prior records.
 */
async function checkQuietHours(_tenantId: string, _phone: string): Promise<ComplianceCheck> {
  // TODO: resolve callee timezone from area code or stored preference
  const currentHour = new Date().getUTCHours();

  if (currentHour >= QUIET_HOURS_START || currentHour < QUIET_HOURS_END) {
    return {
      name: 'quiet_hours',
      passed: false,
      reason: `Current hour (${currentHour} UTC) is outside allowed calling hours (${QUIET_HOURS_END}:00 - ${QUIET_HOURS_START}:00)`,
    };
  }

  return {
    name: 'quiet_hours',
    passed: true,
    reason: `Current hour (${currentHour} UTC) is within allowed calling hours`,
  };
}

/**
 * Check frequency cap: max 3 calls/day, 10 calls/week to the same number.
 * Counts from outbound_attempts table.
 */
async function checkFrequencyCap(tenantId: string, phone: string): Promise<ComplianceCheck> {
  const supabase = await createClient();
  const now = new Date();

  // Count calls in the last 24 hours
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { count: dailyCount, error: dailyError } = await supabase
    .from('outbound_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('phone_number', phone)
    .gte('attempted_at', oneDayAgo.toISOString());

  if (dailyError) {
    logger.warn('outbound: frequency daily count failed', { error: dailyError.message });
    return {
      name: 'frequency_cap',
      passed: false,
      reason: `Frequency check failed: ${dailyError.message}`,
    };
  }

  if ((dailyCount ?? 0) >= MAX_CALLS_PER_DAY) {
    return {
      name: 'frequency_cap',
      passed: false,
      reason: `Daily call limit reached (${dailyCount}/${MAX_CALLS_PER_DAY} calls in the last 24 hours)`,
    };
  }

  // Count calls in the last 7 days
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { count: weeklyCount, error: weeklyError } = await supabase
    .from('outbound_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('phone_number', phone)
    .gte('attempted_at', oneWeekAgo.toISOString());

  if (weeklyError) {
    logger.warn('outbound: frequency weekly count failed', { error: weeklyError.message });
    return {
      name: 'frequency_cap',
      passed: false,
      reason: `Frequency check failed: ${weeklyError.message}`,
    };
  }

  if ((weeklyCount ?? 0) >= MAX_CALLS_PER_WEEK) {
    return {
      name: 'frequency_cap',
      passed: false,
      reason: `Weekly call limit reached (${weeklyCount}/${MAX_CALLS_PER_WEEK} calls in the last 7 days)`,
    };
  }

  return {
    name: 'frequency_cap',
    passed: true,
    reason: `Within frequency limits (daily: ${dailyCount ?? 0}/${MAX_CALLS_PER_DAY}, weekly: ${weeklyCount ?? 0}/${MAX_CALLS_PER_WEEK})`,
  };
}

/**
 * Apply AI disclosure requirement. Always passes but returns the disclosure statement.
 */
function applyAIDisclosure(): ComplianceCheck {
  return {
    name: 'ai_disclosure',
    passed: true,
    reason: AI_DISCLOSURE_STATEMENT,
  };
}

// ─── Main Worker ────────────────────────────────────────────────────────────

/**
 * Initiate an outbound call with full compliance checks.
 * Every check must pass or the call is blocked with a logged reason.
 */
export async function initiateOutbound(
  tenantId: string,
  phone: string,
  purpose: string,
  context: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<OutboundResult> {
  // Validate input
  const validated = outboundRequestSchema.parse({
    tenantId,
    phone,
    purpose,
    context,
    idempotencyKey,
  });

  logger.info('outbound: initiating call', {
    tenantId: validated.tenantId,
    phone: maskPhone(validated.phone),
    purpose: validated.purpose,
  });

  const checks: ComplianceCheck[] = [];

  try {
    const supabase = await createClient();

    // Check tenant allows outbound calls
    const { data: policySettings } = await supabase
      .from('policy_settings')
      .select('allow_outbound')
      .eq('tenant_id', validated.tenantId)
      .maybeSingle();

    if (policySettings && !policySettings.allow_outbound) {
      const reason = 'Outbound calls are disabled for this tenant';
      logger.warn('outbound: tenant outbound disabled', { tenantId: validated.tenantId });
      checks.push({ name: 'tenant_policy', passed: false, reason });
      return { success: false, blockedReason: reason, checks };
    }
    checks.push({ name: 'tenant_policy', passed: true, reason: 'Tenant allows outbound calls' });

    // Idempotency check
    if (validated.idempotencyKey) {
      const { data: existingAttempt } = await supabase
        .from('outbound_attempts')
        .select('id, call_id, status')
        .eq('tenant_id', validated.tenantId)
        .eq('phone_number', validated.phone)
        .limit(1)
        .maybeSingle();

      if (existingAttempt?.call_id) {
        logger.info('outbound: idempotent duplicate detected', {
          callId: existingAttempt.call_id,
        });
        return {
          success: true,
          callId: existingAttempt.call_id,
          checks: [{ name: 'idempotency', passed: true, reason: 'Returning existing call' }],
        };
      }
    }

    // Run all compliance checks
    const consentCheck = await checkConsent(validated.tenantId, validated.phone);
    checks.push(consentCheck);

    const suppressionCheck = await checkSuppression(validated.tenantId, validated.phone);
    checks.push(suppressionCheck);

    const dncCheck = await checkDNC(validated.tenantId, validated.phone);
    checks.push(dncCheck);

    const quietHoursCheck = await checkQuietHours(validated.tenantId, validated.phone);
    checks.push(quietHoursCheck);

    const frequencyCheck = await checkFrequencyCap(validated.tenantId, validated.phone);
    checks.push(frequencyCheck);

    const disclosureCheck = applyAIDisclosure();
    checks.push(disclosureCheck);

    // Check if any compliance check failed
    const failedChecks = checks.filter((c) => !c.passed);
    if (failedChecks.length > 0) {
      const reasons = failedChecks.map((c) => `${c.name}: ${c.reason}`).join('; ');

      logger.warn('outbound: call blocked', {
        tenantId: validated.tenantId,
        phone: maskPhone(validated.phone),
        failedChecks: failedChecks.map((c) => c.name),
      });

      // Log blocked attempt to audit_events
      await supabase
        .from('audit_events')
        .insert({
          tenant_id: validated.tenantId,
          action: 'outbound_call_blocked',
          resource_type: 'outbound_attempt',
          metadata: {
            phone: maskPhone(validated.phone),
            purpose: validated.purpose,
            failedChecks: failedChecks.map((c) => ({ name: c.name, reason: c.reason })),
          },
        })
        .then(({ error }) => {
          if (error) {
            logger.warn('outbound: failed to log blocked audit event', { error: error.message });
          }
        });

      return {
        success: false,
        blockedReason: reasons,
        checks,
      };
    }

    // All checks passed — create the call record
    const { data: newCall, error: callError } = await supabase
      .from('calls')
      .insert({
        tenant_id: validated.tenantId,
        direction: 'outbound',
        status: 'initiating',
        called_number: validated.phone,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (callError || !newCall) {
      throw new Error(`Failed to create call record: ${callError?.message ?? 'no data returned'}`);
    }

    // Record the outbound attempt
    await supabase
      .from('outbound_attempts')
      .insert({
        tenant_id: validated.tenantId,
        phone_number: validated.phone,
        call_id: newCall.id,
        status: 'initiated',
        attempted_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          logger.warn('outbound: failed to record outbound attempt', { error: error.message });
        }
      });

    logger.info('outbound: call created', {
      tenantId: validated.tenantId,
      callId: newCall.id,
      phone: maskPhone(validated.phone),
      purpose: validated.purpose,
    });

    return {
      success: true,
      callId: newCall.id,
      checks,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('outbound: call initiation failed', {
      tenantId: validated.tenantId,
      phone: maskPhone(validated.phone),
      error: message,
    });

    return {
      success: false,
      blockedReason: `Internal error: ${message}`,
      checks,
    };
  }
}
