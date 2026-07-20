import "@/industries";

import type { IndustryId } from "@/industries/core/industry-pack";
import { getIndustryPack } from "@/industries/core/registry";

// ─── Customer-Facing Tool Catalog ───────────────────────────────────────────
// The industry packs describe each tool with an *agent-facing* `description`
// that can be long and imperative. During onboarding we instead want to show
// the operator a friendly, plain-English one-liner for every action their AI
// agent can take on a call. This module distills each pack tool into a short
// customer-friendly summary.

export interface ToolCatalogEntry {
  id: string;
  name: string;
  summary: string;
}

/**
 * Curated, customer-friendly one-line summaries keyed by tool id. Kept short
 * (~90 chars max), plain English, and free of internal jargon or raw ids.
 * When a pack ships a tool without an entry here we fall back to a distilled
 * version of the pack's own description (see `deriveSummary`).
 */
const TOOL_SUMMARIES: Record<string, string> = {
  // ── Healthcare ──
  check_availability:
    "Finds open appointment times for a provider, date range and visit type.",
  book_appointment_slot: "Books an available appointment slot for a patient.",
  cancel_appointment: "Cancels an existing appointment.",
  reschedule_appointment:
    "Moves an existing appointment to a new date and time.",
  get_patient_info:
    "Looks up a patient's details and upcoming visits after verifying identity.",
  submit_refill_request:
    "Sends a prescription refill request to the provider for review.",
  verify_insurance: "Checks a patient's insurance coverage and eligibility.",

  // ── Restaurant ──
  check_table_availability:
    "Checks open tables for a given date, time and party size.",
  create_reservation:
    "Books a table and confirms the day, time and party size.",
  modify_reservation:
    "Changes an existing reservation's date, time or party size.",
  cancel_reservation: "Cancels an existing reservation.",
  get_menu: "Shares menu items, with dietary or section filters if asked.",
  check_allergens: "Checks allergen information for a specific dish.",
  submit_order: "Sends a confirmed takeout or delivery order to the kitchen.",
  get_wait_time: "Gives the current estimated wait time for walk-ins or orders.",

  // ── Real estate ──
  search_listings:
    "Searches available listings by location, price, bedrooms and type.",
  get_listing_details:
    "Pulls full details, photos and pricing for a specific property.",
  check_showing_availability: "Finds open time slots to tour a property.",
  book_showing: "Books a property tour with an agent at a set time.",
  submit_valuation_request:
    "Requests a market analysis or home valuation from an agent.",
  create_maintenance_ticket:
    "Logs a tenant's maintenance issue along with its urgency.",
  get_agent_info:
    "Looks up an agent's specialties, availability and contact details.",
  capture_lead: "Saves a new lead's contact info and interest to the CRM.",

  // ── Shared across every pack ──
  transfer_call: "Hands the call to a human when needed.",
};

const MAX_SUMMARY_LENGTH = 90;

/** Title-case a snake_case / kebab-case tool id, e.g. `book_showing` → `Book Showing`. */
function titleCaseId(id: string): string {
  return id
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Distill an agent-facing description to one short customer-facing sentence.
 * Used only as a fallback when a tool has no curated summary above.
 */
function deriveSummary(description: string): string {
  // Take the first sentence.
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  let summary = firstSentence || description.trim();
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd() + "…";
  }
  return summary;
}

/**
 * Returns the customer-facing catalog of actions the AI agent can take on a
 * call for the given industry, in the order the pack ships them.
 */
export function getIndustryToolCatalog(industry: IndustryId): ToolCatalogEntry[] {
  const pack = getIndustryPack(industry);

  return pack.tools.map((tool) => ({
    id: tool.id,
    name: tool.name?.trim() || titleCaseId(tool.id),
    summary: TOOL_SUMMARIES[tool.id] ?? deriveSummary(tool.description),
  }));
}
