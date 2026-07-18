import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import type { ToolHandler, ToolHandlerMap } from "./types";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ListingFactRow = Database["public"]["Tables"]["listing_facts"]["Row"];
type SupabaseAdmin = SupabaseClient<Database>;

// ─── Shared helpers ─────────────────────────────────────────────────────────

function str(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function num(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function bool(input: Record<string, unknown>, key: string): boolean | undefined {
  const value = input[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? fullName.trim();
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return { firstName, lastName };
}

function formatListingAddress(listing: ListingRow): string {
  const line2 = listing.address_line2 ? ` ${listing.address_line2}` : "";
  return `${listing.address_line1}${line2}, ${listing.city}, ${listing.state} ${listing.zip}`;
}

function listingSummary(listing: ListingRow) {
  return {
    listing_id: listing.id,
    mls_number: listing.mls_number,
    address: formatListingAddress(listing),
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    listing_type: listing.listing_type,
    property_type: listing.property_type,
    status: listing.status,
    price: listing.price_cents / 100,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    square_feet: listing.square_feet,
    lot_size_sqft: listing.lot_size_sqft,
    year_built: listing.year_built,
    description: listing.description,
    virtual_tour_url: listing.virtual_tour_url,
  };
}

/**
 * Listings store address as address_line1/city/state/zip rather than one
 * free-text field, but callers (and the AI) pass a single spoken address
 * string. Try a direct ilike match on address_line1 first, then fall back
 * to a client-side containment check against the tenant's listings so a
 * partially-spoken address ("123 Main Street" vs "123 Main St, Austin, TX
 * 78701") still resolves.
 */
async function findListingByAddress(
  supabase: SupabaseAdmin,
  tenantId: string,
  address: string,
): Promise<ListingRow | null> {
  const { data: direct } = await supabase
    .from("listings")
    .select("*")
    .eq("tenant_id", tenantId)
    .ilike("address_line1", `%${address}%`)
    .limit(1);
  if (direct && direct.length > 0) return direct[0];

  const { data: candidates } = await supabase
    .from("listings")
    .select("*")
    .eq("tenant_id", tenantId)
    .limit(500);
  if (!candidates) return null;

  const lowerAddress = address.toLowerCase();
  const byContainment = candidates.find((listing) =>
    lowerAddress.includes(listing.address_line1.toLowerCase()),
  );
  if (byContainment) return byContainment;

  const byFullAddress = candidates.find((listing) =>
    formatListingAddress(listing).toLowerCase().includes(lowerAddress),
  );
  return byFullAddress ?? null;
}

const SHOWING_WINDOW_START_HOUR = 10;
const SHOWING_WINDOW_END_HOUR = 18;
const SHOWING_SLOT_MINUTES = 30;

interface ShowingSlot {
  start: string;
  end: string;
}

function generateBusinessHourSlots(preferredDate: Date): ShowingSlot[] {
  const dayStart = new Date(
    Date.UTC(
      preferredDate.getUTCFullYear(),
      preferredDate.getUTCMonth(),
      preferredDate.getUTCDate(),
      SHOWING_WINDOW_START_HOUR,
      0,
      0,
    ),
  );
  const slots: ShowingSlot[] = [];
  const totalMinutes = (SHOWING_WINDOW_END_HOUR - SHOWING_WINDOW_START_HOUR) * 60;
  for (let offset = 0; offset < totalMinutes; offset += SHOWING_SLOT_MINUTES) {
    const start = new Date(dayStart.getTime() + offset * 60_000);
    const end = new Date(start.getTime() + SHOWING_SLOT_MINUTES * 60_000);
    slots.push({ start: start.toISOString(), end: end.toISOString() });
  }
  return slots;
}

// ─── search_listings ────────────────────────────────────────────────────────

const handleSearchListings: ToolHandler = async ({ supabase, tenantId, input }) => {
  const location = str(input, "location");
  const propertyType = str(input, "property_type");
  const minPrice = num(input, "min_price");
  const maxPrice = num(input, "max_price");
  const minBedrooms = num(input, "min_bedrooms");
  const minBathrooms = num(input, "min_bathrooms");
  const limitInput = num(input, "limit");
  const limit = Math.min(Math.max(limitInput ?? 10, 1), 50);

  let query = supabase
    .from("listings")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (location) {
    query = query.or(
      `city.ilike.%${location}%,state.ilike.%${location}%,zip.ilike.%${location}%,address_line1.ilike.%${location}%`,
    );
  }
  if (propertyType) query = query.ilike("property_type", `%${propertyType}%`);
  if (minPrice !== undefined) query = query.gte("price_cents", Math.round(minPrice * 100));
  if (maxPrice !== undefined) query = query.lte("price_cents", Math.round(maxPrice * 100));
  if (minBedrooms !== undefined) query = query.gte("bedrooms", minBedrooms);
  if (minBathrooms !== undefined) query = query.gte("bathrooms", minBathrooms);

  const { data, error } = await query.order("listed_at", { ascending: false }).limit(limit);
  if (error) throw error;

  return { listings: (data ?? []).map(listingSummary) };
};

// ─── get_listing_details ────────────────────────────────────────────────────

const handleGetListingDetails: ToolHandler = async ({ supabase, tenantId, input }) => {
  const mlsNumber = str(input, "mls_number");
  const address = str(input, "address");

  let listing: ListingRow | null = null;

  if (mlsNumber) {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("mls_number", mlsNumber)
      .maybeSingle();
    listing = data ?? null;
  }

  if (!listing && address) {
    listing = await findListingByAddress(supabase, tenantId, address);
  }

  if (!listing) {
    return { found: false, listing: null };
  }

  const { data: facts } = await supabase
    .from("listing_facts")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true });

  return {
    found: true,
    listing: {
      ...listingSummary(listing),
      features: listing.features,
      photos: listing.photos,
      facts: (facts ?? []).map((fact: ListingFactRow) => ({
        category: fact.category,
        label: fact.label,
        value: fact.value,
      })),
    },
  };
};

// ─── check_showing_availability ─────────────────────────────────────────────

const handleCheckShowingAvailability: ToolHandler = async ({ supabase, tenantId, input }) => {
  const propertyAddress = str(input, "property_address");
  const preferredDateStr = str(input, "preferred_date");
  const agentId = str(input, "agent_id");

  if (!propertyAddress || !preferredDateStr) {
    return { available: false, reason: "Missing property address or preferred date" };
  }

  const listing = await findListingByAddress(supabase, tenantId, propertyAddress);
  if (!listing) {
    return { available: false, reason: "Listing not found" };
  }

  const preferredDate = new Date(preferredDateStr);
  if (Number.isNaN(preferredDate.getTime())) {
    return { available: false, reason: "Invalid preferred date" };
  }

  const dayStart = new Date(
    Date.UTC(preferredDate.getUTCFullYear(), preferredDate.getUTCMonth(), preferredDate.getUTCDate(), 0, 0, 0),
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

  let existingQuery = supabase
    .from("showings")
    .select("scheduled_at, duration_minutes, status")
    .eq("tenant_id", tenantId)
    .eq("listing_id", listing.id)
    .neq("status", "cancelled")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString());

  if (isUuid(agentId)) {
    existingQuery = existingQuery.eq("agent_id", agentId);
  }

  const { data: existingShowings, error } = await existingQuery;
  if (error) throw error;

  const bookedIntervals = (existingShowings ?? []).map((showing) => {
    const start = new Date(showing.scheduled_at).getTime();
    const end = start + (showing.duration_minutes ?? SHOWING_SLOT_MINUTES) * 60_000;
    return { start, end };
  });

  const candidateSlots = generateBusinessHourSlots(preferredDate);
  const openSlots = candidateSlots.filter((slot) => {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();
    return !bookedIntervals.some(
      (interval) => slotStart < interval.end && slotEnd > interval.start,
    );
  });

  return { available: openSlots.length > 0, slots: openSlots };
};

// ─── book_showing ────────────────────────────────────────────────────────────

const handleBookShowing: ToolHandler = async ({ supabase, tenantId, callId, input }) => {
  const propertyAddress = str(input, "property_address");
  const buyerName = str(input, "buyer_name");
  const buyerPhone = str(input, "buyer_phone");
  const datetime = str(input, "datetime");
  const agentId = str(input, "agent_id");

  if (!propertyAddress || !buyerName || !buyerPhone || !datetime) {
    return { booked: false, reason: "Missing required booking details" };
  }

  const listing = await findListingByAddress(supabase, tenantId, propertyAddress);
  if (!listing) {
    return { booked: false, reason: "Listing not found for that address" };
  }

  const scheduledAt = new Date(datetime);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { booked: false, reason: "Invalid showing date/time" };
  }

  const { data: existingLead } = await supabase
    .from("real_estate_leads")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", buyerPhone)
    .maybeSingle();

  let leadId: string;
  if (existingLead) {
    leadId = existingLead.id;
  } else {
    const { firstName, lastName } = splitName(buyerName);
    const { data: newLead, error: leadError } = await supabase
      .from("real_estate_leads")
      .insert({
        tenant_id: tenantId,
        call_id: callId,
        first_name: firstName,
        last_name: lastName || firstName,
        phone: buyerPhone,
        lead_type: "buyer",
        source: "phone_call",
        status: "new",
      })
      .select("id")
      .single();
    if (leadError) throw leadError;
    leadId = newLead.id;
  }

  const { data: showing, error: showingError } = await supabase
    .from("showings")
    .insert({
      tenant_id: tenantId,
      listing_id: listing.id,
      lead_id: leadId,
      agent_id: isUuid(agentId) ? agentId : null,
      call_id: callId,
      scheduled_at: scheduledAt.toISOString(),
      status: "scheduled",
    })
    .select("id, scheduled_at")
    .single();
  if (showingError) throw showingError;

  return { showing_id: showing.id, confirmed: true, scheduled_at: showing.scheduled_at };
};

// ─── submit_valuation_request ───────────────────────────────────────────────

const handleSubmitValuationRequest: ToolHandler = async ({ supabase, tenantId, callId, input }) => {
  const propertyAddress = str(input, "property_address");
  const ownerName = str(input, "owner_name");
  const ownerPhone = str(input, "owner_phone");
  const propertyType = str(input, "property_type");
  const purpose = str(input, "purpose");
  const urgency = str(input, "urgency");

  if (!propertyAddress || !ownerName) {
    return { submitted: false, reason: "Missing property address or owner name" };
  }

  const noteParts: string[] = [];
  if (purpose) noteParts.push(`Purpose: ${purpose}`);
  if (urgency) noteParts.push(`Urgency: ${urgency}`);
  const notes = noteParts.length > 0 ? noteParts.join(". ") : null;

  const { data, error } = await supabase
    .from("valuation_appointments")
    .insert({
      tenant_id: tenantId,
      call_id: callId,
      owner_name: ownerName,
      owner_phone: ownerPhone ?? "unknown",
      property_address: propertyAddress,
      property_type: propertyType ?? null,
      // A caller asking "what's my house worth?" has agreed to nothing. The
      // old code invented a slot three business days out at 10:00 and filed it
      // as `scheduled`, which showed staff a booking that existed nowhere but
      // in this row — and that no one had told the owner about. Record what
      // actually happened: a request awaiting a human to call back and agree a
      // real time.
      scheduled_at: null,
      status: "requested",
      notes,
    })
    .select("id")
    .single();
  if (error) throw error;

  return { submitted: true, request_id: data.id, property_address: propertyAddress };
};

// ─── create_maintenance_ticket ──────────────────────────────────────────────

function mapMaintenancePriority(urgency: string): string {
  const normalized = urgency.toLowerCase();
  if (["emergency", "urgent", "high", "medium", "low", "routine"].includes(normalized)) {
    if (normalized === "urgent") return "high";
    if (normalized === "routine") return "medium";
    return normalized;
  }
  return "medium";
}

const handleCreateMaintenanceTicket: ToolHandler = async ({ supabase, tenantId, callId, input }) => {
  const tenantName = str(input, "tenant_name");
  const propertyAddress = str(input, "property_address");
  const unitNumber = str(input, "unit_number");
  const issueType = str(input, "issue_type");
  const urgency = str(input, "urgency");
  const description = str(input, "description");
  const permissionToEnter = bool(input, "permission_to_enter");
  const reporterPhone = str(input, "reporter_phone") ?? str(input, "phone");

  if (!tenantName || !propertyAddress || !issueType || !urgency || !description || permissionToEnter === undefined) {
    return { created: false, reason: "Missing required maintenance ticket details" };
  }

  let unitQuery = supabase
    .from("property_management_units")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("address", propertyAddress);
  if (unitNumber) unitQuery = unitQuery.eq("unit_number", unitNumber);

  const { data: existingUnit } = await unitQuery.maybeSingle();

  let unitId: string;
  if (existingUnit) {
    unitId = existingUnit.id;
  } else {
    const { data: newUnit, error: unitError } = await supabase
      .from("property_management_units")
      .insert({
        tenant_id: tenantId,
        address: propertyAddress,
        unit_number: unitNumber ?? "N/A",
        property_type: "unknown",
        status: "occupied",
        tenant_name: tenantName,
      })
      .select("id")
      .single();
    if (unitError) throw unitError;
    unitId = newUnit.id;
  }

  const priority = mapMaintenancePriority(urgency);
  const notes = `Permission to enter: ${permissionToEnter ? "granted" : "not granted"}`;

  const { data: ticket, error: ticketError } = await supabase
    .from("maintenance_requests")
    .insert({
      tenant_id: tenantId,
      unit_id: unitId,
      call_id: callId,
      reporter_name: tenantName,
      reporter_phone: reporterPhone ?? "unknown",
      category: issueType,
      description,
      priority,
      status: "open",
      notes,
    })
    .select("id")
    .single();
  if (ticketError) throw ticketError;

  return { ticket_id: ticket.id, created: true, priority };
};

// ─── get_agent_info ──────────────────────────────────────────────────────────

const handleGetAgentInfo: ToolHandler = async ({ supabase, tenantId, input }) => {
  const agentName = str(input, "agent_name");
  const specialty = str(input, "specialty");

  let query = supabase
    .from("re_agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (agentName) {
    query = query.or(`first_name.ilike.%${agentName}%,last_name.ilike.%${agentName}%`);
  }
  if (specialty) {
    query = query.contains("specializations", [specialty]);
  }

  const { data, error } = await query.limit(20);
  if (error) throw error;

  return {
    agents: (data ?? []).map((agent) => ({
      agent_id: agent.id,
      first_name: agent.first_name,
      last_name: agent.last_name,
      phone: agent.phone,
      email: agent.email,
      specializations: agent.specializations,
      bio: agent.bio,
    })),
  };
};

// ─── capture_lead ────────────────────────────────────────────────────────────

const handleCaptureLead: ToolHandler = async ({ supabase, tenantId, callId, input }) => {
  const name = str(input, "name");
  const phone = str(input, "phone");
  const email = str(input, "email");
  const leadType = str(input, "lead_type");
  const source = str(input, "source");
  const notes = str(input, "notes");

  if (!name || !leadType || !source) {
    return { captured: false, reason: "Missing required lead details" };
  }

  const { firstName, lastName } = splitName(name);

  const { data, error } = await supabase
    .from("real_estate_leads")
    .insert({
      tenant_id: tenantId,
      call_id: callId,
      first_name: firstName,
      last_name: lastName || firstName,
      email: email ?? null,
      phone: phone ?? "unknown",
      lead_type: leadType,
      source,
      status: "new",
      notes: notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  return { lead_id: data.id, captured: true, lead_type: leadType };
};

// ─── Export ──────────────────────────────────────────────────────────────────

export const realEstateToolHandlers: ToolHandlerMap = {
  search_listings: handleSearchListings,
  get_listing_details: handleGetListingDetails,
  check_showing_availability: handleCheckShowingAvailability,
  book_showing: handleBookShowing,
  submit_valuation_request: handleSubmitValuationRequest,
  create_maintenance_ticket: handleCreateMaintenanceTicket,
  get_agent_info: handleGetAgentInfo,
  capture_lead: handleCaptureLead,
};
