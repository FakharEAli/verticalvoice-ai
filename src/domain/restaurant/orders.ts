import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database, Json } from "@/lib/database/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface OrderItemInput {
  menu_item_id?: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  modifiers?: Json;
  special_instructions?: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  order_type: string; // "dine_in" | "takeout" | "delivery"
  items: OrderItemInput[];
  special_instructions?: string;
  reservation_id?: string;
  call_id?: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Calculate the total for a set of order items (subtotal only, no tax).
 */
export function calculateOrderTotal(
  items: OrderItemInput[]
): { subtotal_cents: number } {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.unit_price_cents * item.quantity;
  }
  return { subtotal_cents: subtotal };
}

/**
 * Generate a short order number from timestamp + random suffix.
 */
function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${ts}-${rand}`;
}

/**
 * Create a new order with items and modifier validation.
 */
export async function createOrder(
  tenantId: string,
  order: CreateOrderInput
): Promise<OrderRow & { items: OrderItemRow[] }> {
  const supabase = await createServerClient();

  if (order.items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  // Validate menu items exist and are available
  const menuItemIds = order.items
    .map((i) => i.menu_item_id)
    .filter((id): id is string => !!id);

  if (menuItemIds.length > 0) {
    const { data: validItems, error: valErr } = await supabase
      .from("menu_items")
      .select("id, is_available")
      .eq("tenant_id", tenantId)
      .in("id", menuItemIds);

    if (valErr) {
      logger.error("Failed to validate menu items", { tenantId, error: valErr.message });
      throw new Error(`Failed to validate menu items: ${valErr.message}`);
    }

    const validIds = new Set((validItems ?? []).map((v) => v.id));
    const unavailable = (validItems ?? []).filter((v) => !v.is_available);

    for (const id of menuItemIds) {
      if (!validIds.has(id)) {
        throw new Error(`Menu item ${id} not found`);
      }
    }
    if (unavailable.length > 0) {
      throw new Error(`Some items are currently unavailable: ${unavailable.map((u) => u.id).join(", ")}`);
    }
  }

  const { subtotal_cents } = calculateOrderTotal(order.items);

  // Create order
  const { data: orderData, error: orderErr } = await supabase
    .from("orders")
    .insert({
      tenant_id: tenantId,
      order_number: generateOrderNumber(),
      order_type: order.order_type,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      subtotal_cents,
      tax_cents: 0,
      tip_cents: 0,
      total_cents: subtotal_cents,
      status: "pending",
      special_instructions: order.special_instructions ?? null,
      reservation_id: order.reservation_id ?? null,
      call_id: order.call_id ?? null,
    })
    .select()
    .single();

  if (orderErr) {
    logger.error("Failed to create order", { tenantId, error: orderErr.message });
    throw new Error(`Failed to create order: ${orderErr.message}`);
  }

  // Insert order items
  const itemInserts = order.items.map((item) => ({
    order_id: orderData.id,
    menu_item_id: item.menu_item_id ?? null,
    name: item.name,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    modifiers: item.modifiers ?? null,
    special_instructions: item.special_instructions ?? null,
  }));

  const { data: itemsData, error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemInserts)
    .select();

  if (itemsErr) {
    logger.error("Failed to create order items", { tenantId, orderId: orderData.id, error: itemsErr.message });
    throw new Error(`Failed to create order items: ${itemsErr.message}`);
  }

  logger.info("Order created", { tenantId, orderId: orderData.id, orderNumber: orderData.order_number });

  return {
    ...(orderData as OrderRow),
    items: (itemsData ?? []) as OrderItemRow[],
  };
}

/**
 * Add a single item to an existing order.
 */
export async function addItemToOrder(
  tenantId: string,
  orderId: string,
  item: OrderItemInput
): Promise<OrderItemRow> {
  const supabase = await createServerClient();

  // Verify order exists and is still modifiable
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found");
  }

  if (order.status !== "pending") {
    throw new Error("Cannot modify an order that is no longer pending");
  }

  const { data, error } = await supabase
    .from("order_items")
    .insert({
      order_id: orderId,
      menu_item_id: item.menu_item_id ?? null,
      name: item.name,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      modifiers: item.modifiers ?? null,
      special_instructions: item.special_instructions ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to add item to order", { tenantId, orderId, error: error.message });
    throw new Error(`Failed to add item to order: ${error.message}`);
  }

  // Recalculate totals
  await recalculateOrderTotal(tenantId, orderId);

  logger.info("Item added to order", { tenantId, orderId, itemId: data.id });
  return data as OrderItemRow;
}

/**
 * Remove an item from an existing order.
 */
export async function removeItemFromOrder(
  tenantId: string,
  orderId: string,
  itemId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Verify order is still pending
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found");
  }

  if (order.status !== "pending") {
    throw new Error("Cannot modify an order that is no longer pending");
  }

  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", itemId)
    .eq("order_id", orderId);

  if (error) {
    logger.error("Failed to remove item from order", { tenantId, orderId, itemId, error: error.message });
    throw new Error(`Failed to remove item from order: ${error.message}`);
  }

  await recalculateOrderTotal(tenantId, orderId);

  logger.info("Item removed from order", { tenantId, orderId, itemId });
}

/**
 * Submit an order (change status from pending to submitted).
 */
export async function submitOrder(
  tenantId: string,
  orderId: string
): Promise<OrderRow> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    logger.error("Failed to submit order", { tenantId, orderId, error: error.message });
    throw new Error(`Failed to submit order: ${error.message}`);
  }

  logger.info("Order submitted", { tenantId, orderId });
  return data as OrderRow;
}

/**
 * Get the current status of an order.
 */
export async function getOrderStatus(
  tenantId: string,
  orderId: string
): Promise<{ id: string; order_number: string; status: string; estimated_ready_at: string | null }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, estimated_ready_at")
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    throw new Error("Order not found");
  }

  return data;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

async function recalculateOrderTotal(tenantId: string, orderId: string): Promise<void> {
  const supabase = await createServerClient();

  const { data: items, error } = await supabase
    .from("order_items")
    .select("unit_price_cents, quantity")
    .eq("order_id", orderId);

  if (error) {
    logger.error("Failed to recalculate order total", { tenantId, orderId, error: error.message });
    return;
  }

  const subtotal = (items ?? []).reduce(
    (sum, item) => sum + item.unit_price_cents * item.quantity,
    0
  );

  await supabase
    .from("orders")
    .update({
      subtotal_cents: subtotal,
      total_cents: subtotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("tenant_id", tenantId);
}
