import type { ToolHandler, ToolHandlerMap } from "./types";

/**
 * Restaurant-pack tool implementations. Mirrors the style of
 * transfer-call.ts: the Supabase client passed in via context is a
 * service-role admin client with no RLS, so every single query here must
 * manually scope to `tenant_id` — tenant isolation is entirely our
 * responsibility at this layer.
 */

// ─── Shared date/time helpers ────────────────────────────────────────────
// The pack gives us loose "date" (ISO-ish) + "time" (HH:MM) strings from the
// AI, not a single trustworthy timestamp. We combine them deterministically
// using UTC as an internal baseline — not because it's the venue's real
// timezone, but so every comparison in this file (conflict windows,
// "closest reservation" lookups, alternative-time math) is self-consistent.

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseDateOnly(date: string): { y: number; m: number; d: number } | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (isoMatch) {
    return { y: Number(isoMatch[1]), m: Number(isoMatch[2]), d: Number(isoMatch[3]) };
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return { y: parsed.getUTCFullYear(), m: parsed.getUTCMonth() + 1, d: parsed.getUTCDate() };
}

function parseTimeOnly(time: string): { h: number; min: number } | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/.exec(time.trim());
  if (!match) return null;
  let h = Number(match[1]);
  const min = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && h < 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, min };
}

function combineDateTime(date: string, time: string): Date | null {
  const d = parseDateOnly(date);
  const t = parseTimeOnly(time);
  if (!d || !t) return null;
  return new Date(Date.UTC(d.y, d.m - 1, d.d, t.h, t.min, 0));
}

function formatTime(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function closestByTime<T extends { scheduled_at: string }>(rows: T[], target: Date): T {
  return rows.reduce((closest, cur) => {
    const diffCur = Math.abs(new Date(cur.scheduled_at).getTime() - target.getTime());
    const diffClosest = Math.abs(new Date(closest.scheduled_at).getTime() - target.getTime());
    return diffCur < diffClosest ? cur : closest;
  });
}

// ─── check_table_availability ────────────────────────────────────────────
// There's no "total table count" config readily available at this layer, so
// this is a heuristic: look for a direct time clash against existing
// reservations of a similar party size on the same day; if none, call it
// available. If there's a clash, suggest nearby times that are clear.

const CONFLICT_WINDOW_MS = 30 * 60 * 1000;
const ALT_OFFSETS_MINUTES = [-60, -30, 30, 60];

const handleCheckTableAvailability: ToolHandler = async ({ supabase, tenantId, input }) => {
  const date = typeof input.date === "string" ? input.date : "";
  const time = typeof input.time === "string" ? input.time : "";
  const partySize = typeof input.party_size === "number" ? Math.floor(input.party_size) : NaN;

  const target = combineDateTime(date, time);
  if (!target || !Number.isFinite(partySize) || partySize <= 0) {
    return { available: false, alternatives: [] };
  }

  const dayStart = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0),
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const { data: dayReservations, error } = await supabase
    .from("reservations")
    .select("scheduled_at, party_size")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString());

  if (error) throw error;

  const reservations = dayReservations ?? [];

  const conflictsAt = (candidate: Date) =>
    reservations.some((r) => {
      const diff = Math.abs(new Date(r.scheduled_at).getTime() - candidate.getTime());
      return diff <= CONFLICT_WINDOW_MS && Math.abs(r.party_size - partySize) <= 2;
    });

  if (!conflictsAt(target)) {
    return { available: true, alternatives: [] };
  }

  const { data: tableRows } = await supabase
    .from("restaurant_tables")
    .select("capacity")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .gte("capacity", partySize)
    .order("capacity", { ascending: true })
    .limit(1);

  const capacity = tableRows?.[0]?.capacity ?? partySize;

  const alternatives = ALT_OFFSETS_MINUTES.map(
    (offsetMinutes) => new Date(target.getTime() + offsetMinutes * 60 * 1000),
  )
    .filter((candidate) => !conflictsAt(candidate))
    .map((candidate) => ({ time: formatTime(candidate), capacity }));

  return { available: false, alternatives };
};

// ─── create_reservation ──────────────────────────────────────────────────

const handleCreateReservation: ToolHandler = async ({ supabase, tenantId, callId, input }) => {
  const guestName = typeof input.guest_name === "string" ? input.guest_name.trim() : "";
  const partySize = typeof input.party_size === "number" ? Math.floor(input.party_size) : NaN;
  const date = typeof input.date === "string" ? input.date : "";
  const time = typeof input.time === "string" ? input.time : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const specialRequests =
    typeof input.special_requests === "string" ? input.special_requests : null;

  if (!guestName || !phone || !Number.isFinite(partySize) || partySize <= 0) {
    return {
      confirmed: false,
      confirmation_message:
        "I couldn't create the reservation — I'm missing the guest name, phone number, or party size.",
    };
  }

  const scheduled = combineDateTime(date, time);
  if (!scheduled) {
    return {
      confirmed: false,
      confirmation_message: `I couldn't understand the date or time "${date} ${time}" for the reservation. Could you confirm those again?`,
    };
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      tenant_id: tenantId,
      call_id: callId,
      guest_name: guestName,
      guest_phone: phone,
      party_size: partySize,
      scheduled_at: scheduled.toISOString(),
      status: "confirmed",
      special_requests: specialRequests,
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;

  return {
    reservation_id: data.id,
    confirmed: true,
    confirmation_message: `You're all set, ${guestName} — a table for ${partySize} on ${date} at ${time} is confirmed.`,
  };
};

// ─── modify_reservation ──────────────────────────────────────────────────

const handleModifyReservation: ToolHandler = async ({ supabase, tenantId, input }) => {
  const guestName = typeof input.guest_name === "string" ? input.guest_name.trim() : "";
  const originalDate = typeof input.original_date === "string" ? input.original_date : "";
  const originalTime = typeof input.original_time === "string" ? input.original_time : "";

  if (!guestName) {
    return { reservation_id: "", updated: false, new_details: {} };
  }

  const { data: candidates, error: lookupError } = await supabase
    .from("reservations")
    .select("id, scheduled_at, party_size, status")
    .eq("tenant_id", tenantId)
    .ilike("guest_name", `%${guestName}%`)
    .neq("status", "cancelled");

  if (lookupError) throw lookupError;
  if (!candidates || candidates.length === 0) {
    return { reservation_id: "", updated: false, new_details: {} };
  }

  const originalTarget = combineDateTime(originalDate, originalTime);
  const match = originalTarget ? closestByTime(candidates, originalTarget) : candidates[0];

  const newDate = typeof input.new_date === "string" ? input.new_date : undefined;
  const newTime = typeof input.new_time === "string" ? input.new_time : undefined;
  const newPartySize =
    typeof input.new_party_size === "number" && input.new_party_size > 0
      ? Math.floor(input.new_party_size)
      : undefined;

  const updatePayload: { scheduled_at?: string; party_size?: number } = {};
  const newDetails: Record<string, string | number> = {};

  if (newDate || newTime) {
    const existing = new Date(match.scheduled_at);
    const fallbackDate = formatDate(existing);
    const fallbackTime = formatTime(existing);
    const combined = combineDateTime(newDate ?? fallbackDate, newTime ?? fallbackTime);
    if (combined) {
      updatePayload.scheduled_at = combined.toISOString();
      newDetails.date = newDate ?? fallbackDate;
      newDetails.time = newTime ?? fallbackTime;
    }
  }

  if (newPartySize !== undefined) {
    updatePayload.party_size = newPartySize;
    newDetails.party_size = newPartySize;
  }

  if (Object.keys(updatePayload).length === 0) {
    return { reservation_id: match.id, updated: false, new_details: {} };
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update(updatePayload)
    .eq("id", match.id)
    .eq("tenant_id", tenantId);

  if (updateError) throw updateError;

  return { reservation_id: match.id, updated: true, new_details: newDetails };
};

// ─── cancel_reservation ──────────────────────────────────────────────────

const handleCancelReservation: ToolHandler = async ({ supabase, tenantId, input }) => {
  const guestName = typeof input.guest_name === "string" ? input.guest_name.trim() : "";
  if (!guestName) {
    return { cancelled: false, reservation_id: "" };
  }

  // The AI may pass date/time under a couple of different field names
  // depending on how it was primed; accept either, and treat them as
  // optional disambiguation hints rather than hard requirements.
  const dateStr =
    typeof input.reservation_date === "string"
      ? input.reservation_date
      : typeof input.date === "string"
        ? input.date
        : undefined;
  const timeStr =
    typeof input.reservation_time === "string"
      ? input.reservation_time
      : typeof input.time === "string"
        ? input.time
        : undefined;

  const target = dateStr && timeStr ? combineDateTime(dateStr, timeStr) : null;

  const { data: candidates, error: lookupError } = await supabase
    .from("reservations")
    .select("id, scheduled_at, status")
    .eq("tenant_id", tenantId)
    .ilike("guest_name", `%${guestName}%`)
    .neq("status", "cancelled");

  if (lookupError) throw lookupError;
  if (!candidates || candidates.length === 0) {
    return { cancelled: false, reservation_id: "" };
  }

  let match = candidates[0];
  if (target) {
    match = closestByTime(candidates, target);
  } else {
    const now = Date.now();
    const upcoming = candidates.filter((c) => new Date(c.scheduled_at).getTime() >= now);
    const pool = upcoming.length > 0 ? upcoming : candidates;
    match = pool.reduce((soonest, cur) =>
      new Date(cur.scheduled_at).getTime() < new Date(soonest.scheduled_at).getTime()
        ? cur
        : soonest,
    );
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", match.id)
    .eq("tenant_id", tenantId);

  if (updateError) throw updateError;

  return { cancelled: true, reservation_id: match.id };
};

// ─── get_menu ─────────────────────────────────────────────────────────────

const handleGetMenu: ToolHandler = async ({ supabase, tenantId, input }) => {
  const section = typeof input.section === "string" ? input.section.trim() : "";
  const dietaryFilter =
    typeof input.dietary_filter === "string" ? input.dietary_filter.trim().toLowerCase() : "";
  const searchQuery = typeof input.search_query === "string" ? input.search_query.trim() : "";

  const { data: categories, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("id, name")
    .eq("tenant_id", tenantId);

  if (categoriesError) throw categoriesError;

  const categoryNameById = new Map<string, string>((categories ?? []).map((c) => [c.id, c.name]));

  let itemsQuery = supabase
    .from("menu_items")
    .select("name, description, price_cents, category_id, dietary_tags, allergens")
    .eq("tenant_id", tenantId)
    .eq("is_available", true);

  if (searchQuery) {
    itemsQuery = itemsQuery.ilike("name", `%${searchQuery}%`);
  }

  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) throw itemsError;

  const filtered = (items ?? []).filter((item) => {
    if (section) {
      const categoryName = categoryNameById.get(item.category_id) ?? "";
      if (!categoryName.toLowerCase().includes(section.toLowerCase())) return false;
    }
    if (dietaryFilter) {
      const tags = (item.dietary_tags ?? []).map((t) => t.toLowerCase());
      if (!tags.some((t) => t.includes(dietaryFilter))) return false;
    }
    return true;
  });

  return {
    items: filtered.map((item) => ({
      name: item.name,
      description: item.description ?? "",
      price: item.price_cents / 100,
      section: categoryNameById.get(item.category_id) ?? "",
      dietary_labels: item.dietary_tags ?? [],
      allergens: item.allergens ?? [],
    })),
  };
};

// ─── check_allergens ──────────────────────────────────────────────────────
// This is a real safety-relevant claim: only report allergens actually on
// file, and never assert "safe" alternatives or a verified cross-
// contamination status we don't actually have data for.

const handleCheckAllergens: ToolHandler = async ({ supabase, tenantId, input }) => {
  const dishName = typeof input.dish_name === "string" ? input.dish_name.trim() : "";
  if (!dishName) {
    return {
      dish: "",
      allergens: [],
      safe_alternatives: [],
      note: "No dish name was provided.",
    };
  }

  const { data: matches, error } = await supabase
    .from("menu_items")
    .select("name, allergens")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${dishName}%`)
    .limit(1);

  if (error) throw error;

  const dish = matches?.[0];

  if (!dish) {
    return {
      dish: dishName,
      allergens: [],
      safe_alternatives: [],
      note: "Allergen details not on file for this item — please ask a team member to confirm.",
    };
  }

  const rawAllergens = dish.allergens ?? [];
  if (rawAllergens.length === 0) {
    return {
      dish: dish.name,
      allergens: [],
      safe_alternatives: [],
      note: "No allergens are listed for this item on file — please ask a team member to confirm before serving a guest with allergies.",
    };
  }

  return {
    dish: dish.name,
    allergens: rawAllergens.map((allergen) => ({
      allergen,
      severity: "unspecified",
      cross_contamination_risk: true,
    })),
    safe_alternatives: [],
    note: "Severity and cross-contamination risk aren't individually tracked in our system — treat this as a caution, and confirm exact preparation details with a team member.",
  };
};

// ─── submit_order ─────────────────────────────────────────────────────────

interface ParsedOrderItem {
  name: string;
  quantity: number;
  modifications?: string | string[];
}

const handleSubmitOrder: ToolHandler = async ({ supabase, tenantId, callId, input }) => {
  const rawItems = Array.isArray(input.items) ? input.items : [];

  const parsedItems: ParsedOrderItem[] = rawItems
    .map((raw): ParsedOrderItem | null => {
      if (typeof raw !== "object" || raw === null) return null;
      const r = raw as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      if (!name) return null;
      const quantity =
        typeof r.quantity === "number" && r.quantity > 0 ? Math.floor(r.quantity) : 1;
      const modifications =
        typeof r.modifications === "string" || Array.isArray(r.modifications)
          ? (r.modifications as string | string[])
          : undefined;
      return { name, quantity, modifications };
    })
    .filter((item): item is ParsedOrderItem => item !== null);

  const orderType = typeof input.order_type === "string" ? input.order_type : "";
  const customerPhone =
    typeof input.customer_phone === "string" ? input.customer_phone.trim() : "";
  const customerName =
    typeof input.customer_name === "string" && input.customer_name.trim()
      ? input.customer_name.trim()
      : "Phone order";
  let specialInstructions =
    typeof input.special_instructions === "string" ? input.special_instructions : null;
  const deliveryAddress =
    typeof input.delivery_address === "string" ? input.delivery_address.trim() : "";

  if (parsedItems.length === 0 || !orderType || !customerPhone) {
    return {
      order_id: "",
      estimated_time_minutes: 0,
      total: 0,
      status: "rejected",
    };
  }

  if (orderType === "delivery" && !deliveryAddress) {
    const missingNote = "[Delivery address not provided by caller — confirm before dispatch.]";
    specialInstructions = specialInstructions
      ? `${specialInstructions} ${missingNote}`
      : missingNote;
  }

  // Best-effort pricing: look up each item's menu price, defaulting to 0
  // (and never fabricating a total) when we can't find a match.
  const priced = await Promise.all(
    parsedItems.map(async (item) => {
      const { data: menuMatches } = await supabase
        .from("menu_items")
        .select("id, price_cents")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${item.name}%`)
        .limit(1);
      const menuMatch = menuMatches?.[0];
      return {
        ...item,
        menuItemId: menuMatch?.id ?? null,
        unitPriceCents: menuMatch?.price_cents ?? 0,
      };
    }),
  );

  const subtotalCents = priced.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      tenant_id: tenantId,
      call_id: callId,
      order_number: orderNumber,
      order_type: orderType,
      status: "pending",
      customer_name: customerName,
      customer_phone: customerPhone,
      subtotal_cents: subtotalCents,
      tax_cents: 0,
      tip_cents: 0,
      total_cents: subtotalCents,
      special_instructions: specialInstructions,
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  const { error: itemsError } = await supabase.from("order_items").insert(
    priced.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      modifiers: item.modifications ?? null,
      special_instructions: null,
    })),
  );

  if (itemsError) throw itemsError;

  return {
    order_id: order.id,
    estimated_time_minutes: 25,
    total: subtotalCents / 100,
    status: "pending",
  };
};

// ─── get_wait_time ────────────────────────────────────────────────────────
// No live kitchen-load telemetry exists in this schema, so this derives a
// rough, honest estimate from how many orders/reservations are currently
// active for the tenant as a load proxy.

const handleGetWaitTime: ToolHandler = async ({ supabase, tenantId, input }) => {
  const type = typeof input.type === "string" ? input.type : "walk_in";

  let activeCount = 0;
  if (type === "order") {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending");
    if (error) throw error;
    activeCount = count ?? 0;
  } else {
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60 * 1000);
    const { count, error } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", soon.toISOString());
    if (error) throw error;
    activeCount = count ?? 0;
  }

  const estimatedMinutes = Math.min(10 + activeCount * 3, 45);
  const busyLevel = activeCount < 3 ? "low" : activeCount < 7 ? "moderate" : "high";

  return { estimated_minutes: estimatedMinutes, busy_level: busyLevel };
};

export const restaurantToolHandlers: ToolHandlerMap = {
  check_table_availability: handleCheckTableAvailability,
  create_reservation: handleCreateReservation,
  modify_reservation: handleModifyReservation,
  cancel_reservation: handleCancelReservation,
  get_menu: handleGetMenu,
  check_allergens: handleCheckAllergens,
  submit_order: handleSubmitOrder,
  get_wait_time: handleGetWaitTime,
};
