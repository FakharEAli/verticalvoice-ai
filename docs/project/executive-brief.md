# VerticalVoice AI — Judge Brief

## The problem

Three small-business categories — medical clinics, restaurants, real estate
brokerages — all lose revenue to missed phone calls. A missed call means a
missed appointment, a missed reservation, a missed lead. Each vertical needs
a different call flow (HIPAA-safe scheduling vs. allergen-safe ordering vs.
Fair-Housing-safe showings), which is why most AI receptionist products are
either shallow (one generic script bolted onto three industries) or narrow
(a single-vertical point solution that can't generalize).

## The solution

A pluggable **Industry Pack architecture**: one platform, one deterministic
**Vertical Agent Compiler** (`src/industries/core/compiler.ts`), and three
self-contained packs — Healthcare, Restaurant, Real Estate — that each
implement the same `IndustryPack` interface
(`src/industries/core/industry-pack.ts`) with their own intents, tools,
compliance policies, and dashboards. The compiler takes a tenant's config and
a pack, and produces a hashed, deterministic `CompiledAgentConfig` that
drives the live call.

## The two USPs

- **5–10 minute setup.** A new tenant fills out the pack's onboarding schema
  (business info, hours, appointment types, menu, listings — whatever the
  vertical needs) and the compiler generates a working agent: system prompt,
  active intents, active tools, active policies, greeting. No manual prompt
  engineering per customer.
- **Industry depth, not industry veneer.** Compliance isn't a system-prompt
  instruction the model can be talked out of — it's a deterministic policy
  engine (`src/industries/core/policies.ts`) enforced by the tool gateway
  before any tool executes. HIPAA verification, Fair Housing steering
  refusal, and allergen non-guarantee are all testable, auditable rules, not
  vibes.

## Tech stack, one line

Next.js 16 + React 19 + TypeScript, Supabase (Postgres + Auth + RLS), Ultravox
(voice, with Retell as fallback) + Twilio (telephony, with Telnyx as a
cost-optimized alternative), Zod validation throughout, shadcn/ui + Tailwind
for the dashboard.

## What's live vs. what needs real credentials

| Live today (mock or seeded) | Needs real credentials to go fully live |
|---|---|
| Full dashboard UI across all 3 verticals | Real Twilio account (phone numbers, live inbound routing) |
| 3 seeded demo tenants with realistic data | Real Ultravox account (live voice minutes) |
| Deterministic compiler + policy engine + tool gateway | Real Google Calendar / Square / HubSpot OAuth per tenant |
| 140-scenario evaluation suite (40 HC + 40 RST + 40 RE + 20 adversarial) | Outbound calling (feature-flagged off; needs consent infrastructure) |
| `VOICE_PROVIDER=mock` / `TELEPHONY_PROVIDER=mock` local dev mode | HIPAA BAA / formal PHI compliance review for real patient data |
| RLS-enforced multi-tenant database (30 policies, ~90 tables) | Production Supabase project (currently local/dev) |

## Closing line

*"We did not build three voice demos. We built one vertical-agent operating
system, and Sunrise Medical, Bellas Italian, and Metro Realty are three
tenants running on top of it — with a fourth vertical being a config file
away, not a rewrite."*
