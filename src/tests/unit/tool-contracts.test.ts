import { describe, expect, it } from "vitest";
import { healthcarePack } from "@/industries/healthcare/pack";
import { restaurantPack } from "@/industries/restaurant/pack";
import { realEstatePack } from "@/industries/real-estate/pack";
import { healthcareToolHandlers } from "@/lib/tools/healthcare";
import { restaurantToolHandlers } from "@/lib/tools/restaurant";
import { realEstateToolHandlers } from "@/lib/tools/real-estate";
import { transferCallHandler } from "@/lib/tools/transfer-call";
import { isPositiveToolOutcome } from "@/lib/calls/summarize";
import type { IndustryPack } from "@/industries/core/industry-pack";
import type { ToolHandlerMap } from "@/lib/tools/types";

/**
 * Contract tests between each industry pack's declared ToolBindings and the
 * handlers that actually run mid-call.
 *
 * These exist because of a class of bug found the hard way on the restaurant
 * path: a handler reads a field the pack never declared as a parameter, so the
 * AI has no way to supply it and the handler silently writes a placeholder
 * ("unknown") into a real business table. Healthcare and real-estate had the
 * same bug in five more places.
 */

const PACKS: Array<{ name: string; pack: IndustryPack; handlers: ToolHandlerMap }> = [
  { name: "healthcare", pack: healthcarePack, handlers: healthcareToolHandlers },
  { name: "restaurant", pack: restaurantPack, handlers: restaurantToolHandlers },
  { name: "real_estate", pack: realEstatePack, handlers: realEstateToolHandlers },
];

describe.each(PACKS)("$name pack <-> handler wiring", ({ pack, handlers }) => {
  const withTransfer: ToolHandlerMap = { ...handlers, ...transferCallHandler };

  it("every declared tool has an implemented handler", () => {
    const missing = pack.tools.map((t) => t.id).filter((id) => !withTransfer[id]);
    expect(missing).toEqual([]);
  });

  it("every implemented handler is reachable from a declared tool", () => {
    const declared = new Set(pack.tools.map((t) => t.id));
    const orphans = Object.keys(handlers).filter((id) => !declared.has(id));
    expect(orphans).toEqual([]);
  });

  it("declares no duplicate parameter names on a tool", () => {
    for (const tool of pack.tools) {
      const names = tool.parameters.map((p) => p.name);
      expect(new Set(names).size, `${tool.id} has duplicate parameters`).toBe(names.length);
    }
  });
});

/**
 * Fields each handler reads off `input`. If a handler reads it, the pack must
 * declare it — otherwise the AI can never send it. Keep in sync when a handler
 * starts reading a new field.
 */
const HANDLER_INPUT_READS: Record<string, Record<string, string[]>> = {
  healthcare: {
    check_availability: ["provider_id", "appointment_type", "date_from", "date_to"],
    book_appointment_slot: [
      "patient_name",
      "date_of_birth",
      "slot_id",
      "appointment_type",
      "reason_for_visit",
      "patient_phone",
    ],
    cancel_appointment: ["appointment_id", "reason", "patient_name", "patient_phone"],
    reschedule_appointment: [
      "new_datetime",
      "appointment_id",
      "patient_name",
      "patient_phone",
      "reason",
    ],
    get_patient_info: ["patient_name", "date_of_birth"],
    submit_refill_request: ["patient_name", "medication_name", "pharmacy_name", "patient_phone"],
    verify_insurance: [
      "insurance_carrier",
      "member_id",
      "group_number",
      "patient_name",
      "patient_phone",
    ],
  },
  real_estate: {
    search_listings: [
      "location",
      "property_type",
      "min_price",
      "max_price",
      "min_bedrooms",
      "min_bathrooms",
      "limit",
    ],
    get_listing_details: ["mls_number", "address"],
    check_showing_availability: ["property_address", "preferred_date", "agent_id"],
    book_showing: ["property_address", "buyer_name", "buyer_phone", "datetime", "agent_id"],
    submit_valuation_request: [
      "property_address",
      "owner_name",
      "owner_phone",
      "property_type",
      "purpose",
      "urgency",
    ],
    create_maintenance_ticket: [
      "tenant_name",
      "property_address",
      "unit_number",
      "issue_type",
      "urgency",
      "description",
      "permission_to_enter",
      "reporter_phone",
    ],
    get_agent_info: ["agent_name", "specialty"],
    capture_lead: ["name", "phone", "email", "lead_type", "source", "notes"],
  },
};

describe("handlers only read fields the pack actually declares", () => {
  const packsById: Record<string, IndustryPack> = {
    healthcare: healthcarePack,
    real_estate: realEstatePack,
  };

  for (const [industry, tools] of Object.entries(HANDLER_INPUT_READS)) {
    for (const [toolId, reads] of Object.entries(tools)) {
      it(`${industry}.${toolId} declares every field its handler reads`, () => {
        const binding = packsById[industry].tools.find((t) => t.id === toolId);
        expect(binding, `${toolId} is not declared in the ${industry} pack`).toBeDefined();
        const declared = new Set(binding!.parameters.map((p) => p.name));
        const undeclared = reads.filter((field) => !declared.has(field));
        expect(undeclared).toEqual([]);
      });
    }
  }
});

describe("contact-callback fields are reachable on write tools", () => {
  // Every tool that writes a record a human must follow up on needs a contact
  // field the AI can supply, or the row lands with a literal "unknown".
  const REQUIRE_CONTACT_FIELD: Array<[IndustryPack, string, string]> = [
    [healthcarePack, "book_appointment_slot", "patient_phone"],
    [healthcarePack, "submit_refill_request", "patient_phone"],
    [healthcarePack, "verify_insurance", "patient_name"],
    [realEstatePack, "create_maintenance_ticket", "reporter_phone"],
  ];

  it.each(REQUIRE_CONTACT_FIELD)("%#: declares its contact field", (pack, toolId, field) => {
    const binding = pack.tools.find((t) => t.id === toolId);
    expect(binding?.parameters.some((p) => p.name === field)).toBe(true);
  });
});

describe("isPositiveToolOutcome classifies real handler return shapes", () => {
  const POSITIVE: Array<[string, Record<string, unknown>]> = [
    ["healthcare book_appointment_slot", { booked: true, appointment_id: "a1", scheduled_at: "x" }],
    ["healthcare cancel_appointment", { cancelled: true, appointment_id: "a1" }],
    ["healthcare submit_refill_request", { submitted: true, request_id: "r1", status: "pending" }],
    [
      "healthcare verify_insurance intake",
      { verified: false, status: "pending_manual_review", intake_id: "i1" },
    ],
    ["real_estate book_showing", { showing_id: "s1", confirmed: true, scheduled_at: "x" }],
    ["real_estate capture_lead", { lead_id: "l1", captured: true, lead_type: "buyer" }],
    ["real_estate create_maintenance_ticket", { ticket_id: "t1", created: true, priority: "high" }],
    ["real_estate submit_valuation_request", { submitted: true, request_id: "v1" }],
  ];

  it.each(POSITIVE)("%s reads as a success", (_label, output) => {
    expect(isPositiveToolOutcome(output)).toBe(true);
  });

  const NEGATIVE: Array<[string, Record<string, unknown>]> = [
    ["healthcare book failure", { booked: false, reason: "missing_required_fields" }],
    ["healthcare cancel not found", { cancelled: false, appointment_id: "a1", reason: "not_found" }],
    ["healthcare check_availability (read-only)", { available: true, slots: [{ start: "x" }] }],
    ["healthcare get_patient_info (read-only)", { found: true, upcoming_appointments: [] }],
    ["real_estate search_listings (read-only)", { listings: [{ listing_id: "l1" }] }],
    ["real_estate get_listing_details (read-only)", { found: true, listing: { listing_id: "l1" } }],
    ["real_estate get_agent_info (read-only)", { agents: [{ agent_id: "a1" }] }],
    ["real_estate showing failure", { booked: false, reason: "Listing not found for that address" }],
  ];

  it.each(NEGATIVE)("%s does not read as a success", (_label, output) => {
    expect(isPositiveToolOutcome(output)).toBe(false);
  });
});
