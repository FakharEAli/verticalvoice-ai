# VerticalVoice AI — Technical Appendix

For readers who want to go one level deeper than the summary. Every number here
was pulled directly from the repository, not estimated.

## Database

- **90 tables** defined in `supabase/migrations/001_initial_schema.sql`
  (single migration file, 1,687 lines), counted via unique `CREATE TABLE`
  statements. Spans core platform tables (`tenants`, `users`, `calls`,
  `audit_events`, `jobs`, `webhook_endpoints`) and per-vertical tables
  (`appointments`/`healthcare_providers` for healthcare,
  `menu_items`/`reservations`/`orders` for restaurant,
  `listings`/`showings`/`real_estate_leads` for real estate).
- **RLS**: 30 `CREATE POLICY` statements enforce Row-Level Security across
  the schema. Tenant isolation is a database-layer guarantee, not an
  application-layer convention — see `docs/project/security-story.md`
  for the detailed argument and the anon-key-vs-service-role-key split.
- Supporting infrastructure tables worth noting: `idempotency_keys` and
  `job_attempts`/`jobs` (safe retry of async work like the call-normalizer),
  `dead_letter_events` (failed webhook/job recovery), `webhook_deliveries`
  (webhook audit trail), `consent_records`/`consent_versions`/`dnc_checks`/
  `suppression_entries` (outbound calling consent infrastructure, currently
  unused because outbound calling is feature-flagged off).

## API surface

- **43 API route files** under `src/app/api` (`find src/app/api -name
  route.ts | wc -l`), including the 3 webhook receivers
  (`/api/v1/webhooks/twilio`, `/ultravox`, `/telnyx`), tool endpoints, and
  tenant/dashboard data routes.

## The deterministic compiler

- `src/industries/core/compiler.ts` implements `compileAgent(tenantConfig,
  pack, onboardingAnswers)`, producing a `CompiledAgentConfig`.
- The hash mechanism is **FNV-1a** (`deterministicHash()`), confirmed by
  reading the source: `FNV_OFFSET_BASIS = 0x811c9dc5`, `FNV_PRIME =
  0x01000193`, applied character-by-character with `Math.imul` for the
  32-bit multiply, output as an 8-character hex string.
- Two hashes are computed: an `inputHash` (over tenant config + pack id/version
  + onboarding answers, via a custom `stableStringify` that sorts object keys
  for determinism) and a final `hash` over the fully compiled config
  (including resolved system prompt, merged voice/call config, filtered
  intents/tools/policies, and greeting).
- `compiledAt` is itself derived deterministically from the input hash
  (`baseTimestamp + (hashNum % 1000000)`) rather than `Date.now()`, so two
  compiler runs with identical inputs produce byte-identical output —
  useful for testing and for detecting unintended config drift between
  environments.
- The compiler pipeline: build system prompt from ordered/filtered
  `PromptFragment`s → merge voice/call config with tenant overrides → filter
  intents by tenant feature flags → filter tools to only those bound to
  active intents → filter policies to only those required by active intents
  → resolve greeting (tenant override or pack default template) → hash.

## Evaluation suite structure

- **140 scenarios total** (`src/tests/scenarios/index.ts`,
  `allEvaluationScenarios`), split as:
  - Healthcare: 40 (`src/tests/scenarios/healthcare.ts`)
  - Restaurant: 40 (`src/tests/scenarios/restaurant.ts`)
  - Real Estate: 40 (`src/tests/scenarios/real-estate.ts`)
  - Adversarial (shared across verticals): 20 (`src/tests/scenarios/adversarial.ts`)
- Adversarial scenarios are grouped into 4 categories of 5 each: prompt
  injection (`adv-inject-*`), data exfiltration (`adv-exfil-*`), safety
  (`adv-safety-*`), and resilience (`adv-resil-*`) — e.g. `adv-resil-002`
  simulates a webhook replay attack, `adv-safety-003` simulates a consent
  bypass attempt.
- Each `EvaluationScenario` (defined in `src/industries/core/industry-pack.ts`)
  carries an `intentId`, a turn-by-turn conversation (`EvaluationTurn[]`),
  and weighted `EvaluationAssertion[]` scored across 10 dimensions
  (`intent_accuracy`, `slot_capture`, `tool_correctness`,
  `policy_compliance`, `safety`, `hallucination`, `tone`, `latency`,
  `task_completion`, `escalation_accuracy`), plus an `expectedOutcome` of
  `success` / `escalation` / `failure`.
- Healthcare and real-estate scenario files include dedicated policy
  sub-suites — e.g. real estate has 5 explicitly tagged `fair_housing`
  scenarios (`category: "fair_housing"`), restaurant has 5 tagged `allergen`
  scenarios.

## RLS approach

See `docs/project/security-story.md` §1 for the full argument. In short:
every tenant-scoped table has RLS policies keyed on `tenant_id`; the
browser-facing Supabase client uses the anon key (subject to RLS); the
service-role key (bypasses RLS) is confined to server-side code paths that
need cross-tenant access before a tenant is resolved (e.g. webhook ingestion).

## Provider abstraction

- `VoiceRuntimeProvider` (`src/providers/voice/types.ts`): `createAgent`,
  `updateAgent`, `startOutboundCall`, `getCall`, `getRecording`,
  `terminateCall`. Implemented by Ultravox (primary) and Retell (fallback),
  selectable via `VOICE_PROVIDER` env var, with a `mock` implementation for
  zero-cost local development.
- `TelephonyProvider` (`src/providers/telephony/types.ts`):
  `provisionNumber`, `configureInboundRoute`, `transferCall`, `sendSms`,
  `validateWebhook`, `estimateCost`. Implemented by Twilio (primary) and
  Telnyx (cost-optimized), selectable via `TELEPHONY_PROVIDER` env var.

## Related documents

- `docs/project/architecture-diagram.md` — high-level system architecture
- `docs/project/data-flow-diagram.md` — end-to-end call sequence
- `docs/project/industry-pack-diagram.md` — `IndustryPack` interface + comparison table
- `docs/project/cost-comparison.md` — provider cost breakdown and budget modes
- `docs/project/security-story.md` — security model, file-by-file
- `docs/project/demo-walkthrough.md` — 6-scene demo walkthrough
- `docs/project/executive-brief.md` — one-page executive summary
- `docs/project/roadmap.md` — what comes after the FYP
- `docs/architecture/INVENTORY.md` — full technology/file inventory
- `docs/architecture/ADR-001-vertical-pack-architecture.md` — the architecture decision record this whole platform is built on
