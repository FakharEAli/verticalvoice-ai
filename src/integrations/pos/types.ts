import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────

export const POSMenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().default("USD"),
  category: z.string(),
  available: z.boolean(),
  allergens: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  calories: z.number().int().nonnegative().optional(),
});

export const POSOrderItemInputSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  modifiers: z.array(z.record(z.string(), z.string())).optional(),
  specialInstructions: z.string().optional(),
});

export const POSOrderInputSchema = z.object({
  items: z.array(POSOrderItemInputSchema).min(1),
  customerName: z.string(),
  customerPhone: z.string(),
  orderType: z.enum(["pickup", "delivery", "dine_in"]),
  specialInstructions: z.string().optional(),
  tenantId: z.string(),
});

export const OrderConfirmationSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  estimatedReadyAt: z.string().datetime().optional(),
  totalCents: z.number().int().nonnegative(),
  currency: z.string(),
});

export const OrderStatusSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  status: z.enum(["pending", "preparing", "ready", "completed", "cancelled"]),
  estimatedReadyAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────

export type POSMenuItem = z.infer<typeof POSMenuItemSchema>;
export type POSOrderItemInput = z.infer<typeof POSOrderItemInputSchema>;
export type POSOrderInput = z.infer<typeof POSOrderInputSchema>;
export type OrderConfirmation = z.infer<typeof OrderConfirmationSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// ── Config ───────────────────────────────────────────────────────────

export interface POSAdapterConfig {
  connectionId: string;
  tenantId: string;
  credentials: Record<string, string>;
}

// ── Adapter interface ────────────────────────────────────────────────

export interface POSAdapter {
  submitOrder(order: POSOrderInput): Promise<OrderConfirmation>;
  getMenuSync(): Promise<POSMenuItem[]>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
}
