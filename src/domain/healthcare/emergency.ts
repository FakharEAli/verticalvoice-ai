import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type EscalationRow = Database["public"]["Tables"]["healthcare_escalations"]["Row"];

// ─── Emergency Keywords ──────────────────────────────────────────────────────

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "heart attack",
  "stroke",
  "can't breathe",
  "cannot breathe",
  "difficulty breathing",
  "shortness of breath",
  "choking",
  "unconscious",
  "unresponsive",
  "seizure",
  "severe bleeding",
  "heavy bleeding",
  "overdose",
  "poison",
  "suicidal",
  "suicide",
  "self harm",
  "self-harm",
  "anaphylaxis",
  "allergic reaction severe",
  "head injury",
  "not breathing",
  "cardiac arrest",
  "911",
  "dying",
  "gunshot",
  "stabbed",
  "drowning",
  "severe pain",
  "loss of consciousness",
  "passed out",
  "coughing blood",
  "vomiting blood",
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmergencyDetectionResult {
  is_emergency: boolean;
  matched_keywords: string[];
  severity: "none" | "moderate" | "critical";
}

export interface EmergencyEscalationInput {
  patient_name: string;
  patient_phone: string;
  escalation_type: string;
  urgency?: string;
  description: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Check a transcript for emergency-related keywords.
 * Returns matched keywords and severity level.
 */
export function detectEmergency(transcript: string): EmergencyDetectionResult {
  const lower = transcript.toLowerCase();
  const matched: string[] = [];

  for (const keyword of EMERGENCY_KEYWORDS) {
    if (lower.includes(keyword)) {
      matched.push(keyword);
    }
  }

  if (matched.length === 0) {
    return { is_emergency: false, matched_keywords: [], severity: "none" };
  }

  // Critical if life-threatening keywords are matched
  const criticalKeywords = [
    "chest pain",
    "heart attack",
    "stroke",
    "can't breathe",
    "cannot breathe",
    "not breathing",
    "cardiac arrest",
    "unconscious",
    "unresponsive",
    "seizure",
    "overdose",
    "suicidal",
    "suicide",
    "anaphylaxis",
    "gunshot",
    "stabbed",
    "drowning",
    "dying",
  ];

  const hasCritical = matched.some((m) => criticalKeywords.includes(m));

  return {
    is_emergency: true,
    matched_keywords: matched,
    severity: hasCritical ? "critical" : "moderate",
  };
}

/**
 * Create an escalation record and log the emergency for staff alerts.
 */
export async function handleEmergencyEscalation(
  tenantId: string,
  callId: string,
  details: EmergencyEscalationInput
): Promise<EscalationRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("healthcare_escalations")
    .insert({
      tenant_id: tenantId,
      call_id: callId,
      patient_name: details.patient_name,
      patient_phone: details.patient_phone,
      escalation_type: details.escalation_type,
      urgency: details.urgency ?? "critical",
      description: details.description,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create emergency escalation", { tenantId, callId, error: error.message });
    throw new Error(`Failed to create emergency escalation: ${error.message}`);
  }

  logger.warn("Emergency escalation created", {
    tenantId,
    callId,
    escalationId: data.id,
    escalationType: details.escalation_type,
    urgency: details.urgency ?? "critical",
  });

  return data as EscalationRow;
}
