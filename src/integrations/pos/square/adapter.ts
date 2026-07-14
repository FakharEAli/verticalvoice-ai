import { z } from "zod";
import { logger } from "@/lib/observability/logger";
import type {
  POSAdapter,
  POSAdapterConfig,
  POSMenuItem,
  POSOrderInput,
  OrderConfirmation,
  OrderStatus,
} from "@/integrations/pos/types";

// ── Square API response schemas ──────────────────────────────────────

const SquareMoneySchema = z.object({
  amount: z.number().int().optional(),
  currency: z.string().optional(),
});

const SquareCatalogItemVariationSchema = z.object({
  type: z.literal("ITEM_VARIATION").optional(),
  id: z.string(),
  item_variation_data: z
    .object({
      name: z.string().optional(),
      pricing_type: z.string().optional(),
      price_money: SquareMoneySchema.optional(),
    })
    .optional(),
});

const SquareCatalogItemSchema = z.object({
  type: z.string(),
  id: z.string(),
  item_data: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      category_id: z.string().optional(),
      variations: z.array(SquareCatalogItemVariationSchema).optional(),
    })
    .optional(),
});

const SquareCatalogListResponseSchema = z.object({
  objects: z.array(SquareCatalogItemSchema).optional(),
  cursor: z.string().optional(),
});

const SquareOrderResponseSchema = z.object({
  order: z.object({
    id: z.string(),
    reference_id: z.string().optional(),
    state: z.string().optional(),
    fulfillments: z
      .array(
        z.object({
          pickup_details: z
            .object({
              pickup_at: z.string().optional(),
            })
            .optional(),
        }),
      )
      .optional(),
    total_money: SquareMoneySchema.optional(),
    created_at: z.string().optional(),
    closed_at: z.string().optional(),
  }),
});

// ── Adapter ──────────────────────────────────────────────────────────

const SANDBOX_BASE = "https://connect.squareupsandbox.com/v2";

export class SquarePOSAdapter implements POSAdapter {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly locationId: string;
  private readonly tenantId: string;

  constructor(config: POSAdapterConfig) {
    this.accessToken = config.credentials["SQUARE_ACCESS_TOKEN"] ?? "";
    this.locationId = config.credentials["SQUARE_LOCATION_ID"] ?? "";
    this.tenantId = config.tenantId;
    this.baseUrl =
      config.credentials["SQUARE_BASE_URL"] ?? SANDBOX_BASE;

    if (!this.accessToken) {
      throw new Error("SquarePOSAdapter: SQUARE_ACCESS_TOKEN is required");
    }
    if (!this.locationId) {
      throw new Error("SquarePOSAdapter: SQUARE_LOCATION_ID is required");
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-06-04",
    };
  }

  async getMenuSync(): Promise<POSMenuItem[]> {
    logger.info("SquarePOSAdapter: fetching catalog", {
      tenantId: this.tenantId,
    });

    const url = `${this.baseUrl}/catalog/list?types=ITEM`;
    const res = await fetch(url, { headers: this.headers() });

    if (!res.ok) {
      const body = await res.text();
      logger.error("SquarePOSAdapter: catalog fetch failed", {
        status: res.status,
        body,
      });
      throw new Error(`Square catalog fetch failed: ${res.status}`);
    }

    const json = await res.json();
    const parsed = SquareCatalogListResponseSchema.parse(json);

    const items: POSMenuItem[] = (parsed.objects ?? [])
      .filter((obj) => obj.type === "ITEM" && obj.item_data)
      .map((obj) => {
        const data = obj.item_data!;
        const firstVariation = data.variations?.[0];
        const priceMoney =
          firstVariation?.item_variation_data?.price_money;

        return {
          id: obj.id,
          name: data.name ?? "Unnamed Item",
          description: data.description ?? "",
          priceCents: priceMoney?.amount ?? 0,
          currency: priceMoney?.currency ?? "USD",
          category: data.category_id ?? "Uncategorized",
          available: true,
        };
      });

    logger.info("SquarePOSAdapter: catalog loaded", {
      itemCount: items.length,
    });
    return items;
  }

  async submitOrder(order: POSOrderInput): Promise<OrderConfirmation> {
    logger.info("SquarePOSAdapter: submitting order", {
      tenantId: this.tenantId,
      itemCount: order.items.length,
    });

    const idempotencyKey = crypto.randomUUID();
    const referenceId = `VV-${Date.now()}`;

    const lineItems = order.items.map((item) => ({
      catalog_object_id: item.menuItemId,
      quantity: String(item.quantity),
      base_price_money: {
        amount: item.unitPriceCents,
        currency: "USD",
      },
      note: item.specialInstructions ?? undefined,
    }));

    const body = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: this.locationId,
        reference_id: referenceId,
        line_items: lineItems,
        fulfillments: [
          {
            type: order.orderType === "delivery" ? "DELIVERY" : "PICKUP",
            state: "PROPOSED",
            pickup_details:
              order.orderType !== "delivery"
                ? {
                    recipient: {
                      display_name: order.customerName,
                      phone_number: order.customerPhone,
                    },
                    note: order.specialInstructions ?? undefined,
                  }
                : undefined,
          },
        ],
      },
    };

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error("SquarePOSAdapter: order submission failed", {
        status: res.status,
        body: errBody,
      });
      throw new Error(`Square order submission failed: ${res.status}`);
    }

    const json = await res.json();
    const parsed = SquareOrderResponseSchema.parse(json);
    const sq = parsed.order;

    const pickupAt =
      sq.fulfillments?.[0]?.pickup_details?.pickup_at ?? undefined;

    logger.info("SquarePOSAdapter: order created", {
      orderId: sq.id,
      referenceId,
    });

    return {
      orderId: sq.id,
      orderNumber: sq.reference_id ?? referenceId,
      status: sq.state ?? "OPEN",
      estimatedReadyAt: pickupAt,
      totalCents: sq.total_money?.amount ?? 0,
      currency: sq.total_money?.currency ?? "USD",
    };
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    logger.info("SquarePOSAdapter: fetching order status", { orderId });

    const res = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("SquarePOSAdapter: order status fetch failed", {
        status: res.status,
        body,
      });
      throw new Error(`Square order status fetch failed: ${res.status}`);
    }

    const json = await res.json();
    const parsed = SquareOrderResponseSchema.parse(json);
    const sq = parsed.order;

    const statusMap: Record<string, OrderStatus["status"]> = {
      OPEN: "pending",
      IN_PROGRESS: "preparing",
      COMPLETED: "completed",
      CANCELED: "cancelled",
    };

    const pickupAt =
      sq.fulfillments?.[0]?.pickup_details?.pickup_at ?? undefined;

    return {
      orderId: sq.id,
      orderNumber: sq.reference_id ?? orderId,
      status: statusMap[sq.state ?? "OPEN"] ?? "pending",
      estimatedReadyAt: pickupAt,
      completedAt: sq.closed_at ?? undefined,
    };
  }
}
