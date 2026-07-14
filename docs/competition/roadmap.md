# VerticalVoice AI — Post-FYP Roadmap

An honest accounting of what this platform is today (a working, evaluated,
mock-provider-capable architecture) versus what it needs before it could take
real calls from real businesses. Nothing below is understated — a judge or
future contributor should be able to use this as a punch list.

## 1. Real Twilio / Ultravox account activation

- The platform currently runs with `VOICE_PROVIDER=mock` and
  `TELEPHONY_PROVIDER=mock` by default (`.env.example`). Going live requires
  a funded Twilio account (phone number provisioning, inbound webhook
  configuration via `configureInboundRoute`) and a funded Ultravox account
  (agent creation via `createAgent`).
- The provider abstraction (`VoiceRuntimeProvider`, `TelephonyProvider`)
  means this is a credentials-and-config change, not a rewrite — but it is
  the single largest gap between "demo-ready" and "call-ready."
- Webhook signature verification (`src/lib/webhooks/signature.ts`) needs to
  be validated against real Twilio/Ultravox signing secrets in a live
  environment, not just unit-tested against synthetic payloads.

## 2. Real PHI compliance review (BAAs)

- `phi_mode` in `src/config/features.ts` is explicitly hardcoded to `false`
  with the comment "PHI mode is never enabled via env — requires code
  change." That's a deliberate guardrail: the platform should not carry real
  Protected Health Information until a formal review has happened.
- Before Sunrise-Medical-Clinic-shaped tenants can handle real patient data,
  this needs: a signed Business Associate Agreement (BAA) with Supabase (or
  migration to a Supabase tier/region that supports one), a BAA with
  Ultravox/Twilio if patient voice data transits them, and an external HIPAA
  compliance audit of the `hipaa_mode` redaction path
  (`src/lib/tools/redaction.ts`) and the `no_diagnosis` /
  `hipaa_verification` policies (`src/industries/healthcare/pack.ts`).
- The deterministic policy engine gives auditors something concrete to
  review (structured conditions, not prose instructions to an LLM), but the
  audit itself hasn't happened yet.

## 3. Load testing

- The 140-scenario evaluation suite (`src/tests/scenarios`) validates
  correctness — intent accuracy, policy compliance, tool correctness — but
  not throughput. There is no current load test exercising concurrent calls
  against the tool gateway, the idempotency cache (in-memory `Map`, not yet
  distributed), or RLS query performance at realistic tenant/call-volume
  scale.
- Priorities before a real pilot: concurrent-call throughput on the tool
  gateway, webhook burst handling (the `dead_letter_events` /
  `job_attempts` retry infrastructure exists in the schema but needs
  load-tested failure/retry paths), and Supabase connection pooling under
  concurrent tenant traffic.

## 4. Additional integrations (EHR/FHIR, Follow Up Boss, Square production)

- **EHR/FHIR**: the healthcare pack's `ehr_system` onboarding field
  (`src/industries/healthcare/pack.ts`) exists as a schema slot but there is
  no FHIR client implementation yet — real patient lookup / insurance
  verification against a live EHR is future work, not present capability.
- **Follow Up Boss** (real estate CRM): the real-estate pack currently
  targets HubSpot for CRM lead sync (per `docs/architecture/INVENTORY.md`).
  Follow Up Boss is a commonly requested real-estate-specific CRM that isn't
  wired up yet.
- **Square (restaurant POS)**: Square is listed as an integration point in
  the inventory (OAuth 2.0), but production-grade order sync (menu
  availability, live order push, payment reconciliation) needs to be
  validated against a real Square account and a real restaurant's menu
  complexity, not just the seeded Bellas Italian Kitchen fixture data.

## 5. Outbound calling activation with full consent infrastructure

- `outbound_calling` is a feature flag (default `false`) in
  `src/config/features.ts`, and `real_estate_outbound` similarly defaults
  off — outbound calling is deliberately not live.
- The schema already has the building blocks for doing this safely:
  `consent_records`, `consent_versions`, `dnc_checks` (Do-Not-Call registry
  checks), `suppression_entries`, and `outbound_attempts` tables exist in
  `supabase/migrations/001_initial_schema.sql`. What's missing is the
  application logic that actually enforces consent-before-dial, integrates
  with a real DNC registry check, and logs outbound attempts against those
  tables in a way that would hold up to a TCPA compliance review.
- This is explicitly called out as higher-risk than inbound: an inbound
  call is initiated by the caller; an outbound call is initiated by the
  platform on the tenant's behalf, which carries real regulatory exposure
  (TCPA in the US) if consent and suppression aren't airtight before this
  flag is flipped on.

## Sequencing

Realistically, the order that reduces risk fastest is: (1) real Twilio/
Ultravox activation behind the existing provider abstraction with a single
non-PHI vertical (restaurant is the lowest-regulatory-risk starting point),
(2) load testing that pilot traffic, (3) the healthcare PHI/BAA review in
parallel once inbound is proven stable, (4) the additional integrations as
pilot tenants request them, and (5) outbound calling last, only after the
consent/suppression enforcement logic has been built and reviewed — not
merely scaffolded in the schema.
