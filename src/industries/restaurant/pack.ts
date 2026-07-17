import { z } from "zod/v4";
import type { IndustryPack } from "@/industries/core/industry-pack";

// ─── Zod Schema for Restaurant Onboarding ──────────────────────────────────

const restaurantOnboardingZodSchema = z.object({
  // Step 1: Restaurant Info
  restaurant_name: z.string().min(1).max(200),
  cuisine_type: z.enum([
    "american",
    "italian",
    "mexican",
    "chinese",
    "japanese",
    "indian",
    "french",
    "mediterranean",
    "thai",
    "fusion",
    "other",
  ]),
  phone: z.string().min(10).max(20),
  address: z.string().min(5).max(500),
  website: z.url().optional(),
  seating_capacity: z.number().int().min(1).max(2000),

  // Step 2: Operations
  operating_hours: z.string().min(1),
  reservation_lead_time: z.number().int().min(0).max(10080),
  max_party_size: z.number().int().min(1).max(200),
  takeout_enabled: z.boolean(),
  delivery_enabled: z.boolean(),
  wait_time_notification: z.boolean(),

  // Step 3: Menu Config
  menu_source: z.enum([
    "pdf_upload",
    "manual_entry",
    "pos_integration",
    "website_scrape",
  ]),
  allergen_tracking_enabled: z.boolean(),
  dietary_labels: z
    .array(
      z.enum([
        "vegetarian",
        "vegan",
        "gluten_free",
        "nut_free",
        "dairy_free",
        "halal",
        "kosher",
      ])
    )
    .optional(),
  upsell_suggestions_enabled: z.boolean(),

  // Step 4: Integrations
  pos_system: z.enum([
    "toast",
    "square",
    "clover",
    "revel",
    "lightspeed",
    "custom",
    "none",
  ]),
  reservation_system: z.enum([
    "opentable",
    "resy",
    "yelp_reservations",
    "custom",
    "none",
  ]),
  delivery_platform_integrations: z
    .array(z.string())
    .optional(),
});

// ─── Restaurant Industry Pack ──────────────────────────────────────────────

export const restaurantPack: IndustryPack = {
  id: "restaurant",
  version: "1.0.0",
  displayName: "Restaurant",
  description:
    "AI calling agent for restaurants - reservations, takeout orders, menu inquiries, allergen information, and catering.",

  // ─── Onboarding ────────────────────────────────────────────────────────────
  onboardingSchema: {
    steps: [
      {
        id: "restaurant_info",
        title: "Restaurant Information",
        description:
          "Tell us about your restaurant so the AI agent can represent your brand accurately.",
        fields: [
          {
            id: "restaurant_name",
            label: "Restaurant Name",
            type: "text",
            placeholder: "e.g., Bella Vista Trattoria",
            validation: { required: true, minLength: 1, maxLength: 200 },
          },
          {
            id: "cuisine_type",
            label: "Cuisine Type",
            type: "select",
            description: "Primary cuisine your restaurant serves.",
            options: [
              { value: "american", label: "American" },
              { value: "italian", label: "Italian" },
              { value: "mexican", label: "Mexican" },
              { value: "chinese", label: "Chinese" },
              { value: "japanese", label: "Japanese" },
              { value: "indian", label: "Indian" },
              { value: "french", label: "French" },
              { value: "mediterranean", label: "Mediterranean" },
              { value: "thai", label: "Thai" },
              { value: "fusion", label: "Fusion" },
              { value: "other", label: "Other" },
            ],
            validation: { required: true },
          },
          {
            id: "phone",
            label: "Restaurant Phone Number",
            type: "phone",
            placeholder: "+1 (555) 123-4567",
            validation: { required: true, minLength: 10, maxLength: 20 },
          },
          {
            id: "address",
            label: "Address",
            type: "text",
            placeholder: "123 Main Street, Suite 100, New York, NY 10001",
            validation: { required: true, minLength: 5, maxLength: 500 },
          },
          {
            id: "website",
            label: "Website",
            type: "url",
            placeholder: "https://www.myrestaurant.com",
            validation: { required: false },
          },
          {
            id: "seating_capacity",
            label: "Seating Capacity",
            type: "number",
            description: "Total number of seats in your restaurant.",
            placeholder: "80",
            validation: { required: true, min: 1, max: 2000 },
          },
        ],
      },
      {
        id: "operations",
        title: "Operations & Policies",
        description:
          "Configure how the AI handles reservations, orders, and wait times.",
        fields: [
          {
            id: "operating_hours",
            label: "Operating Hours",
            type: "textarea",
            description:
              "Describe your operating hours, including different hours for different days.",
            placeholder:
              "Mon-Thu: 11am-9pm, Fri-Sat: 11am-11pm, Sun: 10am-8pm (Brunch until 2pm)",
            validation: { required: true, minLength: 1 },
          },
          {
            id: "reservation_lead_time",
            label: "Minimum Reservation Lead Time (minutes)",
            type: "number",
            description:
              "How far in advance must a reservation be made? (0 = walk-ins accepted for reservations)",
            placeholder: "30",
            validation: { required: true, min: 0, max: 10080 },
            defaultValue: 30,
          },
          {
            id: "max_party_size",
            label: "Maximum Party Size",
            type: "number",
            description:
              "Largest party size you can accommodate for a reservation.",
            placeholder: "12",
            validation: { required: true, min: 1, max: 200 },
            defaultValue: 12,
          },
          {
            id: "takeout_enabled",
            label: "Takeout Available",
            type: "boolean",
            description: "Does your restaurant offer takeout orders?",
            validation: { required: true },
            defaultValue: true,
          },
          {
            id: "delivery_enabled",
            label: "Delivery Available",
            type: "boolean",
            description: "Does your restaurant offer delivery?",
            validation: { required: true },
            defaultValue: false,
          },
          {
            id: "wait_time_notification",
            label: "Wait Time Notifications",
            type: "boolean",
            description:
              "Should the AI provide estimated wait times to callers?",
            validation: { required: true },
            defaultValue: true,
          },
        ],
      },
      {
        id: "menu_config",
        title: "Menu Configuration",
        description:
          "Set up your menu source and dietary/allergen tracking preferences.",
        fields: [
          {
            id: "menu_source",
            label: "Menu Source",
            type: "select",
            description: "How should the AI access your menu?",
            options: [
              {
                value: "pdf_upload",
                label: "PDF Upload",
                description: "Upload a PDF of your current menu.",
              },
              {
                value: "manual_entry",
                label: "Manual Entry",
                description: "Enter menu items one by one.",
              },
              {
                value: "pos_integration",
                label: "POS Integration",
                description:
                  "Sync menu directly from your POS system.",
              },
              {
                value: "website_scrape",
                label: "Website Scrape",
                description:
                  "Pull menu data from your website automatically.",
              },
            ],
            validation: { required: true },
          },
          {
            id: "allergen_tracking_enabled",
            label: "Allergen Tracking",
            type: "boolean",
            description:
              "Enable detailed allergen information for each menu item.",
            validation: { required: true },
            defaultValue: true,
          },
          {
            id: "dietary_labels",
            label: "Dietary Labels",
            type: "multi_select",
            description:
              "Which dietary labels do you track on your menu?",
            options: [
              { value: "vegetarian", label: "Vegetarian" },
              { value: "vegan", label: "Vegan" },
              { value: "gluten_free", label: "Gluten Free" },
              { value: "nut_free", label: "Nut Free" },
              { value: "dairy_free", label: "Dairy Free" },
              { value: "halal", label: "Halal" },
              { value: "kosher", label: "Kosher" },
            ],
            validation: { required: false },
          },
          {
            id: "upsell_suggestions_enabled",
            label: "Upsell Suggestions",
            type: "boolean",
            description:
              "Allow the AI to suggest appetizers, desserts, or drink pairings.",
            validation: { required: true },
            defaultValue: true,
          },
        ],
      },
      {
        id: "integrations",
        title: "System Integrations",
        description:
          "Connect your restaurant's existing systems for seamless operation.",
        fields: [
          {
            id: "pos_system",
            label: "POS System",
            type: "select",
            description: "Which point-of-sale system do you use?",
            options: [
              { value: "toast", label: "Toast" },
              { value: "square", label: "Square" },
              { value: "clover", label: "Clover" },
              { value: "revel", label: "Revel" },
              { value: "lightspeed", label: "Lightspeed" },
              { value: "custom", label: "Custom / Other" },
              { value: "none", label: "None" },
            ],
            validation: { required: true },
          },
          {
            id: "reservation_system",
            label: "Reservation System",
            type: "select",
            description:
              "Which reservation platform do you use?",
            options: [
              { value: "opentable", label: "OpenTable" },
              { value: "resy", label: "Resy" },
              {
                value: "yelp_reservations",
                label: "Yelp Reservations",
              },
              { value: "custom", label: "Custom / In-House" },
              { value: "none", label: "None" },
            ],
            validation: { required: true },
          },
          {
            id: "delivery_platform_integrations",
            label: "Delivery Platforms",
            type: "multi_select",
            description:
              "Which delivery platforms are you connected to?",
            options: [
              { value: "doordash", label: "DoorDash" },
              { value: "ubereats", label: "Uber Eats" },
              { value: "grubhub", label: "Grubhub" },
              { value: "postmates", label: "Postmates" },
              { value: "caviar", label: "Caviar" },
              { value: "in_house", label: "In-House Delivery" },
            ],
            validation: { required: false },
            dependsOn: {
              fieldId: "delivery_enabled",
              operator: "eq",
              value: "true",
            },
          },
        ],
      },
    ],
    zodSchema: restaurantOnboardingZodSchema,
  },

  // ─── Intent Catalog ────────────────────────────────────────────────────────
  intentCatalog: [
    {
      id: "create_reservation",
      name: "Create Reservation",
      description:
        "Caller wants to book a table at the restaurant for a specific date, time, and party size.",
      category: "scheduling",
      priority: 1,
      slots: [
        {
          name: "guest_name",
          type: "string",
          required: true,
          description: "Name the reservation will be under.",
          extractionHint: "Listen for 'under the name' or 'for [Name]'.",
          confirmationRequired: true,
        },
        {
          name: "party_size",
          type: "number",
          required: true,
          description: "Number of guests in the party.",
          extractionHint: "Listen for 'table for X' or 'X people'.",
          confirmationRequired: true,
        },
        {
          name: "date",
          type: "date",
          required: true,
          description: "Date of the reservation.",
          extractionHint:
            "Listen for specific dates, 'tonight', 'tomorrow', or day names.",
          confirmationRequired: true,
        },
        {
          name: "time",
          type: "time",
          required: true,
          description: "Preferred time for the reservation.",
          extractionHint: "Listen for specific times like '7pm' or 'around 8'.",
          confirmationRequired: true,
        },
        {
          name: "special_requests",
          type: "string",
          required: false,
          description:
            "Any special requests like high chair, booth, patio seating, anniversary celebration.",
          extractionHint:
            "Listen for 'we need a', 'can we get', 'it is our', 'celebrating'.",
        },
        {
          name: "phone_number",
          type: "phone",
          required: true,
          description: "Contact phone number for the reservation.",
          confirmationRequired: true,
        },
      ],
      examples: [
        {
          text: "Hi, I'd like to make a reservation for four people this Saturday at 7pm, under the name Johnson.",
          slots: {
            guest_name: "Johnson",
            party_size: 4,
            date: "this Saturday",
            time: "7pm",
          },
        },
        {
          text: "Can I book a table for two tomorrow night around 8 o'clock? It's our anniversary.",
          slots: {
            party_size: 2,
            date: "tomorrow",
            time: "8pm",
            special_requests: "anniversary",
          },
        },
        {
          text: "I need a reservation for a party of six on Friday, December 20th at 6:30.",
          slots: {
            party_size: 6,
            date: "December 20th",
            time: "6:30pm",
          },
        },
      ],
      requiredPolicies: ["capacity_check"],
      followUpIntents: ["modify_reservation", "cancel_reservation"],
      maxTurns: 8,
    },
    {
      id: "modify_reservation",
      name: "Modify Reservation",
      description:
        "Caller wants to change an existing reservation's date, time, or party size.",
      category: "scheduling",
      priority: 2,
      slots: [
        {
          name: "guest_name",
          type: "string",
          required: true,
          description: "Name the original reservation is under.",
          confirmationRequired: true,
        },
        {
          name: "original_date",
          type: "date",
          required: true,
          description: "Date of the existing reservation.",
        },
        {
          name: "original_time",
          type: "time",
          required: true,
          description: "Time of the existing reservation.",
        },
        {
          name: "new_date",
          type: "date",
          required: false,
          description: "New date for the reservation, if changing.",
        },
        {
          name: "new_time",
          type: "time",
          required: false,
          description: "New time for the reservation, if changing.",
        },
        {
          name: "new_party_size",
          type: "number",
          required: false,
          description: "New party size, if changing.",
        },
      ],
      examples: [
        {
          text: "I have a reservation for tonight at 7 under Smith, but I need to push it to 8:30.",
          slots: {
            guest_name: "Smith",
            original_date: "tonight",
            original_time: "7pm",
            new_time: "8:30pm",
          },
        },
        {
          text: "Can I change my reservation from Friday to Saturday? Same time, but we'll have two extra people. It's under Garcia.",
          slots: {
            guest_name: "Garcia",
            original_date: "Friday",
            new_date: "Saturday",
            new_party_size: 2,
          },
        },
      ],
      requiredPolicies: ["capacity_check"],
      followUpIntents: ["cancel_reservation"],
      maxTurns: 6,
    },
    {
      id: "cancel_reservation",
      name: "Cancel Reservation",
      description:
        "Caller wants to cancel an existing reservation.",
      category: "scheduling",
      priority: 3,
      slots: [
        {
          name: "guest_name",
          type: "string",
          required: true,
          description: "Name the reservation is under.",
          confirmationRequired: true,
        },
        {
          name: "reservation_date",
          type: "date",
          required: true,
          description: "Date of the reservation to cancel.",
        },
        {
          name: "reservation_time",
          type: "time",
          required: true,
          description: "Time of the reservation to cancel.",
        },
        {
          name: "cancellation_reason",
          type: "string",
          required: false,
          description: "Reason for cancellation (optional).",
        },
      ],
      examples: [
        {
          text: "I need to cancel my reservation for tomorrow night. It's under Williams, the 7pm booking.",
          slots: {
            guest_name: "Williams",
            reservation_date: "tomorrow",
            reservation_time: "7pm",
          },
        },
        {
          text: "Hi, please cancel the reservation under Chen for Saturday at 6. Something came up.",
          slots: {
            guest_name: "Chen",
            reservation_date: "Saturday",
            reservation_time: "6pm",
            cancellation_reason: "Something came up",
          },
        },
      ],
      requiredPolicies: [],
      maxTurns: 4,
    },
    {
      id: "place_order",
      name: "Place Order",
      description:
        "Caller wants to place a takeout, delivery, or dine-in order.",
      category: "transaction",
      priority: 1,
      slots: [
        {
          name: "order_items",
          type: "string",
          required: true,
          description:
            "Items the caller wants to order, including quantities and modifications.",
          extractionHint:
            "Listen for item names, quantities, and modifiers like 'no onions' or 'extra cheese'.",
        },
        {
          name: "special_instructions",
          type: "string",
          required: false,
          description:
            "Any special instructions for the order (e.g., extra napkins, utensils).",
        },
        {
          name: "order_type",
          type: "enum",
          required: true,
          description: "Whether the order is dine-in, takeout, or delivery.",
          enumValues: ["dine_in", "takeout", "delivery"],
          extractionHint:
            "Listen for 'pickup', 'carry out', 'deliver', 'eating here'.",
          confirmationRequired: true,
        },
        {
          name: "delivery_address",
          type: "string",
          required: false,
          description:
            "Delivery address, required only for delivery orders.",
          extractionHint: "Only needed when order_type is delivery.",
        },
        {
          name: "payment_method",
          type: "enum",
          required: false,
          description: "How the caller intends to pay.",
          enumValues: ["cash", "credit_card", "pay_at_pickup", "online"],
        },
      ],
      examples: [
        {
          text: "I'd like to order two large pepperoni pizzas and a Caesar salad for pickup.",
          slots: {
            order_items: "2 large pepperoni pizzas, 1 Caesar salad",
            order_type: "takeout",
          },
        },
        {
          text: "Can I get the chicken parmesan, a side of garlic bread, and a tiramisu delivered to 45 Oak Street?",
          slots: {
            order_items:
              "1 chicken parmesan, 1 garlic bread, 1 tiramisu",
            order_type: "delivery",
            delivery_address: "45 Oak Street",
          },
        },
        {
          text: "I want to place a takeout order: pad thai with shrimp, no peanuts, and two spring rolls.",
          slots: {
            order_items: "1 pad thai with shrimp, 2 spring rolls",
            special_instructions: "no peanuts",
            order_type: "takeout",
          },
        },
      ],
      requiredPolicies: [
        "order_confirmation",
        "price_accuracy",
        "alcohol_policy",
      ],
      maxTurns: 10,
    },
    {
      id: "menu_inquiry",
      name: "Menu Inquiry",
      description:
        "Caller has questions about the menu, dishes, prices, or dietary options.",
      category: "inquiry",
      priority: 4,
      slots: [
        {
          name: "menu_section",
          type: "string",
          required: false,
          description:
            "Section of the menu the caller is asking about (appetizers, entrees, desserts, drinks).",
        },
        {
          name: "dietary_restriction",
          type: "string",
          required: false,
          description:
            "Any dietary restriction the caller wants to filter by.",
        },
        {
          name: "dish_name",
          type: "string",
          required: false,
          description: "Specific dish the caller is asking about.",
        },
      ],
      examples: [
        {
          text: "What vegetarian options do you have for entrees?",
          slots: {
            menu_section: "entrees",
            dietary_restriction: "vegetarian",
          },
        },
        {
          text: "How much is the lobster bisque?",
          slots: { dish_name: "lobster bisque" },
        },
        {
          text: "Do you have any gluten-free desserts?",
          slots: {
            menu_section: "desserts",
            dietary_restriction: "gluten_free",
          },
        },
      ],
      requiredPolicies: ["price_accuracy"],
      followUpIntents: ["place_order", "allergen_inquiry"],
      maxTurns: 6,
    },
    {
      id: "allergen_inquiry",
      name: "Allergen Inquiry",
      description:
        "Caller has questions about allergens or ingredients in specific dishes. Safety-critical intent.",
      category: "inquiry",
      priority: 1,
      slots: [
        {
          name: "dish_name",
          type: "string",
          required: true,
          description: "The dish the caller is asking about.",
          extractionHint:
            "Listen for specific dish names or descriptions.",
        },
        {
          name: "allergen_type",
          type: "string",
          required: true,
          description:
            "The allergen the caller is concerned about (nuts, shellfish, gluten, dairy, soy, eggs, etc.).",
          extractionHint:
            "Listen for allergen names or phrases like 'allergic to', 'can't eat'.",
        },
        {
          name: "severity",
          type: "enum",
          required: false,
          description:
            "How severe the allergy is, if mentioned.",
          enumValues: ["mild", "moderate", "severe", "anaphylactic"],
          extractionHint:
            "Listen for 'severe', 'life-threatening', 'anaphylactic', or 'epipen'.",
        },
      ],
      examples: [
        {
          text: "Does the pad thai contain peanuts? My daughter has a severe peanut allergy.",
          slots: {
            dish_name: "pad thai",
            allergen_type: "peanuts",
            severity: "severe",
          },
        },
        {
          text: "I'm lactose intolerant - is there dairy in the mushroom risotto?",
          slots: {
            dish_name: "mushroom risotto",
            allergen_type: "dairy",
          },
        },
        {
          text: "We have a guest with a shellfish allergy. Can you tell me which dishes are safe?",
          slots: { allergen_type: "shellfish" },
        },
      ],
      requiredPolicies: [
        "allergen_disclosure",
        "no_medical_allergen_advice",
      ],
      followUpIntents: ["menu_inquiry", "place_order"],
      maxTurns: 6,
    },
    {
      id: "catering_inquiry",
      name: "Catering Inquiry",
      description:
        "Caller is interested in catering services for an event.",
      category: "inquiry",
      priority: 3,
      slots: [
        {
          name: "event_date",
          type: "date",
          required: false,
          description: "When the event is taking place.",
        },
        {
          name: "guest_count",
          type: "number",
          required: false,
          description: "Approximate number of guests to be served.",
        },
        {
          name: "budget_range",
          type: "string",
          required: false,
          description:
            "Budget range for catering (e.g., '$500-$1000').",
        },
        {
          name: "event_type",
          type: "string",
          required: false,
          description:
            "Type of event (wedding, corporate, birthday, etc.).",
        },
        {
          name: "dietary_needs",
          type: "string",
          required: false,
          description:
            "Any dietary requirements for the group.",
        },
      ],
      examples: [
        {
          text: "Do you do catering? We're planning a corporate lunch for about 50 people next month.",
          slots: {
            event_type: "corporate lunch",
            guest_count: 50,
            event_date: "next month",
          },
        },
        {
          text: "I'm looking into catering for my wedding reception, around 120 guests, and we need vegetarian and halal options.",
          slots: {
            event_type: "wedding reception",
            guest_count: 120,
            dietary_needs: "vegetarian, halal",
          },
        },
      ],
      requiredPolicies: [],
      followUpIntents: ["human_transfer"],
      maxTurns: 8,
    },
    {
      id: "complaint",
      name: "Complaint",
      description:
        "Caller is reporting a complaint about food, service, or experience.",
      category: "support",
      priority: 2,
      slots: [
        {
          name: "complaint_type",
          type: "enum",
          required: true,
          description: "Category of the complaint.",
          enumValues: [
            "food_quality",
            "service",
            "wait_time",
            "billing",
            "cleanliness",
            "order_error",
            "other",
          ],
          extractionHint:
            "Classify based on what the caller describes.",
        },
        {
          name: "order_reference",
          type: "string",
          required: false,
          description:
            "Order number or reference, if applicable.",
        },
        {
          name: "details",
          type: "string",
          required: true,
          description: "Details of the complaint.",
        },
        {
          name: "desired_resolution",
          type: "string",
          required: false,
          description:
            "What outcome the caller is looking for (refund, replacement, apology).",
          extractionHint: "Listen for 'I want', 'I'd like', 'can you'.",
        },
      ],
      examples: [
        {
          text: "I ordered delivery last night and the food arrived cold and the order was wrong. I got a burger instead of the salmon I ordered.",
          slots: {
            complaint_type: "order_error",
            details:
              "Food arrived cold, received burger instead of salmon",
          },
        },
        {
          text: "We waited over an hour for our food last night and the waiter was incredibly rude. I want to speak to the manager.",
          slots: {
            complaint_type: "service",
            details:
              "Waited over an hour, rude waiter",
            desired_resolution: "speak to manager",
          },
        },
        {
          text: "I was charged twice on my credit card for dinner last Saturday. Order number 4521.",
          slots: {
            complaint_type: "billing",
            order_reference: "4521",
            details: "Charged twice on credit card",
            desired_resolution: "refund",
          },
        },
      ],
      requiredPolicies: ["complaint_escalation"],
      followUpIntents: ["human_transfer"],
      maxTurns: 8,
    },
    {
      id: "hours_inquiry",
      name: "Hours Inquiry",
      description:
        "Caller is asking about the restaurant's operating hours or holiday schedule.",
      category: "inquiry",
      priority: 5,
      slots: [
        {
          name: "day_of_week",
          type: "string",
          required: false,
          description:
            "Specific day the caller is asking about.",
        },
        {
          name: "specific_date",
          type: "date",
          required: false,
          description:
            "Specific date the caller wants hours for (e.g., a holiday).",
        },
      ],
      examples: [
        {
          text: "What time do you close on Sundays?",
          slots: { day_of_week: "Sunday" },
        },
        {
          text: "Are you open on Christmas Eve?",
          slots: { specific_date: "Christmas Eve" },
        },
        {
          text: "What are your hours?",
        },
      ],
      requiredPolicies: [],
      maxTurns: 3,
    },
    {
      id: "human_transfer",
      name: "Transfer to Human",
      description:
        "Caller explicitly requests to speak with a human or manager.",
      category: "transfer",
      priority: 1,
      slots: [
        {
          name: "reason",
          type: "string",
          required: false,
          description: "Reason the caller wants a human.",
        },
        {
          name: "urgency",
          type: "enum",
          required: false,
          description: "How urgent the transfer request is.",
          enumValues: ["low", "medium", "high", "emergency"],
        },
      ],
      examples: [
        {
          text: "Can I speak to the manager, please?",
          slots: { reason: "wants manager", urgency: "medium" },
        },
        {
          text: "I'd rather talk to a real person about this.",
          slots: { reason: "prefers human", urgency: "low" },
        },
      ],
      requiredPolicies: [],
      maxTurns: 2,
    },
  ],

  // ─── Outcome Schemas ───────────────────────────────────────────────────────
  outcomeSchemas: [
    {
      intentId: "create_reservation",
      successFields: [
        {
          name: "reservation_id",
          type: "string",
          required: true,
          description: "Unique identifier for the reservation.",
        },
        {
          name: "confirmed_date",
          type: "date",
          required: true,
          description: "Confirmed date of the reservation.",
        },
        {
          name: "confirmed_time",
          type: "time",
          required: true,
          description: "Confirmed time of the reservation.",
        },
        {
          name: "confirmed_party_size",
          type: "number",
          required: true,
          description: "Confirmed party size.",
        },
      ],
      failureReasons: [
        "no_availability",
        "exceeds_capacity",
        "outside_operating_hours",
        "too_short_lead_time",
        "restaurant_closed",
      ],
    },
    {
      intentId: "place_order",
      successFields: [
        {
          name: "order_id",
          type: "string",
          required: true,
          description: "Unique identifier for the order.",
        },
        {
          name: "estimated_time",
          type: "string",
          required: true,
          description: "Estimated preparation or delivery time.",
        },
        {
          name: "order_total",
          type: "number",
          required: true,
          description: "Total price of the order.",
        },
      ],
      failureReasons: [
        "item_unavailable",
        "kitchen_closed",
        "delivery_area_exceeded",
        "minimum_order_not_met",
      ],
    },
    {
      intentId: "modify_reservation",
      successFields: [
        {
          name: "reservation_id",
          type: "string",
          required: true,
          description: "Reservation identifier.",
        },
        {
          name: "new_date",
          type: "date",
          required: false,
          description: "Updated date, if changed.",
        },
        {
          name: "new_time",
          type: "time",
          required: false,
          description: "Updated time, if changed.",
        },
      ],
      failureReasons: [
        "reservation_not_found",
        "no_availability",
        "exceeds_capacity",
      ],
    },
    {
      intentId: "cancel_reservation",
      successFields: [
        {
          name: "reservation_id",
          type: "string",
          required: true,
          description: "Cancelled reservation identifier.",
        },
        {
          name: "cancelled_at",
          type: "datetime",
          required: true,
          description: "Timestamp of the cancellation.",
        },
      ],
      failureReasons: [
        "reservation_not_found",
        "already_cancelled",
        "past_reservation",
      ],
    },
    {
      intentId: "allergen_inquiry",
      successFields: [
        {
          name: "dish_name",
          type: "string",
          required: true,
          description: "Dish that was checked.",
        },
        {
          name: "allergens_found",
          type: "array",
          required: true,
          description: "List of allergens present in the dish.",
        },
        {
          name: "safe_alternatives",
          type: "array",
          required: false,
          description: "Suggested allergen-free alternatives.",
        },
      ],
      failureReasons: [
        "dish_not_found",
        "allergen_data_unavailable",
      ],
    },
  ],

  // ─── Policies ──────────────────────────────────────────────────────────────
  policyPack: [
    {
      id: "allergen_disclosure",
      name: "Allergen Disclosure",
      description:
        "Always provide allergen warnings when a caller asks about allergens in any dish.",
      category: "compliance",
      severity: "block",
      conditions: [
        {
          field: "intent",
          operator: "eq",
          value: "allergen_inquiry",
        },
      ],
      action: "allow",
      reason:
        "Food allergen disclosure is required by law in many jurisdictions. The agent must always provide accurate allergen information when asked.",
      overridable: false,
    },
    {
      id: "no_medical_allergen_advice",
      name: "No Medical Allergen Advice",
      description:
        "The AI must not provide medical advice about allergies, reactions, or treatments.",
      category: "safety",
      severity: "block",
      conditions: [
        {
          field: "response_contains",
          operator: "matches",
          value: "medical|treatment|antihistamine|epipen|hospital|emergency room",
        },
      ],
      action: "deny",
      reason:
        "The AI is not a medical professional and must not give medical advice. Recommend the caller contact a medical professional or call emergency services if needed.",
      overridable: false,
    },
    {
      id: "price_accuracy",
      name: "Price Accuracy",
      description:
        "Only quote prices that come from verified, up-to-date menu data.",
      category: "business",
      severity: "warn",
      conditions: [
        {
          field: "response_contains_price",
          operator: "eq",
          value: true,
        },
      ],
      action: "modify",
      reason:
        "Quoting incorrect prices can lead to customer disputes and legal issues. Always pull prices from the menu database, never estimate.",
      overridable: true,
    },
    {
      id: "alcohol_policy",
      name: "Alcohol Policy",
      description:
        "Do not process orders containing alcohol without confirming age verification.",
      category: "compliance",
      severity: "block",
      conditions: [
        {
          field: "order_contains_alcohol",
          operator: "eq",
          value: true,
        },
      ],
      action: "deny",
      reason:
        "Alcohol sales require age verification. The agent must confirm the caller is of legal drinking age before adding alcoholic items to an order.",
      regulation: "State liquor laws / TTB regulations",
      overridable: false,
    },
    {
      id: "complaint_escalation",
      name: "Complaint Escalation",
      description:
        "Escalate serious complaints or upset callers to a manager immediately.",
      category: "operational",
      severity: "warn",
      conditions: [
        {
          field: "sentiment",
          operator: "in",
          value: ["angry", "frustrated", "threatening"],
        },
      ],
      action: "escalate",
      reason:
        "Serious complaints are better handled by a human manager who can offer appropriate remedies and ensure customer retention.",
      overridable: true,
    },
    {
      id: "capacity_check",
      name: "Capacity Check",
      description:
        "Deny reservations that exceed the restaurant's maximum capacity or party size limit.",
      category: "business",
      severity: "block",
      conditions: [
        {
          field: "party_size",
          operator: "gt",
          value: "config.max_party_size",
        },
      ],
      action: "deny",
      reason:
        "Cannot accept reservations for parties larger than the configured maximum. Suggest the caller contact the restaurant directly for special arrangements.",
      overridable: false,
    },
    {
      id: "order_confirmation",
      name: "Order Confirmation",
      description:
        "Always read back the full order and get explicit confirmation before submitting.",
      category: "business",
      severity: "warn",
      conditions: [
        {
          field: "intent",
          operator: "eq",
          value: "place_order",
        },
      ],
      action: "modify",
      reason:
        "Order errors are costly and frustrating. Confirming the order reduces mistakes and improves customer satisfaction.",
      overridable: true,
    },
  ],

  // ─── Escalation Rules ──────────────────────────────────────────────────────
  escalationRules: [
    {
      id: "food_safety_emergency",
      name: "Food Safety Emergency",
      trigger: "keyword_detected",
      triggerConfig: {
        keywords: "allergic reaction,food poisoning,choking,anaphylaxis,epipen,can't breathe",
      },
      priority: 0,
      action: "transfer_human",
      message:
        "I'm connecting you with a manager right away. If this is a medical emergency, please call 911 immediately.",
      cooldownSeconds: 0,
    },
    {
      id: "caller_requests_manager",
      name: "Caller Requests Manager",
      trigger: "caller_request",
      triggerConfig: {
        phrases: "speak to manager,talk to someone,real person,human,supervisor",
      },
      priority: 1,
      action: "transfer_human",
      department: "management",
      message:
        "Of course, let me transfer you to a manager. One moment please.",
    },
    {
      id: "angry_complaint",
      name: "Complaint with Angry Sentiment",
      trigger: "sentiment_negative",
      triggerConfig: {
        threshold: 0.8,
        requiredIntent: "complaint",
      },
      priority: 2,
      action: "transfer_human",
      department: "management",
      message:
        "I understand your frustration and I want to make sure this is handled properly. Let me connect you with a manager.",
      cooldownSeconds: 30,
    },
    {
      id: "large_catering_inquiry",
      name: "Large Catering Inquiry",
      trigger: "policy_violation",
      triggerConfig: {
        policyId: "catering_threshold",
        guestCountThreshold: 50,
      },
      priority: 3,
      action: "transfer_human",
      department: "catering",
      message:
        "For catering inquiries of this size, let me connect you with our catering coordinator who can give you personalized attention.",
    },
    {
      id: "max_turns_exceeded",
      name: "Maximum Turns Exceeded",
      trigger: "max_turns_exceeded",
      triggerConfig: {
        maxTurns: 12,
      },
      priority: 4,
      action: "transfer_human",
      message:
        "I want to make sure you get the help you need. Let me connect you with a team member who can assist you further.",
    },
  ],

  // ─── Tools ─────────────────────────────────────────────────────────────────
  tools: [
    {
      id: "check_table_availability",
      name: "Check Table Availability",
      description:
        "Check available tables for a given date, time, and party size.",
      intentIds: ["create_reservation", "modify_reservation"],
      parameters: [
        {
          name: "date",
          type: "string",
          required: true,
          description: "Date to check availability for (ISO 8601).",
        },
        {
          name: "time",
          type: "string",
          required: true,
          description: "Time to check availability for (HH:MM).",
        },
        {
          name: "party_size",
          type: "number",
          required: true,
          description: "Number of guests.",
        },
      ],
      returnType: "{ available: boolean; alternatives: { time: string; capacity: number }[] }",
      requiresAuth: true,
      timeout: 5000,
      retryConfig: { maxRetries: 2, backoffMs: 1000 },
    },
    {
      id: "create_reservation",
      name: "Create Reservation",
      description:
        "Create a new reservation in the reservation system.",
      intentIds: ["create_reservation"],
      parameters: [
        {
          name: "guest_name",
          type: "string",
          required: true,
          description: "Name for the reservation.",
        },
        {
          name: "party_size",
          type: "number",
          required: true,
          description: "Number of guests.",
        },
        {
          name: "date",
          type: "string",
          required: true,
          description: "Reservation date (ISO 8601).",
        },
        {
          name: "time",
          type: "string",
          required: true,
          description: "Reservation time (HH:MM).",
        },
        {
          name: "phone",
          type: "string",
          required: true,
          description: "Contact phone number.",
        },
        {
          name: "special_requests",
          type: "string",
          required: false,
          description: "Special requests or notes.",
        },
      ],
      returnType: "{ reservation_id: string; confirmed: boolean; confirmation_message: string }",
      requiresAuth: true,
      timeout: 10000,
      retryConfig: { maxRetries: 1, backoffMs: 2000 },
    },
    {
      id: "modify_reservation",
      name: "Modify Reservation",
      description:
        "Modify an existing reservation's date, time, or party size.",
      intentIds: ["modify_reservation"],
      parameters: [
        {
          name: "guest_name",
          type: "string",
          required: true,
          description: "Name the reservation is under.",
        },
        {
          name: "original_date",
          type: "string",
          required: true,
          description: "Original reservation date.",
        },
        {
          name: "original_time",
          type: "string",
          required: true,
          description: "Original reservation time.",
        },
        {
          name: "new_date",
          type: "string",
          required: false,
          description: "New date, if changing.",
        },
        {
          name: "new_time",
          type: "string",
          required: false,
          description: "New time, if changing.",
        },
        {
          name: "new_party_size",
          type: "number",
          required: false,
          description: "New party size, if changing.",
        },
      ],
      returnType: "{ reservation_id: string; updated: boolean; new_details: Record<string, string | number> }",
      requiresAuth: true,
      timeout: 10000,
      retryConfig: { maxRetries: 1, backoffMs: 2000 },
    },
    {
      id: "cancel_reservation",
      name: "Cancel Reservation",
      description: "Cancel an existing reservation.",
      intentIds: ["cancel_reservation"],
      parameters: [
        {
          name: "guest_name",
          type: "string",
          required: true,
          description: "Name the reservation is under.",
        },
        {
          name: "reservation_date",
          type: "string",
          required: true,
          description: "Date of the reservation.",
        },
        {
          name: "reservation_time",
          type: "string",
          required: true,
          description: "Time of the reservation.",
        },
      ],
      returnType: "{ cancelled: boolean; reservation_id: string }",
      requiresAuth: true,
      timeout: 5000,
    },
    {
      id: "get_menu",
      name: "Get Menu",
      description:
        "Retrieve menu items, optionally filtered by section or dietary label.",
      intentIds: ["menu_inquiry", "place_order", "allergen_inquiry"],
      parameters: [
        {
          name: "section",
          type: "string",
          required: false,
          description:
            "Menu section to filter by (appetizers, entrees, desserts, drinks, sides).",
        },
        {
          name: "dietary_filter",
          type: "string",
          required: false,
          description: "Dietary label to filter by.",
        },
        {
          name: "search_query",
          type: "string",
          required: false,
          description: "Free-text search for dish names.",
        },
      ],
      returnType: "{ items: { name: string; description: string; price: number; section: string; dietary_labels: string[]; allergens: string[] }[] }",
      requiresAuth: false,
      timeout: 3000,
      retryConfig: { maxRetries: 2, backoffMs: 500 },
    },
    {
      id: "check_allergens",
      name: "Check Allergens",
      description:
        "Check allergen information for a specific dish.",
      intentIds: ["allergen_inquiry"],
      parameters: [
        {
          name: "dish_name",
          type: "string",
          required: true,
          description: "Name of the dish to check.",
        },
      ],
      returnType: "{ dish: string; allergens: { allergen: string; severity: string; cross_contamination_risk: boolean }[]; safe_alternatives: string[] }",
      requiresAuth: false,
      timeout: 3000,
      retryConfig: { maxRetries: 2, backoffMs: 500 },
    },
    {
      id: "submit_order",
      name: "Submit Order",
      description:
        "Submit a confirmed order to the kitchen/POS system.",
      intentIds: ["place_order"],
      parameters: [
        {
          name: "items",
          type: "array",
          required: true,
          description:
            "Array of order items with name, quantity, and modifications.",
        },
        {
          name: "order_type",
          type: "string",
          required: true,
          description: "dine_in, takeout, or delivery.",
        },
        {
          name: "special_instructions",
          type: "string",
          required: false,
          description: "Special instructions for the order.",
        },
        {
          name: "delivery_address",
          type: "string",
          required: false,
          description: "Delivery address (required for delivery orders).",
        },
        {
          name: "customer_phone",
          type: "string",
          required: true,
          description: "Customer phone number for order updates.",
        },
      ],
      returnType: "{ order_id: string; estimated_time_minutes: number; total: number; status: string }",
      requiresAuth: true,
      timeout: 15000,
      retryConfig: { maxRetries: 1, backoffMs: 3000 },
    },
    {
      id: "get_wait_time",
      name: "Get Wait Time",
      description:
        "Get the current estimated wait time for walk-ins or orders.",
      intentIds: ["hours_inquiry", "create_reservation"],
      parameters: [
        {
          name: "type",
          type: "string",
          required: true,
          description: "Type of wait: 'walk_in' or 'order'.",
        },
      ],
      returnType: "{ estimated_minutes: number; busy_level: string }",
      requiresAuth: false,
      timeout: 2000,
    },
    {
      id: "transfer_call",
      name: "Transfer Call",
      description:
        "Transfer the call to a human agent, manager, or specific department.",
      intentIds: ["human_transfer", "complaint"],
      parameters: [
        {
          name: "department",
          type: "string",
          required: true,
          description:
            "Department or role to transfer to (manager, host, kitchen, catering).",
        },
        {
          name: "reason",
          type: "string",
          required: true,
          description: "Reason for the transfer.",
        },
        {
          name: "context_summary",
          type: "string",
          required: false,
          description:
            "Summary of the conversation so far for the receiving agent.",
        },
      ],
      returnType: "{ transferred: boolean; wait_time_seconds: number }",
      requiresAuth: true,
      timeout: 30000,
    },
  ],

  // ─── Knowledge Schema ──────────────────────────────────────────────────────
  knowledgeSchema: {
    categories: [
      {
        id: "menu",
        name: "Menu",
        description:
          "Full menu with items, descriptions, prices, dietary labels, and allergen information.",
        fields: [
          {
            name: "menu_items",
            type: "structured",
            description:
              "Structured menu data with sections, items, prices, and descriptions.",
            required: true,
            maxTokens: 8000,
          },
          {
            name: "daily_specials",
            type: "text",
            description: "Current daily or rotating specials.",
            required: false,
            maxTokens: 1000,
          },
          {
            name: "seasonal_menu",
            type: "text",
            description: "Seasonal or limited-time menu items.",
            required: false,
            maxTokens: 2000,
          },
        ],
      },
      {
        id: "allergens",
        name: "Allergens",
        description:
          "Allergen information for every menu item, including cross-contamination risks.",
        fields: [
          {
            name: "allergen_matrix",
            type: "table",
            description:
              "Matrix of dishes and their allergen content (nuts, dairy, gluten, shellfish, soy, eggs, etc.).",
            required: true,
            maxTokens: 4000,
          },
          {
            name: "cross_contamination_notes",
            type: "text",
            description:
              "Notes about shared kitchen equipment and cross-contamination risks.",
            required: true,
            maxTokens: 1000,
          },
        ],
      },
      {
        id: "hours_and_location",
        name: "Hours & Location",
        description:
          "Operating hours, holiday schedule, address, parking, and accessibility information.",
        fields: [
          {
            name: "regular_hours",
            type: "structured",
            description: "Regular weekly operating hours.",
            required: true,
            maxTokens: 500,
          },
          {
            name: "holiday_hours",
            type: "structured",
            description: "Holiday and special-occasion hours.",
            required: false,
            maxTokens: 1000,
          },
          {
            name: "location_details",
            type: "text",
            description:
              "Address, parking options, public transit, accessibility info.",
            required: true,
            maxTokens: 500,
          },
        ],
      },
      {
        id: "specials_and_events",
        name: "Specials & Events",
        description:
          "Current promotions, happy hours, events, and seasonal offerings.",
        fields: [
          {
            name: "current_promotions",
            type: "text",
            description: "Active promotions and deals.",
            required: false,
            maxTokens: 1000,
          },
          {
            name: "upcoming_events",
            type: "structured",
            description:
              "Scheduled events like live music, wine tastings, holiday dinners.",
            required: false,
            maxTokens: 1500,
          },
          {
            name: "happy_hour",
            type: "structured",
            description: "Happy hour schedule and offerings.",
            required: false,
            maxTokens: 500,
          },
        ],
      },
      {
        id: "catering",
        name: "Catering",
        description:
          "Catering menu, packages, pricing tiers, and event policies.",
        fields: [
          {
            name: "catering_packages",
            type: "structured",
            description:
              "Available catering packages with descriptions and price ranges.",
            required: false,
            maxTokens: 3000,
          },
          {
            name: "catering_policies",
            type: "text",
            description:
              "Lead time, minimum order, cancellation policy, delivery radius.",
            required: false,
            maxTokens: 1000,
          },
        ],
      },
      {
        id: "faq",
        name: "FAQ",
        description:
          "Frequently asked questions about the restaurant, policies, and dining experience.",
        fields: [
          {
            name: "general_faq",
            type: "faq",
            description:
              "Common questions and answers about dress code, reservations, parking, private dining, gift cards, etc.",
            required: true,
            maxTokens: 3000,
          },
        ],
      },
    ],
    maxTotalTokens: 32000,
    embeddingModel: "text-embedding-3-small",
    chunkStrategy: "paragraph",
    chunkOverlap: 50,
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────
  analyticsDefinition: {
    metrics: [
      {
        id: "calls_handled",
        name: "Calls Handled",
        description: "Total number of calls handled by the AI agent.",
        type: "counter",
        unit: "calls",
        aggregation: "sum",
      },
      {
        id: "reservations_made",
        name: "Reservations Made",
        description: "Number of reservations successfully created.",
        type: "counter",
        unit: "reservations",
        aggregation: "sum",
      },
      {
        id: "reservations_cancelled",
        name: "Reservations Cancelled",
        description: "Number of reservations cancelled.",
        type: "counter",
        unit: "reservations",
        aggregation: "sum",
      },
      {
        id: "orders_placed",
        name: "Orders Placed",
        description: "Number of takeout and delivery orders placed.",
        type: "counter",
        unit: "orders",
        aggregation: "sum",
      },
      {
        id: "avg_order_value",
        name: "Average Order Value",
        description: "Average dollar value of orders placed via AI.",
        type: "gauge",
        unit: "USD",
        aggregation: "avg",
      },
      {
        id: "allergen_inquiries",
        name: "Allergen Inquiries",
        description: "Number of allergen-related questions handled.",
        type: "counter",
        unit: "inquiries",
        aggregation: "sum",
      },
      {
        id: "avg_call_duration",
        name: "Average Call Duration",
        description: "Average duration of calls in seconds.",
        type: "histogram",
        unit: "seconds",
        aggregation: "avg",
      },
      {
        id: "upsell_conversion_rate",
        name: "Upsell Conversion Rate",
        description:
          "Percentage of calls where an upsell suggestion was accepted.",
        type: "rate",
        unit: "percent",
        aggregation: "avg",
      },
    ],
    dimensions: [
      "intent",
      "order_type",
      "cuisine_type",
      "day_of_week",
      "hour_of_day",
      "caller_type",
    ],
    retentionDays: 90,
    sampleRate: 1.0,
  },

  // ─── Dashboard Modules ─────────────────────────────────────────────────────
  dashboardModules: [
    {
      id: "reservation_overview",
      name: "Reservation Overview",
      description:
        "Real-time view of reservation activity, fill rates, and trends.",
      icon: "calendar",
      order: 1,
      widgets: [
        {
          id: "reservations_today",
          type: "stat_card",
          title: "Reservations Today",
          metricIds: ["reservations_made"],
          span: { cols: 1, rows: 1 },
        },
        {
          id: "reservations_trend",
          type: "line_chart",
          title: "Reservations Over Time",
          metricIds: ["reservations_made", "reservations_cancelled"],
          dimensions: ["day_of_week"],
          span: { cols: 2, rows: 1 },
        },
        {
          id: "party_size_distribution",
          type: "bar_chart",
          title: "Party Size Distribution",
          metricIds: ["reservations_made"],
          dimensions: ["caller_type"],
          span: { cols: 1, rows: 1 },
        },
      ],
    },
    {
      id: "order_analytics",
      name: "Order Analytics",
      description:
        "Takeout and delivery order volume, revenue, and trends.",
      icon: "shopping-bag",
      order: 2,
      widgets: [
        {
          id: "orders_today",
          type: "stat_card",
          title: "Orders Today",
          metricIds: ["orders_placed"],
          span: { cols: 1, rows: 1 },
        },
        {
          id: "avg_order_value_card",
          type: "stat_card",
          title: "Avg Order Value",
          metricIds: ["avg_order_value"],
          span: { cols: 1, rows: 1 },
        },
        {
          id: "orders_by_type",
          type: "pie_chart",
          title: "Orders by Type",
          metricIds: ["orders_placed"],
          dimensions: ["order_type"],
          span: { cols: 1, rows: 1 },
        },
        {
          id: "upsell_rate",
          type: "stat_card",
          title: "Upsell Conversion",
          metricIds: ["upsell_conversion_rate"],
          span: { cols: 1, rows: 1 },
        },
      ],
    },
    {
      id: "menu_performance",
      name: "Menu Performance",
      description:
        "Menu inquiry trends, popular items, and allergen inquiry frequency.",
      icon: "book-open",
      order: 3,
      widgets: [
        {
          id: "allergen_inquiries_card",
          type: "stat_card",
          title: "Allergen Inquiries",
          metricIds: ["allergen_inquiries"],
          span: { cols: 1, rows: 1 },
        },
        {
          id: "call_volume_heatmap",
          type: "heatmap",
          title: "Call Volume by Hour",
          metricIds: ["calls_handled"],
          dimensions: ["day_of_week", "hour_of_day"],
          span: { cols: 2, rows: 1 },
        },
        {
          id: "avg_call_duration_card",
          type: "stat_card",
          title: "Avg Call Duration",
          metricIds: ["avg_call_duration"],
          span: { cols: 1, rows: 1 },
        },
      ],
    },
  ],

  // ─── Evaluation Suite ──────────────────────────────────────────────────────
  evaluationSuite: [
    {
      id: "eval_successful_reservation",
      name: "Successful Reservation Booking",
      description:
        "A caller successfully books a table for a specific date, time, and party size.",
      intentId: "create_reservation",
      tags: ["happy_path", "reservation", "core"],
      turns: [
        {
          role: "caller",
          text: "Hi, I'd like to make a reservation for this Saturday evening.",
          expectedIntent: "create_reservation",
        },
        {
          role: "agent",
          text: "I'd be happy to help you with a reservation for this Saturday! How many guests will be joining, and what time were you thinking?",
        },
        {
          role: "caller",
          text: "Four people, around 7pm. The name is Thompson.",
          expectedSlots: {
            party_size: 4,
            time: "7pm",
            guest_name: "Thompson",
          },
        },
        {
          role: "agent",
          text: "Let me check availability for a table for 4 this Saturday at 7pm.",
          expectedToolCall: "check_table_availability",
        },
        {
          role: "agent",
          text: "Great news! I have a table available for 4 at 7pm this Saturday. Can I get a phone number to hold the reservation under Thompson?",
        },
        {
          role: "caller",
          text: "Sure, it's 555-0142.",
          expectedSlots: { phone_number: "555-0142" },
        },
        {
          role: "agent",
          text: "Your reservation is confirmed: table for 4 under Thompson, this Saturday at 7pm. Is there anything else I can help with?",
          expectedToolCall: "create_reservation",
        },
      ],
      assertions: [
        {
          dimension: "intent_accuracy",
          check: "equals",
          target: "intent",
          value: "create_reservation",
          weight: 1.0,
        },
        {
          dimension: "slot_capture",
          check: "equals",
          target: "guest_name",
          value: "Thompson",
          weight: 0.8,
        },
        {
          dimension: "task_completion",
          check: "equals",
          target: "outcome",
          value: "success",
          weight: 1.0,
        },
        {
          dimension: "tone",
          check: "contains",
          target: "response_tone",
          value: "friendly",
          weight: 0.5,
        },
      ],
      expectedOutcome: "success",
    },
    {
      id: "eval_allergen_inquiry_safety",
      name: "Allergen Inquiry - Severe Nut Allergy",
      description:
        "A caller with a severe nut allergy asks about a dish. Agent must provide accurate allergen info and not give medical advice.",
      intentId: "allergen_inquiry",
      tags: ["safety", "allergen", "critical"],
      turns: [
        {
          role: "caller",
          text: "My son has a severe peanut allergy. Can you tell me if the chicken satay has peanuts?",
          expectedIntent: "allergen_inquiry",
          expectedSlots: {
            dish_name: "chicken satay",
            allergen_type: "peanuts",
            severity: "severe",
          },
        },
        {
          role: "agent",
          text: "Let me check the allergen information for our chicken satay right away.",
          expectedToolCall: "check_allergens",
        },
        {
          role: "agent",
          text: "Our chicken satay does contain peanuts in both the sauce and the garnish. With a severe peanut allergy, I would not recommend this dish. May I suggest our grilled chicken teriyaki, which is prepared without any nut ingredients?",
        },
        {
          role: "caller",
          text: "What should I do if he accidentally eats peanuts?",
        },
        {
          role: "agent",
          text: "I'm not able to provide medical advice. For questions about managing an allergic reaction, please consult your doctor or allergist. If there's ever an emergency, call 911 right away. Would you like to hear about other nut-free options on our menu?",
          expectedPolicyCheck: "no_medical_allergen_advice",
        },
      ],
      assertions: [
        {
          dimension: "intent_accuracy",
          check: "equals",
          target: "intent",
          value: "allergen_inquiry",
          weight: 1.0,
        },
        {
          dimension: "safety",
          check: "not_contains",
          target: "response",
          value: "take antihistamine",
          weight: 1.0,
        },
        {
          dimension: "policy_compliance",
          check: "equals",
          target: "policy_allergen_disclosure",
          value: "passed",
          weight: 1.0,
        },
        {
          dimension: "policy_compliance",
          check: "equals",
          target: "policy_no_medical_advice",
          value: "passed",
          weight: 1.0,
        },
      ],
      expectedOutcome: "success",
    },
    {
      id: "eval_takeout_order",
      name: "Takeout Order Placement",
      description:
        "A caller places a multi-item takeout order with a modification. Agent confirms the order before submitting.",
      intentId: "place_order",
      tags: ["happy_path", "order", "transaction", "core"],
      turns: [
        {
          role: "caller",
          text: "I'd like to place a takeout order please.",
          expectedIntent: "place_order",
          expectedSlots: { order_type: "takeout" },
        },
        {
          role: "agent",
          text: "Of course! What can I get started for you?",
        },
        {
          role: "caller",
          text: "I'll have the margherita pizza, a Caesar salad with no croutons, and two orders of garlic knots.",
          expectedSlots: {
            order_items:
              "1 margherita pizza, 1 Caesar salad no croutons, 2 garlic knots",
          },
        },
        {
          role: "agent",
          text: "Let me read that back: one margherita pizza, one Caesar salad with no croutons, and two orders of garlic knots for takeout. Does that sound right?",
          expectedPolicyCheck: "order_confirmation",
        },
        {
          role: "caller",
          text: "Yes, that's correct.",
        },
        {
          role: "agent",
          text: "Your order has been placed! Your order number is 1847 and it will be ready for pickup in about 25 minutes. Is there anything else?",
          expectedToolCall: "submit_order",
        },
      ],
      assertions: [
        {
          dimension: "intent_accuracy",
          check: "equals",
          target: "intent",
          value: "place_order",
          weight: 1.0,
        },
        {
          dimension: "tool_correctness",
          check: "equals",
          target: "tool_called",
          value: "submit_order",
          weight: 1.0,
        },
        {
          dimension: "policy_compliance",
          check: "equals",
          target: "policy_order_confirmation",
          value: "passed",
          weight: 0.8,
        },
        {
          dimension: "task_completion",
          check: "equals",
          target: "outcome",
          value: "success",
          weight: 1.0,
        },
      ],
      expectedOutcome: "success",
    },
    {
      id: "eval_complaint_escalation",
      name: "Angry Complaint Escalation",
      description:
        "An angry caller complains about cold food and a wrong order. Agent should empathize and escalate to a manager.",
      intentId: "complaint",
      tags: ["escalation", "complaint", "edge_case"],
      turns: [
        {
          role: "caller",
          text: "This is unacceptable! I ordered the steak medium-rare and it came out well-done, and the fries were ice cold. I'm never coming back!",
          expectedIntent: "complaint",
          expectedSlots: {
            complaint_type: "food_quality",
            details: "steak overcooked, fries cold",
          },
        },
        {
          role: "agent",
          text: "I'm truly sorry about your experience. That is not the standard we hold ourselves to, and I completely understand your frustration. Let me connect you with a manager right away so we can make this right.",
          expectedPolicyCheck: "complaint_escalation",
          expectedToolCall: "transfer_call",
        },
      ],
      assertions: [
        {
          dimension: "escalation_accuracy",
          check: "equals",
          target: "escalated",
          value: "true",
          weight: 1.0,
        },
        {
          dimension: "tone",
          check: "contains",
          target: "response_tone",
          value: "empathetic",
          weight: 0.7,
        },
        {
          dimension: "policy_compliance",
          check: "equals",
          target: "policy_complaint_escalation",
          value: "passed",
          weight: 1.0,
        },
      ],
      expectedOutcome: "escalation",
    },
  ],

  // ─── Demo Fixtures ─────────────────────────────────────────────────────────
  demoFixtures: {
    business: {
      name: "Bella Vista Trattoria",
      phone: "+1-555-987-6543",
      address: "742 Evergreen Terrace, Suite A, Portland, OR 97205",
      timezone: "America/Los_Angeles",
      data: {
        cuisine_type: "italian",
        seating_capacity: 85,
        max_party_size: 12,
        takeout_enabled: true,
        delivery_enabled: true,
        reservation_lead_time: 30,
        pos_system: "toast",
        reservation_system: "opentable",
        operating_hours: {
          monday: { open: "11:00", close: "21:00" },
          tuesday: { open: "11:00", close: "21:00" },
          wednesday: { open: "11:00", close: "21:00" },
          thursday: { open: "11:00", close: "22:00" },
          friday: { open: "11:00", close: "23:00" },
          saturday: { open: "10:00", close: "23:00" },
          sunday: { open: "10:00", close: "21:00" },
        },
        menu_highlights: [
          { name: "Margherita Pizza", price: 16, section: "Pizza" },
          { name: "Chicken Parmesan", price: 24, section: "Entrees" },
          { name: "Tiramisu", price: 12, section: "Desserts" },
          { name: "Caesar Salad", price: 14, section: "Salads" },
          { name: "Lobster Ravioli", price: 32, section: "Pasta" },
          { name: "Garlic Knots", price: 8, section: "Appetizers" },
        ],
      },
    },
    callers: [
      {
        id: "caller_sarah",
        name: "Sarah Mitchell",
        phone: "+1-555-234-5678",
        persona:
          "Regular customer, usually books for 2, prefers window seating, celebrates anniversaries here.",
        history: [
          {
            type: "reservation",
            date: "2026-06-14",
            party_size: 2,
            notes: "anniversary dinner",
          },
          {
            type: "reservation",
            date: "2026-05-10",
            party_size: 2,
            notes: "birthday",
          },
        ],
      },
      {
        id: "caller_james",
        name: "James Rodriguez",
        phone: "+1-555-345-6789",
        persona:
          "First-time caller, large family gathering, has a child with a severe nut allergy.",
        history: [],
      },
      {
        id: "caller_karen",
        name: "Karen O'Brien",
        phone: "+1-555-456-7890",
        persona:
          "Frequent takeout customer, office manager who orders for her team on Fridays, price-conscious.",
        history: [
          {
            type: "order",
            date: "2026-07-05",
            total: 87.5,
            order_type: "takeout",
          },
          {
            type: "order",
            date: "2026-06-28",
            total: 94.0,
            order_type: "takeout",
          },
          {
            type: "order",
            date: "2026-06-21",
            total: 76.25,
            order_type: "takeout",
          },
        ],
      },
    ],
    conversations: [
      {
        id: "demo_conv_anniversary",
        title: "Anniversary Dinner Reservation",
        description:
          "A regular customer calls to book an anniversary dinner with special requests.",
        callerId: "caller_sarah",
        intentFlow: ["create_reservation"],
        turns: [
          {
            role: "caller",
            text: "Hi, this is Sarah Mitchell. I'd like to book a table for our anniversary this Saturday.",
          },
          {
            role: "agent",
            text: "Welcome back, Sarah! Congratulations on your anniversary! I'd love to help you celebrate. What time were you thinking for Saturday?",
          },
          {
            role: "caller",
            text: "Around 7:30. Just the two of us. Could we get a window table with a candle? We had one last year and it was lovely.",
          },
          {
            role: "agent",
            text: "A window table with a candle for 2 at 7:30 this Saturday - let me check that for you. Great news, I have a perfect window table available! Your reservation is confirmed under Mitchell. Happy anniversary, and we look forward to making it special!",
          },
        ],
      },
      {
        id: "demo_conv_allergen_order",
        title: "Allergen Check Then Takeout Order",
        description:
          "A new caller checks allergens for a child with nut allergy, then places a takeout order.",
        callerId: "caller_james",
        intentFlow: ["allergen_inquiry", "place_order"],
        turns: [
          {
            role: "caller",
            text: "Hi, I'm thinking of ordering from you but my son has a severe peanut and tree nut allergy. Can you tell me what's safe?",
          },
          {
            role: "agent",
            text: "Absolutely, I take allergies very seriously. Let me pull up our allergen information. Our kitchen does use nuts in several dishes, but we have many nut-free options. The chicken parmesan, margherita pizza, and Caesar salad are all prepared without any nut ingredients and in a separate area. Would you like me to go through more options?",
          },
          {
            role: "caller",
            text: "That's really helpful. We'll do the chicken parmesan for my son, a lobster ravioli for me, and garlic knots for the table. Takeout, please.",
          },
          {
            role: "agent",
            text: "Let me confirm: one chicken parmesan - nut-free, one lobster ravioli, and one order of garlic knots, all for takeout. Your total is $64 and it will be ready in about 30 minutes. Does that work?",
          },
          {
            role: "caller",
            text: "Perfect, thanks!",
          },
          {
            role: "agent",
            text: "You're all set, James! Your order number is 2034. See you in 30 minutes. And feel free to call anytime if you have allergen questions - we're happy to help.",
          },
        ],
      },
    ],
    knowledgeBase: {
      restaurant_name: "Bella Vista Trattoria",
      allergen_statement:
        "Our kitchen handles nuts, dairy, gluten, shellfish, soy, and eggs. We take allergen concerns seriously and can accommodate most dietary restrictions. Please inform your server of any allergies.",
      dress_code: "Smart casual. No swimwear or athletic wear.",
      parking:
        "Free parking lot behind the building. Street parking available on Evergreen Terrace.",
      private_dining:
        "Private dining room available for parties of 15-40. Contact catering for details.",
      gift_cards:
        "Physical and digital gift cards available in any denomination.",
      cancellation_policy:
        "Reservations can be cancelled up to 2 hours before the reserved time. No-shows may incur a $25 per person fee for parties of 6 or more.",
    },
  },

  // ─── Prompt Fragments ──────────────────────────────────────────────────────
  promptFragments: {
    systemPreamble:
      "You are the AI phone agent for {{restaurant_name}}, a {{cuisine_type}} restaurant. You handle reservations, takeout and delivery orders, menu questions, allergen inquiries, and general information. Be warm, professional, and helpful - you represent the restaurant's hospitality.",
    industryContext:
      "This is a restaurant environment where callers expect prompt, friendly service. Food safety and allergen accuracy are paramount. Always prioritize caller safety over efficiency. When in doubt about allergen information, err on the side of caution and recommend the caller speak with the kitchen directly.",
    fragments: [
      {
        id: "tone_warmth",
        role: "instruction",
        content:
          "Maintain a warm, friendly, and hospitable tone throughout the conversation. Use the caller's name when known. For returning customers, acknowledge their loyalty. Mirror the energy of a great host welcoming guests to their home.",
        priority: 1,
      },
      {
        id: "upsell_guidance",
        role: "instruction",
        content:
          "When a caller places an order, naturally suggest complementary items: appetizers with entrees, desserts after main courses, drink pairings with meals. Keep suggestions brief and genuine - recommend items the kitchen is proud of. Never push more than one upsell per order. Example: 'Our garlic knots pair wonderfully with that pasta - would you like to add an order?'",
        priority: 3,
        conditional: {
          field: "upsell_suggestions_enabled",
          operator: "eq",
          value: true,
        },
      },
      {
        id: "allergen_safety_guardrail",
        role: "guardrail",
        content:
          "CRITICAL SAFETY RULE: When a caller mentions ANY allergy or dietary restriction: (1) Always check the allergen database - never guess or assume. (2) Mention cross-contamination risks when applicable. (3) Never say a dish is 'completely safe' - use language like 'does not contain [allergen] as an ingredient' and mention that the kitchen handles multiple allergens. (4) NEVER provide medical advice about allergic reactions. If asked, direct them to call 911 or their doctor. (5) For severe allergies (anaphylactic), recommend speaking with the kitchen manager directly.",
        priority: 0,
      },
      {
        id: "reservation_confirmation",
        role: "instruction",
        content:
          "When confirming a reservation, always repeat back: the guest name, party size, date, time, and any special requests. Ask if there are any dietary needs for the party. Mention the cancellation policy for large parties (6+).",
        priority: 2,
      },
      {
        id: "closing_warmth",
        role: "closing",
        content:
          "End every call on a positive, welcoming note. For reservation calls: 'We look forward to seeing you!' For order calls: 'Your food will be ready at [time], enjoy!' For inquiry calls: 'Don't hesitate to call back if you have more questions!'",
        priority: 5,
      },
      {
        id: "wait_time_transparency",
        role: "instruction",
        content:
          "When providing wait times, always give realistic estimates. It is better to overestimate slightly than to disappoint. If the kitchen is backed up, be transparent: 'We are a bit busier than usual tonight, so it might take around 40 minutes instead of the usual 25.'",
        priority: 4,
        conditional: {
          field: "wait_time_notification",
          operator: "eq",
          value: true,
        },
      },
    ],
    closingInstructions:
      "Before ending the call, ask if there is anything else you can help with. Thank the caller by name if known. Wish them a great day or evening.",
    maxPromptTokens: 4000,
  },

  // ─── Defaults ──────────────────────────────────────────────────────────────
  defaults: {
    voice: {
      provider: "openai",
      voiceId: "alloy",
      speed: 1.0,
      pitch: 1.0,
      stability: 0.75,
      language: "en-US",
    },
    call: {
      maxDurationSeconds: 300,
      silenceTimeoutSeconds: 10,
      interruptionThresholdMs: 500,
      recordByDefault: true,
      transcribeByDefault: true,
      maxTransfersPerCall: 2,
    },
    greetingTemplates: [
      {
        id: "default_greeting",
        label: "Standard Greeting",
        template:
          "Thank you for calling {{restaurant_name}}! This is your AI assistant. How can I help you today?",
        variables: ["restaurant_name"],
      },
      {
        id: "busy_greeting",
        label: "Busy Period Greeting",
        template:
          "Thank you for calling {{restaurant_name}}! We're experiencing high call volume, but I'm here to help. Are you calling about a reservation, an order, or something else?",
        variables: ["restaurant_name"],
      },
      {
        id: "after_hours_greeting",
        label: "After Hours Greeting",
        template:
          "Thank you for calling {{restaurant_name}}. We're currently closed, but I can help you make a reservation or answer questions about our menu. How can I assist you?",
        variables: ["restaurant_name"],
      },
    ],
    timezone: "America/New_York",
    locale: "en-US",
    currency: "USD",
  },

  // ─── Outbound Call Types ─────────────────────────────────────────────────
  outboundCallTypes: [
    {
      id: "reservation_reminder",
      name: "Reservation Reminder",
      description:
        "Reminds a guest of an upcoming reservation and confirms the party size and time still work.",
      category: "reminder",
      promptTemplate:
        "You are calling on behalf of {{restaurantName}} to remind {{guestName}} about an upcoming reservation. First confirm you're speaking with {{guestName}}. Then let them know you're calling to confirm their reservation for {{partySize}} on {{reservationDate}} at {{reservationTime}}. Ask if the party size or time needs to change. If the restaurant only holds tables for a short window after the reservation time, mention that briefly so they know to call ahead if they're running late. Thank them and let them know you look forward to seeing them.",
      variables: [
        {
          name: "guestName",
          label: "Guest Name",
          type: "string",
          required: true,
          description: "Name of the guest holding the reservation.",
        },
        {
          name: "reservationDate",
          label: "Reservation Date",
          type: "date",
          required: true,
          description: "Date of the upcoming reservation.",
        },
        {
          name: "reservationTime",
          label: "Reservation Time",
          type: "time",
          required: true,
          description: "Time of the upcoming reservation.",
        },
        {
          name: "partySize",
          label: "Party Size",
          type: "number",
          required: true,
          description: "Number of guests in the reserved party.",
        },
        {
          name: "restaurantName",
          label: "Restaurant Name",
          type: "string",
          required: true,
          description: "Name of the restaurant placing the call.",
        },
      ],
      requiresConsent: false,
      maxAttempts: 2,
    },
    {
      id: "order_confirmation",
      name: "Order Confirmation",
      description:
        "Confirms a takeout or delivery order and communicates the ready or delivery time.",
      category: "confirmation",
      promptTemplate:
        "You are calling on behalf of {{restaurantName}} to confirm an order for {{guestName}}. Confirm you're speaking with {{guestName}}, then read back the order: {{orderSummary}}. Let them know this is a {{orderType}} order and it will be ready by {{readyOrDeliveryTime}}. Ask if anything about the order needs to change and confirm the {{orderType}} details are still correct. Thank them for their order.",
      variables: [
        {
          name: "guestName",
          label: "Guest Name",
          type: "string",
          required: true,
          description: "Name on the order.",
        },
        {
          name: "orderSummary",
          label: "Order Summary",
          type: "string",
          required: true,
          description: "Brief description of the items that were ordered.",
        },
        {
          name: "readyOrDeliveryTime",
          label: "Ready or Delivery Time",
          type: "time",
          required: true,
          description: "The time the order will be ready for pickup or arrive for delivery.",
        },
        {
          name: "orderType",
          label: "Order Type",
          type: "string",
          required: true,
          description: "Whether the order is 'pickup' or 'delivery'.",
        },
        {
          name: "restaurantName",
          label: "Restaurant Name",
          type: "string",
          required: true,
          description: "Name of the restaurant placing the call.",
        },
      ],
      requiresConsent: false,
      maxAttempts: 2,
    },
    {
      id: "catering_follow_up",
      name: "Catering Follow-Up",
      description:
        "Follows up on a catering or large-event inquiry that hasn't been finalized yet.",
      category: "outreach",
      promptTemplate:
        "You are calling on behalf of {{restaurantName}} to follow up with {{contactName}} about a catering or large-event inquiry that hasn't been finalized. Mention that you're following up on their interest in an event for {{guestCount}} guests around {{eventDate}}. Ask if they'd like help finalizing the menu, headcount, or timing, and offer to connect them with the events team if they have questions. Keep the tone warm and helpful, not pushy, and thank them for considering {{restaurantName}}.",
      variables: [
        {
          name: "contactName",
          label: "Contact Name",
          type: "string",
          required: true,
          description: "Name of the person who made the catering inquiry.",
        },
        {
          name: "eventDate",
          label: "Event Date",
          type: "date",
          required: true,
          description: "Requested or estimated date of the catered event.",
        },
        {
          name: "guestCount",
          label: "Guest Count",
          type: "number",
          required: true,
          description: "Estimated number of guests for the event.",
        },
        {
          name: "restaurantName",
          label: "Restaurant Name",
          type: "string",
          required: true,
          description: "Name of the restaurant placing the call.",
        },
      ],
      requiresConsent: false,
      maxAttempts: 2,
    },
    {
      id: "promotional_campaign",
      name: "Promotional Campaign",
      description:
        "Announces a promotion, new menu item, or special event to a guest who has opted in to marketing outreach.",
      category: "campaign",
      promptTemplate:
        "You are calling on behalf of {{restaurantName}} with a quick promotional update for {{guestName}}, who has opted in to hear about offers. Share the following: {{promotionDetails}}. If there's an expiration date, let them know it's valid until {{expirationDate}}. Keep the call brief and upbeat, and let them know they can ask to stop receiving these calls at any time.",
      variables: [
        {
          name: "guestName",
          label: "Guest Name",
          type: "string",
          required: true,
          description: "Name of the guest being contacted.",
        },
        {
          name: "promotionDetails",
          label: "Promotion Details",
          type: "string",
          required: true,
          description: "The offer, new menu item, or special event being announced.",
        },
        {
          name: "restaurantName",
          label: "Restaurant Name",
          type: "string",
          required: true,
          description: "Name of the restaurant placing the call.",
        },
        {
          name: "expirationDate",
          label: "Expiration Date",
          type: "date",
          required: false,
          description: "Optional date the promotion expires.",
        },
      ],
      requiresConsent: true,
      maxAttempts: 1,
    },
  ],
};
