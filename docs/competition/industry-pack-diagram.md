# VerticalVoice AI — Industry Pack Interface

Every vertical in VerticalVoice AI is a single object that satisfies the
`IndustryPack` TypeScript interface defined in
`src/industries/core/industry-pack.ts`. That interface has 12 fields —
onboarding schema, defaults, intent catalog, outcome schemas, tools,
knowledge schema, policy pack, escalation rules, analytics definition,
dashboard modules, evaluation suite, demo fixtures, and prompt fragments.
Healthcare (`src/industries/healthcare/pack.ts`), Restaurant
(`src/industries/restaurant/pack.ts`), and Real Estate
(`src/industries/real-estate/pack.ts`) each fill in every field with
domain-specific content, but the *shape* is identical, which is what lets the
same `compileAgent()` function and the same tool gateway serve all three.

```mermaid
classDiagram
    class IndustryPack {
        <<interface>>
        +IndustryId id
        +string version
        +OnboardingSchema onboardingSchema
        +IndustryDefaults defaults
        +IntentDefinition[] intentCatalog
        +OutcomeSchema[] outcomeSchemas
        +ToolBinding[] tools
        +KnowledgeSchema knowledgeSchema
        +PolicyDefinition[] policyPack
        +EscalationRule[] escalationRules
        +AnalyticsDefinition analyticsDefinition
        +DashboardModuleDefinition[] dashboardModules
        +EvaluationScenario[] evaluationSuite
        +DemoFixtureSet demoFixtures
        +PromptFragmentSet promptFragments
    }

    class HealthcarePack {
        id = "healthcare"
        intents: book_appointment, reschedule, cancel,
          refill_request, insurance_intake, emergency,
          human_transfer ...
        policies: no_diagnosis, hipaa_verification,
          emergency_escalation, no_medication_dosage
        dashboards: Appointment Overview, Call Analytics,
          Patient Satisfaction
        tools: check-availability, lookup-patient,
          check-insurance
    }

    class RestaurantPack {
        id = "restaurant"
        intents: reservation, order, allergen_inquiry,
          catering_inquiry, hours_inquiry ...
        policies: allergen_disclosure (never guarantee
          allergen-free prep), pci_payment_handling
        dashboards: Reservation Overview, Order Analytics,
          Menu Performance (allergen inquiries)
        tools: get-menu, create-booking, check-availability
    }

    class RealEstatePack {
        id = "real_estate"
        intents: listing_inquiry, book_showing,
          seller_lead, buyer_qualification,
          neighborhood_info ...
        policies: fair_housing (no discriminatory
          steering), outbound_consent
        dashboards: Lead Pipeline, Showing Calendar,
          Property Management
        tools: book-showing, transfer-call
    }

    class VerticalAgentCompiler {
        +compileAgent(tenant, pack, onboarding) CompiledAgentConfig
    }

    class ToolGateway {
        +handleToolCall(request, toolName) ToolCallResult
    }

    class PolicyEngine {
        +evaluateAllPolicies(context, policies) PolicyDecision[]
    }

    IndustryPack <|.. HealthcarePack : implements
    IndustryPack <|.. RestaurantPack : implements
    IndustryPack <|.. RealEstatePack : implements

    VerticalAgentCompiler --> IndustryPack : reads
    ToolGateway --> PolicyEngine : delegates policy checks
    ToolGateway --> IndustryPack : validates against pack.tools
```

## Comparison Table

| Dimension | Healthcare | Restaurant | Real Estate |
|---|---|---|---|
| **Primary workflow** | Book / reschedule / cancel an appointment with a provider | Take a reservation or phone order | Book a property showing / capture a buyer or seller lead |
| **Unique safety guard** | `no_diagnosis` policy — agent must decline to diagnose symptoms and offer an appointment instead (e.g. rash inquiry: "Does NOT attempt to diagnose the rash") | Allergen policy — agent must provide allergen info but explicitly **must not guarantee** allergen-free preparation (cross-contamination risk) | `fair_housing` policy — agent must refuse to steer callers toward/away from neighborhoods based on protected characteristics (family status, race, national origin, source of income) |
| **Unique dashboard metric** | Patient Satisfaction (satisfaction score + trend by call type) | Allergen Inquiries (menu performance module) | Lead Conversion Rate (lead pipeline module) |
| **Unique tool** | `lookup-patient` / `check-insurance` | `get-menu` (category + dietary filter) | `book-showing` (listing-scoped scheduling) |

Because the interface is shared, adding a fourth vertical (the ADR calls out
legal, dental, and automotive as roadmap candidates) means writing one new
pack module that fills in this same shape — no changes to the compiler, the
policy engine, or the tool gateway.
