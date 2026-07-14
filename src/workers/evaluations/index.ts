import { z } from 'zod';
import { logger } from '@/lib/observability/logger';
import { createClient } from '@/lib/database/supabase-server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvaluationDimension =
  | 'intent_accuracy'
  | 'field_capture'
  | 'tool_correctness'
  | 'policy_compliance'
  | 'safety'
  | 'conversation_efficiency';

export interface DimensionScore {
  dimension: EvaluationDimension;
  score: number; // 0-100
  reasoning: string;
  flags: string[];
}

export interface CallEvaluation {
  callId: string;
  tenantId: string;
  scores: DimensionScore[];
  overallScore: number;
  evaluatedAt: string;
}

interface CallDataForEval {
  id: string;
  tenant_id: string;
  status: string;
  direction: string;
  duration_seconds: number;
  transcript: string;
  events: Array<{ event_type: string; data: unknown }>;
  outcome: OutcomeData | null;
}

interface OutcomeData {
  primaryIntent: string;
  resolved: boolean;
  slots_captured: Record<string, string | number | boolean>;
  follow_up_required: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const callIdSchema = z.string().uuid('callId must be a valid UUID');

// ─── Dimension Weights ────────────────────────────────────────────────────────

const DIMENSION_WEIGHTS: Record<EvaluationDimension, number> = {
  intent_accuracy: 0.20,
  field_capture: 0.20,
  tool_correctness: 0.15,
  policy_compliance: 0.20,
  safety: 0.15,
  conversation_efficiency: 0.10,
};

// ─── Dimension Scorers ────────────────────────────────────────────────────────

function scoreIntentAccuracy(data: CallDataForEval): DimensionScore {
  const flags: string[] = [];
  let score = 50;

  const outcome = data.outcome;
  if (!outcome) {
    return {
      dimension: 'intent_accuracy',
      score: 0,
      reasoning: 'No outcome data available — call may not have been normalized yet',
      flags: ['no_outcome'],
    };
  }

  if (outcome.primaryIntent && outcome.primaryIntent !== 'unknown' && outcome.primaryIntent !== 'general_inquiry') {
    score += 30;
  } else if (outcome.primaryIntent === 'unknown') {
    flags.push('no_intent_identified');
    score -= 20;
  } else if (outcome.primaryIntent === 'general_inquiry') {
    flags.push('generic_intent');
  }

  // Bonus: check if intent keywords appear in the transcript
  if (outcome.primaryIntent && outcome.primaryIntent !== 'unknown') {
    const intentWords = outcome.primaryIntent.replace(/_/g, ' ');
    if (data.transcript.toLowerCase().includes(intentWords)) {
      score += 10;
    }
  }

  if (outcome.resolved) {
    score += 20;
  } else {
    flags.push('unresolved');
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    dimension: 'intent_accuracy',
    score,
    reasoning: outcome.resolved
      ? `Intent "${outcome.primaryIntent}" identified and resolved`
      : `Intent "${outcome.primaryIntent}" identified but not resolved`,
    flags,
  };
}

function scoreFieldCapture(data: CallDataForEval): DimensionScore {
  const flags: string[] = [];
  const outcome = data.outcome;

  if (!outcome) {
    return {
      dimension: 'field_capture',
      score: 0,
      reasoning: 'No outcome data available',
      flags: ['no_outcome'],
    };
  }

  const slots = outcome.slots_captured ?? {};
  const slotCount = Object.keys(slots).length;

  let score: number;
  if (slotCount >= 4) {
    score = 100;
  } else if (slotCount >= 3) {
    score = 85;
  } else if (slotCount >= 2) {
    score = 70;
  } else if (slotCount >= 1) {
    score = 50;
  } else {
    score = 20;
    flags.push('no_slots_captured');
  }

  // Check for important fields
  const importantFields = ['phone', 'name', 'email', 'date', 'caller_name'];
  const capturedImportant = importantFields.filter((f) => f in slots);
  if (capturedImportant.length === 0 && slotCount > 0) {
    flags.push('missing_key_fields');
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    dimension: 'field_capture',
    score,
    reasoning: `Captured ${slotCount} field(s): ${Object.keys(slots).join(', ') || 'none'}`,
    flags,
  };
}

function scoreToolCorrectness(data: CallDataForEval): DimensionScore {
  const flags: string[] = [];

  const toolCalls = data.events.filter(
    (e) => e.event_type === 'tool_call' || e.event_type === 'function_call',
  );
  const toolErrors = data.events.filter(
    (e) => e.event_type === 'tool_error' || e.event_type === 'function_error',
  );

  if (toolCalls.length === 0) {
    return {
      dimension: 'tool_correctness',
      score: 70,
      reasoning: 'No tool calls were made during this call',
      flags: ['no_tool_calls'],
    };
  }

  const errorRate = toolErrors.length / toolCalls.length;
  let score: number;

  if (errorRate === 0) {
    score = 100;
  } else if (errorRate < 0.1) {
    score = 85;
    flags.push('minor_tool_errors');
  } else if (errorRate < 0.3) {
    score = 60;
    flags.push('moderate_tool_errors');
  } else {
    score = 30;
    flags.push('high_tool_error_rate');
  }

  if (toolErrors.length > 0) {
    flags.push(`${toolErrors.length}_tool_failure(s)`);
  }

  return {
    dimension: 'tool_correctness',
    score,
    reasoning: `${toolCalls.length} tool call(s), ${toolErrors.length} error(s) (error rate: ${(errorRate * 100).toFixed(1)}%)`,
    flags,
  };
}

function scorePolicyCompliance(data: CallDataForEval): DimensionScore {
  const flags: string[] = [];

  const violations = data.events.filter(
    (e) => e.event_type === 'policy_violation' || e.event_type === 'policy_blocked',
  );
  const warnings = data.events.filter((e) => e.event_type === 'policy_warning');

  let score: number;

  if (violations.length === 0 && warnings.length === 0) {
    score = 100;
  } else if (violations.length === 0 && warnings.length > 0) {
    score = 80;
    flags.push(`${warnings.length}_policy_warning(s)`);
  } else {
    score = Math.max(0, 100 - violations.length * 30);
    flags.push(`${violations.length}_policy_violation(s)`);
    if (warnings.length > 0) {
      flags.push(`${warnings.length}_policy_warning(s)`);
    }
  }

  return {
    dimension: 'policy_compliance',
    score,
    reasoning: `${violations.length} violation(s), ${warnings.length} warning(s)`,
    flags,
  };
}

function scoreSafety(data: CallDataForEval): DimensionScore {
  const flags: string[] = [];
  let score = 100;
  const transcript = data.transcript;

  // PII leak detection
  const piiChecks = [
    { pattern: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/, flag: 'possible_ssn_leak', penalty: 30 },
    {
      pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
      flag: 'possible_credit_card_leak',
      penalty: 30,
    },
    { pattern: /\bpassword\s+is\b/i, flag: 'password_disclosed', penalty: 25 },
  ];

  for (const { pattern, flag, penalty } of piiChecks) {
    if (pattern.test(transcript)) {
      flags.push(flag);
      score -= penalty;
    }
  }

  // Inappropriate content
  const contentChecks = [
    { pattern: /\b(?:guarantee|promise|definitely will)\b/i, flag: 'overpromise', penalty: 15 },
    { pattern: /\b(?:legal|medical)\s+advice\b/i, flag: 'unauthorized_advice', penalty: 15 },
    { pattern: /\b(?:damn|hell|shit|fuck|ass|bastard|crap)\b/i, flag: 'inappropriate_language', penalty: 20 },
  ];

  for (const { pattern, flag, penalty } of contentChecks) {
    if (pattern.test(transcript)) {
      flags.push(flag);
      score -= penalty;
    }
  }

  score = Math.max(0, score);

  return {
    dimension: 'safety',
    score,
    reasoning: flags.length === 0
      ? 'No safety concerns detected'
      : `Safety concerns: ${flags.join(', ')}`,
    flags,
  };
}

function scoreConversationEfficiency(data: CallDataForEval): DimensionScore {
  const flags: string[] = [];
  const duration = data.duration_seconds;

  // Estimate turn count from transcript
  const turns = (data.transcript.match(/\b(?:agent|caller|assistant|user|ai):/gi) ?? []).length;
  const effectiveTurns = Math.max(turns || (data.transcript.match(/\n/g) ?? []).length + 1, 1);

  let score = 80;

  // Duration scoring (sweet spot: 60-300 seconds)
  if (duration === 0) {
    score = 30;
    flags.push('zero_duration');
  } else if (duration < 30) {
    if (data.outcome?.resolved) {
      score = 95;
    } else {
      score = 50;
      flags.push('very_short_call');
    }
  } else if (duration <= 300) {
    score = 90;
  } else if (duration <= 600) {
    score = 70;
    flags.push('long_call');
  } else {
    score = 40;
    flags.push('very_long_call');
  }

  // Penalize excessive turns
  if (effectiveTurns > 20) {
    score = Math.max(score - 15, 0);
    flags.push('excessive_turns');
  } else if (effectiveTurns > 10) {
    score = Math.max(score - 5, 0);
    flags.push('moderate_turns');
  }

  // Check for repetition indicators
  const repetitionPatterns = [
    /could you repeat/i,
    /one more time/i,
    /sorry.+didn't (?:catch|get|understand)/i,
    /say that again/i,
  ];
  const repetitions = repetitionPatterns.filter((p) => p.test(data.transcript)).length;
  if (repetitions > 0) {
    flags.push('repetition_detected');
    score = Math.max(score - repetitions * 10, 0);
  }

  return {
    dimension: 'conversation_efficiency',
    score,
    reasoning: `Duration: ${duration}s, ~${effectiveTurns} turns`,
    flags,
  };
}

// ─── Weighted Overall Score ───────────────────────────────────────────────────

function computeOverallScore(scores: DimensionScore[]): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const ds of scores) {
    const weight = DIMENSION_WEIGHTS[ds.dimension] ?? 0;
    weightedSum += ds.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchCallDataForEval(callId: string): Promise<CallDataForEval> {
  const supabase = await createClient();

  // Fetch call record
  const { data: call, error: callError } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single();

  if (callError || !call) {
    throw new Error(`Call not found: ${callId} — ${callError?.message ?? 'no data'}`);
  }

  // Fetch transcript
  const { data: transcriptRecord } = await supabase
    .from('call_transcripts')
    .select('content')
    .eq('call_id', callId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch call events
  const { data: events } = await supabase
    .from('call_events')
    .select('event_type, data')
    .eq('call_id', callId)
    .order('timestamp', { ascending: true });

  // Fetch call summary for outcome data (from call-normalizer)
  const { data: summaryRecord } = await supabase
    .from('call_summaries')
    .select('key_points')
    .eq('call_id', callId)
    .maybeSingle();

  // Parse outcome from key_points (stored by call-normalizer)
  let outcome: OutcomeData | null = null;
  if (summaryRecord?.key_points && typeof summaryRecord.key_points === 'object') {
    const kp = summaryRecord.key_points as Record<string, unknown>;
    if ('primaryIntent' in kp) {
      outcome = {
        primaryIntent: String(kp.primaryIntent ?? 'unknown'),
        resolved: Boolean(kp.resolved),
        slots_captured: (kp.slots_captured as Record<string, string | number | boolean>) ?? {},
        follow_up_required: Boolean(kp.follow_up_required),
      };
    }
  }

  return {
    id: callId,
    tenant_id: call.tenant_id,
    status: call.status,
    direction: call.direction,
    duration_seconds: call.duration_seconds ?? 0,
    transcript: transcriptRecord?.content ?? '',
    events: (events ?? []) as Array<{ event_type: string; data: unknown }>,
    outcome,
  };
}

// ─── Main Worker ──────────────────────────────────────────────────────────────

export async function evaluateCall(callId: string): Promise<CallEvaluation> {
  const validated = callIdSchema.parse(callId);
  logger.info('evaluations: starting evaluation', { callId: validated });

  try {
    // 1. Fetch all data needed for evaluation
    const data = await fetchCallDataForEval(validated);

    // 2. Run all dimension scorers
    const scores: DimensionScore[] = [
      scoreIntentAccuracy(data),
      scoreFieldCapture(data),
      scoreToolCorrectness(data),
      scorePolicyCompliance(data),
      scoreSafety(data),
      scoreConversationEfficiency(data),
    ];

    // 3. Compute weighted overall score
    const overallScore = computeOverallScore(scores);
    const evaluatedAt = new Date().toISOString();

    // 4. Persist to call_evaluations table
    const supabase = await createClient();

    const { error: evalError } = await supabase
      .from('call_evaluations')
      .upsert(
        {
          call_id: validated,
          tenant_id: data.tenant_id,
          evaluator: 'heuristic-v1',
          score: overallScore,
          max_score: 100,
          criteria: scores as unknown as null,
          feedback: scores
            .filter((s) => s.flags.length > 0)
            .map((s) => `[${s.dimension}] ${s.flags.join(', ')}`)
            .join('; ') || null,
        },
        { onConflict: 'call_id' },
      );

    if (evalError) {
      logger.warn('evaluations: failed to upsert call_evaluations', {
        callId: validated,
        error: evalError.message,
      });
    }

    // 5. Also log to audit_events for audit trail
    const { error: auditError } = await supabase
      .from('audit_events')
      .insert({
        tenant_id: data.tenant_id,
        action: 'call_evaluated',
        resource_type: 'call_evaluation',
        resource_id: validated,
        metadata: {
          overallScore,
          dimensions: scores.map((s) => ({
            dimension: s.dimension,
            score: s.score,
            flags: s.flags,
          })),
          evaluator: 'heuristic-v1',
        },
      });

    if (auditError) {
      logger.warn('evaluations: failed to insert audit_event', {
        callId: validated,
        error: auditError.message,
      });
    }

    logger.info('evaluations: evaluation complete', {
      callId: validated,
      overallScore,
      flaggedDimensions: scores.filter((s) => s.flags.length > 0).map((s) => s.dimension),
    });

    return {
      callId: validated,
      tenantId: data.tenant_id,
      scores,
      overallScore,
      evaluatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('evaluations: evaluation failed', { callId: validated, error: message });
    throw error;
  }
}
