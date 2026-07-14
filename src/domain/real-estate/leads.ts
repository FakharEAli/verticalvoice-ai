import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database, Json } from "@/lib/database/types";

type LeadRow = Database["public"]["Tables"]["real_estate_leads"]["Row"];
type QualificationRow = Database["public"]["Tables"]["lead_qualifications"]["Row"];
type AssignmentRow = Database["public"]["Tables"]["lead_assignments"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  lead_type: string; // "buyer" | "seller" | "tenant" | "landlord"
  source?: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  preferred_locations?: Json;
  property_preferences?: Json;
  timeline?: string;
  notes?: string;
  call_id?: string;
}

export interface QualificationInput {
  question: string;
  answer?: string;
  score?: number;
}

// ─── Protected Class Fields (Fair Housing) ───────────────────────────────────

const PROTECTED_CLASS_FIELDS = [
  "race",
  "color",
  "religion",
  "national_origin",
  "sex",
  "familial_status",
  "disability",
  "gender",
  "sexual_orientation",
  "marital_status",
  "age",
  "ethnicity",
];

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Create and classify a new real estate lead.
 */
export async function createLead(
  tenantId: string,
  lead: CreateLeadInput
): Promise<LeadRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("real_estate_leads")
    .insert({
      tenant_id: tenantId,
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone,
      email: lead.email ?? null,
      lead_type: lead.lead_type,
      source: lead.source ?? null,
      status: "new",
      budget_min_cents: lead.budget_min_cents ?? null,
      budget_max_cents: lead.budget_max_cents ?? null,
      preferred_locations: lead.preferred_locations ?? null,
      property_preferences: lead.property_preferences ?? null,
      timeline: lead.timeline ?? null,
      notes: lead.notes ?? null,
      call_id: lead.call_id ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create lead", { tenantId, error: error.message });
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  logger.info("Lead created", { tenantId, leadId: data.id, type: lead.lead_type });
  return data as LeadRow;
}

/**
 * Add qualification data to an existing lead.
 */
export async function qualifyLead(
  tenantId: string,
  leadId: string,
  qualification: QualificationInput
): Promise<QualificationRow> {
  const supabase = await createServerClient();

  // Verify lead exists
  const { data: lead, error: leadErr } = await supabase
    .from("real_estate_leads")
    .select("id")
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .single();

  if (leadErr || !lead) {
    throw new Error("Lead not found");
  }

  const { data, error } = await supabase
    .from("lead_qualifications")
    .insert({
      lead_id: leadId,
      tenant_id: tenantId,
      question: qualification.question,
      answer: qualification.answer ?? null,
      score: qualification.score ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to add qualification", { tenantId, leadId, error: error.message });
    throw new Error(`Failed to add qualification: ${error.message}`);
  }

  // Update lead status to qualified if it was new
  await supabase
    .from("real_estate_leads")
    .update({ status: "qualified", updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .eq("status", "new");

  logger.info("Lead qualified", { tenantId, leadId, qualificationId: data.id });
  return data as QualificationRow;
}

/**
 * Assign a lead to an agent.
 */
export async function assignLead(
  tenantId: string,
  leadId: string,
  agentId: string
): Promise<AssignmentRow> {
  const supabase = await createServerClient();

  // Verify agent exists and is active
  const { data: agent, error: agentErr } = await supabase
    .from("re_agents")
    .select("id")
    .eq("id", agentId)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .single();

  if (agentErr || !agent) {
    throw new Error("Agent not found or inactive");
  }

  // Create assignment
  const { data, error } = await supabase
    .from("lead_assignments")
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      agent_id: agentId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to assign lead", { tenantId, leadId, agentId, error: error.message });
    throw new Error(`Failed to assign lead: ${error.message}`);
  }

  // Update lead with agent assignment
  await supabase
    .from("real_estate_leads")
    .update({ agent_id: agentId, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("tenant_id", tenantId);

  logger.info("Lead assigned", { tenantId, leadId, agentId });
  return data as AssignmentRow;
}

/**
 * Get the lead pipeline overview grouped by status.
 */
export async function getLeadPipeline(
  tenantId: string
): Promise<{ status: string; count: number; leads: LeadRow[] }[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("real_estate_leads")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to get lead pipeline", { tenantId, error: error.message });
    throw new Error(`Failed to get lead pipeline: ${error.message}`);
  }

  const leads = (data ?? []) as LeadRow[];
  const grouped = new Map<string, LeadRow[]>();

  for (const lead of leads) {
    const list = grouped.get(lead.status) ?? [];
    list.push(lead);
    grouped.set(lead.status, list);
  }

  const pipeline: { status: string; count: number; leads: LeadRow[] }[] = [];
  const statusOrder = ["new", "qualified", "contacted", "showing", "offer", "closed", "lost"];

  for (const status of statusOrder) {
    const statusLeads = grouped.get(status) ?? [];
    if (statusLeads.length > 0) {
      pipeline.push({ status, count: statusLeads.length, leads: statusLeads });
    }
    grouped.delete(status);
  }

  // Any remaining statuses not in the predefined order
  for (const [status, statusLeads] of grouped) {
    pipeline.push({ status, count: statusLeads.length, leads: statusLeads });
  }

  return pipeline;
}

/**
 * Calculate a lead score based on qualification data.
 * Ensures no protected class data is used in scoring (Fair Housing compliance).
 */
export async function scoreLead(
  tenantId: string,
  leadId: string
): Promise<{ lead_id: string; score: number; factors: string[] }> {
  const supabase = await createServerClient();

  const { data: lead, error: leadErr } = await supabase
    .from("real_estate_leads")
    .select("*")
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .single();

  if (leadErr || !lead) {
    throw new Error("Lead not found");
  }

  const { data: qualifications, error: qualErr } = await supabase
    .from("lead_qualifications")
    .select("*")
    .eq("lead_id", leadId)
    .eq("tenant_id", tenantId);

  if (qualErr) {
    logger.error("Failed to fetch qualifications for scoring", { tenantId, leadId, error: qualErr.message });
    throw new Error(`Failed to fetch qualifications: ${qualErr.message}`);
  }

  let score = 0;
  const factors: string[] = [];

  // Score based on completeness of information
  if (lead.email) { score += 10; factors.push("email_provided"); }
  if (lead.budget_min_cents || lead.budget_max_cents) { score += 15; factors.push("budget_specified"); }
  if (lead.timeline) { score += 15; factors.push("timeline_specified"); }
  if (lead.preferred_locations) { score += 10; factors.push("location_preferences"); }
  if (lead.property_preferences) { score += 10; factors.push("property_preferences"); }

  // Score based on qualification responses (skip any protected-class questions)
  for (const q of qualifications ?? []) {
    const questionLower = q.question.toLowerCase();
    const isProtected = PROTECTED_CLASS_FIELDS.some((field) => questionLower.includes(field));

    if (isProtected) {
      logger.warn("Protected class question detected in scoring, skipped", {
        tenantId,
        leadId,
        question: q.question,
      });
      continue;
    }

    if (q.answer) {
      score += 5;
      factors.push(`qualification_answered: ${q.question.substring(0, 30)}`);
    }
    if (q.score) {
      score += q.score;
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Persist the score
  await supabase
    .from("real_estate_leads")
    .update({ score, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("tenant_id", tenantId);

  logger.info("Lead scored", { tenantId, leadId, score });

  return { lead_id: leadId, score, factors };
}
