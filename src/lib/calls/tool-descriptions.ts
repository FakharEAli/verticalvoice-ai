import { formatPhoneNumber, humanize } from "./display";

/**
 * Turns a raw call_tool_runs row into plain English for the dashboard.
 * Nothing user-facing should ever render the raw JSON input/output — a
 * business owner reading their call history wants "Booked a table for 5 on
 * Jul 17 at 7:30 PM", not `{"party_size":5,...}`.
 */
export interface ToolRunDescription {
  /** What the agent did, e.g. "Booked a reservation". */
  action: string;
  /** The specifics, e.g. "Ethan · party of 5 · Jul 17 at 7:30 PM". */
  detail: string;
  /** How it turned out, e.g. "Confirmed". */
  result: string;
}

type Bag = Record<string, unknown>;

function str(bag: Bag, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = bag[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function num(bag: Bag, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = bag[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function bool(bag: Bag, ...keys: string[]): boolean | null {
  for (const k of keys) {
    const v = bag[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}

/** "2026-07-17" + "19:30" -> "Jul 17 at 7:30 PM". Handles ISO datetimes too. */
function friendlyWhen(dateVal: string | null, timeVal: string | null): string | null {
  if (!dateVal && !timeVal) return null;

  let d: Date | null = null;
  if (dateVal && /^\d{4}-\d{2}-\d{2}T/.test(dateVal)) {
    d = new Date(dateVal);
  } else if (dateVal && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const time = timeVal && /^\d{1,2}:\d{2}/.test(timeVal) ? timeVal : "00:00";
    d = new Date(`${dateVal}T${time.padStart(5, "0")}:00`);
  }

  if (d && !Number.isNaN(d.getTime())) {
    const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!timeVal && !/T\d{2}:\d{2}/.test(dateVal ?? "")) return datePart;
    const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${datePart} at ${timePart}`;
  }

  return [dateVal, timeVal].filter(Boolean).join(" at ") || null;
}

function joinDetail(parts: (string | null | undefined)[]): string {
  const kept = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return kept.length > 0 ? kept.join(" · ") : "No details captured";
}

function countItems(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  return null;
}

/** Fallback: readable-but-generic rendering when a tool has no bespoke phrasing. */
function genericDescription(toolName: string, input: Bag, output: Bag): ToolRunDescription {
  const detail = joinDetail(
    Object.entries(input)
      .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .slice(0, 4)
      .map(([k, v]) => `${humanize(k)}: ${String(v)}`)
  );
  const ok = bool(output, "confirmed", "booked", "created", "submitted", "captured", "sent", "available");
  return {
    action: humanize(toolName),
    detail,
    result: ok === true ? "Completed" : ok === false ? "Not completed" : "Done",
  };
}

export function describeToolRun(
  toolName: string,
  rawInput: unknown,
  rawOutput: unknown,
  status?: string | null
): ToolRunDescription {
  const input = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Bag;
  const output = (rawOutput && typeof rawOutput === "object" ? rawOutput : {}) as Bag;

  const when = friendlyWhen(
    str(input, "date", "datetime", "scheduled_at", "preferred_date", "date_from", "slot_id", "event_date"),
    str(input, "time")
  );
  const name = str(
    input,
    "guest_name",
    "patient_name",
    "buyer_name",
    "owner_name",
    "name",
    "contact_name",
    "tenant_name",
    "customer_name",
    "patient_id"
  );
  const party = num(input, "party_size", "guest_count");
  const phone = str(input, "phone", "buyer_phone", "customer_phone", "owner_phone", "patient_phone", "reporter_phone");

  let d: ToolRunDescription;

  switch (toolName) {
    // ── Restaurant ───────────────────────────────────────────────────
    case "check_table_availability":
      d = {
        action: "Checked table availability",
        detail: joinDetail([party ? `party of ${party}` : null, when]),
        result: bool(output, "available") ? "Table available" : "No table at that time",
      };
      break;
    case "create_reservation":
      d = {
        action: "Booked a reservation",
        detail: joinDetail([name, party ? `party of ${party}` : null, when, phone ? formatPhoneNumber(phone) : null]),
        result: bool(output, "confirmed") ? "Confirmed" : "Not confirmed",
      };
      break;
    case "modify_reservation":
      d = {
        action: "Changed a reservation",
        detail: joinDetail([name, when]),
        result: bool(output, "updated") ? "Updated" : "Not updated",
      };
      break;
    case "cancel_reservation":
      d = {
        action: "Cancelled a reservation",
        detail: joinDetail([name, when]),
        result: bool(output, "cancelled") ? "Cancelled" : "Not found",
      };
      break;
    case "get_menu": {
      const items = countItems(output.items);
      d = {
        action: "Looked up the menu",
        detail: joinDetail([str(input, "section"), str(input, "dietary_filter"), str(input, "search_query")]),
        result: items != null ? `${items} item${items === 1 ? "" : "s"} found` : "Menu returned",
      };
      break;
    }
    case "check_allergens":
      d = {
        action: "Checked allergens",
        detail: joinDetail([str(input, "dish_name")]),
        result: countItems(output.allergens) ? "Allergen info provided" : "No allergen info on file",
      };
      break;
    case "submit_order": {
      const items = countItems(input.items);
      const total = num(output, "total");
      d = {
        action: "Placed an order",
        detail: joinDetail([
          str(input, "order_type") ? humanize(str(input, "order_type")) : null,
          items != null ? `${items} item${items === 1 ? "" : "s"}` : null,
          phone ? formatPhoneNumber(phone) : null,
        ]),
        result: total != null && total > 0 ? `Order placed · $${total.toFixed(2)}` : "Order placed",
      };
      break;
    }
    case "get_wait_time":
      d = {
        action: "Checked the wait time",
        detail: joinDetail([str(input, "type") ? humanize(str(input, "type")) : null]),
        result: num(output, "estimated_minutes") != null ? `About ${num(output, "estimated_minutes")} min` : "Provided",
      };
      break;

    // ── Healthcare ───────────────────────────────────────────────────
    case "check_availability": {
      const slots = countItems(output.slots);
      d = {
        action: "Checked appointment availability",
        detail: joinDetail([str(input, "appointment_type"), when]),
        result: slots != null ? `${slots} slot${slots === 1 ? "" : "s"} open` : "Checked",
      };
      break;
    }
    case "book_appointment_slot":
      d = {
        action: "Booked an appointment",
        detail: joinDetail([name, str(input, "appointment_type"), when, str(input, "reason_for_visit")]),
        result: bool(output, "booked") ? "Confirmed" : "Not booked",
      };
      break;
    case "cancel_appointment":
      d = {
        action: "Cancelled an appointment",
        detail: joinDetail([name, str(input, "reason")]),
        result: bool(output, "cancelled") ? "Cancelled" : "Not found",
      };
      break;
    case "get_patient_info":
      d = {
        action: "Looked up a patient",
        detail: joinDetail([name]),
        result: bool(output, "found") ? "Record found" : "No record found",
      };
      break;
    case "submit_refill_request":
      d = {
        action: "Requested a prescription refill",
        detail: joinDetail([name, str(input, "medication_name")]),
        result: bool(output, "submitted") ? "Sent for provider review" : "Not submitted",
      };
      break;
    case "verify_insurance":
      d = {
        action: "Captured insurance details",
        detail: joinDetail([str(input, "insurance_carrier"), str(input, "member_id") ? "member ID on file" : null]),
        result: "Pending manual verification",
      };
      break;

    // ── Real estate ──────────────────────────────────────────────────
    case "search_listings": {
      const results = countItems(output.listings);
      d = {
        action: "Searched listings",
        detail: joinDetail([
          str(input, "location"),
          str(input, "property_type"),
          num(input, "min_bedrooms") ? `${num(input, "min_bedrooms")}+ beds` : null,
        ]),
        result: results != null ? `${results} match${results === 1 ? "" : "es"}` : "Searched",
      };
      break;
    }
    case "get_listing_details":
      d = {
        action: "Pulled listing details",
        detail: joinDetail([str(input, "address"), str(input, "mls_number")]),
        result: bool(output, "found") ? "Details provided" : "Listing not found",
      };
      break;
    case "check_showing_availability":
      d = {
        action: "Checked showing times",
        detail: joinDetail([str(input, "property_address"), when]),
        result: bool(output, "available") ? "Times available" : "No times available",
      };
      break;
    case "book_showing":
      d = {
        action: "Booked a property showing",
        detail: joinDetail([name, str(input, "property_address"), when]),
        result: bool(output, "confirmed") ? "Confirmed" : "Not booked",
      };
      break;
    case "submit_valuation_request":
      d = {
        action: "Requested a property valuation",
        detail: joinDetail([name, str(input, "property_address")]),
        result: bool(output, "submitted") ? "Sent to an agent" : "Not submitted",
      };
      break;
    case "create_maintenance_ticket":
      d = {
        action: "Opened a maintenance ticket",
        detail: joinDetail([
          str(input, "property_address"),
          str(input, "issue_type") ? humanize(str(input, "issue_type")) : null,
          str(input, "urgency") ? `${humanize(str(input, "urgency"))} priority` : null,
        ]),
        result: bool(output, "created") ? "Ticket created" : "Not created",
      };
      break;
    case "get_agent_info": {
      const agents = countItems(output.agents);
      d = {
        action: "Looked up an agent",
        detail: joinDetail([str(input, "agent_name"), str(input, "specialty")]),
        result: agents != null ? `${agents} agent${agents === 1 ? "" : "s"} found` : "Looked up",
      };
      break;
    }
    case "capture_lead":
      d = {
        action: "Captured a lead",
        detail: joinDetail([
          name,
          str(input, "lead_type") ? `${humanize(str(input, "lead_type"))} lead` : null,
          phone ? formatPhoneNumber(phone) : null,
        ]),
        result: bool(output, "captured") ? "Saved to leads" : "Not saved",
      };
      break;

    // ── Shared ───────────────────────────────────────────────────────
    case "transfer_call":
      d = {
        action: "Transferred to a person",
        detail: joinDetail([str(input, "department"), str(input, "reason")]),
        result: bool(output, "transferred") ? "Connected" : "Team notified instead",
      };
      break;

    default:
      d = genericDescription(toolName, input, output);
  }

  if (status === "error") {
    const msg = str(output, "error", "message");
    return { ...d, result: msg ? `Failed — ${msg}` : "Failed" };
  }

  return d;
}
