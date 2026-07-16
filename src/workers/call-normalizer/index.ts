import { z } from 'zod';
import { logger } from '@/lib/observability/logger';
import { createAdminClient } from '@/lib/database/supabase-admin';
import type { Database } from '@/lib/database/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CallOutcome {
  primaryIntent: string;
  resolved: boolean;
  transferredToHuman: boolean;
  escalated: boolean;
  slots_captured: Record<string, string | number | boolean>;
  follow_up_required: boolean;
}

export interface CallCost {
  duration_seconds: number;
  voice_cost_cents: number;
  telephony_cost_cents: number;
  llm_cost_cents: number;
  total_cost_cents: number;
}

export interface CallNormalizationResult {
  callId: string;
  summary: string;
  outcome: CallOutcome;
  cost: CallCost;
  normalizedAt: string;
}

// ─── Cost Rates (cents per minute) ────────────────────────────────────────────

const RATE_VOICE_CENTS_PER_MIN = 1.5;
const RATE_TELEPHONY_CENTS_PER_MIN = 0.8;
const RATE_LLM_CENTS_PER_MIN = 2.0;

// ─── Validation ───────────────────────────────────────────────────────────────

const callIdSchema = z.string().uuid('callId must be a valid UUID');

// ─── Intent Extraction (regex-based) ──────────────────────────────────────────

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: string }> = [
  { pattern: /\b(?:schedule|book|make)\s+(?:an?\s+)?(?:appointment|booking|reservation)\b/i, intent: 'schedule_appointment' },
  { pattern: /\b(?:cancel|reschedule)\s+(?:my\s+)?(?:appointment|booking|reservation)\b/i, intent: 'cancel_or_reschedule' },
  { pattern: /\b(?:refund|return|exchange)\b/i, intent: 'refund_request' },
  { pattern: /\b(?:speak|talk|transfer)\s+(?:to|with)\s+(?:a\s+)?(?:human|agent|person|manager|representative)\b/i, intent: 'transfer_to_human' },
  { pattern: /\b(?:i['']?d like to|i need|i want to|can i|could i|may i)\b/i, intent: 'general_request' },
  { pattern: /\b(?:hours|open|close|location|address|directions)\b/i, intent: 'business_info' },
  { pattern: /\b(?:price|cost|how much|quote|estimate)\b/i, intent: 'pricing_inquiry' },
  { pattern: /\b(?:complaint|problem|issue|broken|not working)\b/i, intent: 'complaint' },
  { pattern: /\b(?:thank you|thanks|goodbye|bye|that['']?s all)\b/i, intent: 'closing' },
];

function extractPrimaryIntent(transcript: string): string {
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(transcript)) {
      return intent;
    }
  }
  return 'unknown';
}

// ─── Outcome Extraction (regex-based) ─────────────────────────────────────────

const CONFIRMATION_PATTERNS = [
  /\b(?:confirmed|booked|scheduled|done|completed|all set|taken care of)\b/i,
  /\b(?:your (?:appointment|booking|reservation) (?:is|has been))\b/i,
  /\b(?:i['']?ve (?:scheduled|booked|set up|arranged))\b/i,
];

const TRANSFER_PATTERNS = [
  /\b(?:transfer(?:ring|red)?|connect(?:ing|ed)?)\s+(?:you\s+)?(?:to|with)\s+(?:a\s+)?(?:human|agent|person|representative|manager)\b/i,
  /\b(?:let me (?:get|connect|transfer) you)\b/i,
];

const ESCALATION_PATTERNS = [
  /\b(?:escalat(?:e|ed|ing)|supervisor|manager|complaint)\b/i,
  /\b(?:i['']?d like to (?:file|make) a complaint)\b/i,
];

const FOLLOW_UP_PATTERNS = [
  /\b(?:follow.?up|call(?:ing)? (?:you )?back|we['']?ll (?:get back|contact|reach out))\b/i,
  /\b(?:someone will (?:call|contact|reach out))\b/i,
];

function extractOutcome(transcript: string, callStatus: string): Omit<CallOutcome, 'primaryIntent' | 'slots_captured'> {
  const resolved = callStatus === 'completed' && CONFIRMATION_PATTERNS.some(p => p.test(transcript));
  const transferredToHuman = TRANSFER_PATTERNS.some(p => p.test(transcript));
  const escalated = ESCALATION_PATTERNS.some(p => p.test(transcript));
  const follow_up_required = FOLLOW_UP_PATTERNS.some(p => p.test(transcript));

  return { resolved, transferredToHuman, escalated, follow_up_required };
}

// ─── Slot Extraction (regex-based) ────────────────────────────────────────────

const SLOT_PATTERNS: Array<{ key: string; pattern: RegExp; extract: (m: RegExpMatchArray) => string }> = [
  {
    key: 'date',
    pattern: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
    extract: (m) => m[1],
  },
  {
    key: 'time',
    pattern: /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i,
    extract: (m) => m[1],
  },
  {
    key: 'phone',
    pattern: /\b(\+?1?\s*[-.(]?\d{3}[-.)]\s*\d{3}[-.\s]?\d{4})\b/,
    extract: (m) => m[1],
  },
  {
    key: 'email',
    pattern: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
    extract: (m) => m[1],
  },
  {
    key: 'name',
    pattern: /\b(?:my name is|this is|i['']?m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
    extract: (m) => m[1],
  },
];

function extractSlotsFromTranscript(transcript: string): Record<string, string> {
  const slots: Record<string, string> = {};
  for (const { key, pattern, extract } of SLOT_PATTERNS) {
    const match = transcript.match(pattern);
    if (match) {
      slots[key] = extract(match);
    }
  }
  return slots;
}

// ─── Cost Calculation ─────────────────────────────────────────────────────────

function calculateCost(durationSeconds: number): CallCost {
  const minutes = durationSeconds / 60;
  const voice_cost_cents = Math.round(minutes * RATE_VOICE_CENTS_PER_MIN * 100) / 100;
  const telephony_cost_cents = Math.round(minutes * RATE_TELEPHONY_CENTS_PER_MIN * 100) / 100;
  const llm_cost_cents = Math.round(minutes * RATE_LLM_CENTS_PER_MIN * 100) / 100;
  const total_cost_cents = Math.round((voice_cost_cents + telephony_cost_cents + llm_cost_cents) * 100) / 100;

  return {
    duration_seconds: durationSeconds,
    voice_cost_cents,
    telephony_cost_cents,
    llm_cost_cents,
    total_cost_cents,
  };
}

// ─── Summary Generation ──────────────────────────────────────────────────────

function generateSummary(
  intent: string,
  outcome: Omit<CallOutcome, 'primaryIntent' | 'slots_captured'>,
  slots: Record<string, string>,
  durationSeconds: number,
): string {
  const parts: string[] = [];

  const intentLabel = intent.replace(/_/g, ' ');
  parts.push(`Call regarding ${intentLabel}.`);

  if (outcome.resolved) {
    parts.push('Issue was resolved successfully.');
  } else if (outcome.transferredToHuman) {
    parts.push('Caller was transferred to a human agent.');
  } else if (outcome.escalated) {
    parts.push('Call was escalated.');
  } else {
    parts.push('Issue was not fully resolved.');
  }

  const slotKeys = Object.keys(slots);
  if (slotKeys.length > 0) {
    parts.push(`Captured fields: ${slotKeys.join(', ')}.`);
  }

  if (outcome.follow_up_required) {
    parts.push('Follow-up is required.');
  }

  const minutes = Math.round(durationSeconds / 60);
  parts.push(`Duration: ${minutes} minute${minutes !== 1 ? 's' : ''}.`);

  return parts.join(' ');
}

// ─── Main Worker ──────────────────────────────────────────────────────────────

export async function processCallEnd(callId: string): Promise<CallNormalizationResult> {
  const validated = callIdSchema.parse(callId);
  logger.info('call-normalizer: starting normalization', { callId: validated });

  const supabase = createAdminClient();

  try {
    // 1. Fetch call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', validated)
      .single();

    if (callError || !call) {
      throw new Error(`Call not found: ${validated} — ${callError?.message ?? 'no data'}`);
    }

    // 2. Fetch transcript (if available)
    const { data: transcriptRecord } = await supabase
      .from('call_transcripts')
      .select('content')
      .eq('call_id', validated)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const transcript = transcriptRecord?.content ?? '';

    // 3. Extract structured data via regex
    const primaryIntent = extractPrimaryIntent(transcript);
    const outcomeFields = extractOutcome(transcript, call.status);
    const slots_captured = extractSlotsFromTranscript(transcript);

    const outcome: CallOutcome = {
      primaryIntent,
      ...outcomeFields,
      slots_captured,
    };

    // 4. Calculate cost
    const durationSeconds = call.duration_seconds ?? 0;
    const cost = calculateCost(durationSeconds);

    // 5. Generate summary
    const summary = generateSummary(primaryIntent, outcomeFields, slots_captured, durationSeconds);

    // 6. Persist: upsert call_summaries
    const { error: summaryError } = await supabase
      .from('call_summaries')
      .upsert(
        {
          call_id: validated,
          tenant_id: call.tenant_id,
          summary,
          key_points: outcome as unknown as Database['public']['Tables']['call_summaries']['Insert']['key_points'],
          action_items: cost as unknown as Database['public']['Tables']['call_summaries']['Insert']['action_items'],
          sentiment: outcome.resolved ? 'positive' : outcome.escalated ? 'negative' : 'neutral',
          model: 'regex-heuristic-v1',
        },
        { onConflict: 'call_id' },
      );

    if (summaryError) {
      logger.warn('call-normalizer: failed to upsert call_summaries', { callId: validated, error: summaryError.message });
    }

    // 7. Persist: upsert cost record
    const { error: costError } = await supabase
      .from('call_costs')
      .upsert(
        {
          call_id: validated,
          tenant_id: call.tenant_id,
          telephony_cost: cost.telephony_cost_cents / 100,
          stt_cost: 0,
          tts_cost: cost.voice_cost_cents / 100,
          llm_cost: cost.llm_cost_cents / 100,
          total_cost: cost.total_cost_cents / 100,
          currency: 'USD',
        },
        { onConflict: 'call_id' },
      );

    if (costError) {
      logger.warn('call-normalizer: failed to upsert call_costs', { callId: validated, error: costError.message });
    }

    const normalizedAt = new Date().toISOString();

    logger.info('call-normalizer: normalization complete', {
      callId: validated,
      intent: primaryIntent,
      resolved: outcome.resolved,
      totalCostCents: cost.total_cost_cents,
    });

    return { callId: validated, summary, outcome, cost, normalizedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('call-normalizer: normalization failed', { callId: validated, error: message });
    throw error;
  }
}
