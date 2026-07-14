import { logger } from "@/lib/observability/logger";
import type {
  POSAdapter,
  POSMenuItem,
  POSOrderInput,
  OrderConfirmation,
  OrderStatus,
} from "@/integrations/pos/types";

interface TrackedOrder {
  orderId: string;
  orderNumber: string;
  status: OrderStatus["status"];
  estimatedReadyAt: string;
  createdAt: number;
  totalCents: number;
  currency: string;
}

const MOCK_MENU: POSMenuItem[] = [
  // Appetizers
  {
    id: "demo-app-01",
    name: "Crispy Calamari",
    description: "Lightly battered calamari rings with marinara dipping sauce",
    priceCents: 1295,
    currency: "USD",
    category: "Appetizers",
    available: true,
    allergens: ["gluten", "shellfish"],
    dietaryTags: [],
    calories: 420,
  },
  {
    id: "demo-app-02",
    name: "Bruschetta Trio",
    description: "Grilled ciabatta topped with tomato basil, mushroom, and olive tapenade",
    priceCents: 1095,
    currency: "USD",
    category: "Appetizers",
    available: true,
    allergens: ["gluten"],
    dietaryTags: ["vegetarian"],
    calories: 310,
  },
  {
    id: "demo-app-03",
    name: "Chicken Wings",
    description: "Crispy wings tossed in your choice of buffalo, BBQ, or garlic parmesan",
    priceCents: 1495,
    currency: "USD",
    category: "Appetizers",
    available: true,
    allergens: ["dairy"],
    calories: 580,
  },
  // Mains
  {
    id: "demo-main-01",
    name: "Grilled Salmon",
    description: "Atlantic salmon fillet with lemon dill sauce, roasted vegetables, and rice pilaf",
    priceCents: 2495,
    currency: "USD",
    category: "Mains",
    available: true,
    allergens: ["fish"],
    dietaryTags: ["gluten-free"],
    calories: 620,
  },
  {
    id: "demo-main-02",
    name: "Classic Cheeseburger",
    description: "Angus beef patty with cheddar, lettuce, tomato, and house-made pickles on a brioche bun",
    priceCents: 1795,
    currency: "USD",
    category: "Mains",
    available: true,
    allergens: ["gluten", "dairy"],
    calories: 850,
  },
  {
    id: "demo-main-03",
    name: "Margherita Pizza",
    description: "Wood-fired pizza with San Marzano tomatoes, fresh mozzarella, and basil",
    priceCents: 1695,
    currency: "USD",
    category: "Mains",
    available: true,
    allergens: ["gluten", "dairy"],
    dietaryTags: ["vegetarian"],
    calories: 720,
  },
  {
    id: "demo-main-04",
    name: "Pasta Primavera",
    description: "Penne with seasonal vegetables in a light garlic olive oil sauce",
    priceCents: 1595,
    currency: "USD",
    category: "Mains",
    available: true,
    allergens: ["gluten"],
    dietaryTags: ["vegan"],
    calories: 540,
  },
  {
    id: "demo-main-05",
    name: "Grilled Ribeye Steak",
    description: "12oz ribeye with garlic butter, mashed potatoes, and seasonal greens",
    priceCents: 3495,
    currency: "USD",
    category: "Mains",
    available: true,
    allergens: ["dairy"],
    dietaryTags: ["gluten-free"],
    calories: 980,
  },
  // Desserts
  {
    id: "demo-des-01",
    name: "Tiramisu",
    description: "Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream",
    priceCents: 995,
    currency: "USD",
    category: "Desserts",
    available: true,
    allergens: ["gluten", "dairy", "eggs"],
    dietaryTags: ["vegetarian"],
    calories: 450,
  },
  {
    id: "demo-des-02",
    name: "Chocolate Lava Cake",
    description: "Warm dark chocolate cake with a molten center, served with vanilla ice cream",
    priceCents: 1095,
    currency: "USD",
    category: "Desserts",
    available: true,
    allergens: ["gluten", "dairy", "eggs"],
    dietaryTags: ["vegetarian"],
    calories: 520,
  },
  // Drinks
  {
    id: "demo-drk-01",
    name: "Fresh Lemonade",
    description: "House-made lemonade with fresh mint",
    priceCents: 495,
    currency: "USD",
    category: "Drinks",
    available: true,
    dietaryTags: ["vegan", "gluten-free"],
    calories: 120,
  },
  {
    id: "demo-drk-02",
    name: "Iced Tea",
    description: "Freshly brewed black tea served over ice with optional sweetener",
    priceCents: 395,
    currency: "USD",
    category: "Drinks",
    available: true,
    dietaryTags: ["vegan", "gluten-free"],
    calories: 5,
  },
];

export class DemoPOSAdapter implements POSAdapter {
  private orders = new Map<string, TrackedOrder>();
  private orderCounter = 1000;

  async getMenuSync(): Promise<POSMenuItem[]> {
    logger.debug("DemoPOSAdapter: returning mock menu", {
      itemCount: MOCK_MENU.length,
    });
    return MOCK_MENU;
  }

  async submitOrder(order: POSOrderInput): Promise<OrderConfirmation> {
    const orderId = crypto.randomUUID();
    const orderNumber = `DEMO-${++this.orderCounter}`;

    const totalCents = order.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );

    const readyMinutes = 20 + Math.floor(Math.random() * 11); // 20-30 min
    const estimatedReadyAt = new Date(
      Date.now() + readyMinutes * 60_000,
    ).toISOString();

    const tracked: TrackedOrder = {
      orderId,
      orderNumber,
      status: "pending",
      estimatedReadyAt,
      createdAt: Date.now(),
      totalCents,
      currency: "USD",
    };

    this.orders.set(orderId, tracked);

    logger.info("DemoPOSAdapter: order submitted", {
      orderId,
      orderNumber,
      totalCents,
      itemCount: order.items.length,
    });

    return {
      orderId,
      orderNumber,
      status: "pending",
      estimatedReadyAt,
      totalCents,
      currency: "USD",
    };
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    const tracked = this.orders.get(orderId);
    if (!tracked) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Simulate progression based on elapsed time
    const elapsedMs = Date.now() - tracked.createdAt;
    const elapsedMin = elapsedMs / 60_000;

    if (tracked.status === "pending" && elapsedMin >= 5) {
      tracked.status = "preparing";
      logger.debug("DemoPOSAdapter: order progressed to preparing", {
        orderId,
      });
    }

    if (tracked.status === "preparing" && elapsedMin >= 15) {
      tracked.status = "ready";
      logger.debug("DemoPOSAdapter: order progressed to ready", { orderId });
    }

    return {
      orderId: tracked.orderId,
      orderNumber: tracked.orderNumber,
      status: tracked.status,
      estimatedReadyAt: tracked.estimatedReadyAt,
      completedAt:
        tracked.status === "completed"
          ? new Date().toISOString()
          : undefined,
    };
  }
}
