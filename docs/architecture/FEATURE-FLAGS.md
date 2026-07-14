# Feature Flags & Environment Safety

Feature flags are defined in `src/config/features.ts`. All flags default to
`false`/off. Runtime values are read from `NEXT_PUBLIC_*` environment
variables (client-visible, since flags gate UI behavior as well as
server logic) — see `.env.example` for the corresponding variable names.

| Flag | Env var | Default | Overridable via env? |
|---|---|---|---|
| `healthcare_demo_mode` | `NEXT_PUBLIC_FF_HEALTHCARE_DEMO_MODE` | `false` | Yes |
| `restaurant_ordering` | `NEXT_PUBLIC_FF_RESTAURANT_ORDERING` | `false` | Yes |
| `real_estate_outbound` | `NEXT_PUBLIC_FF_REAL_ESTATE_OUTBOUND` | `false` | Yes |
| `phi_mode` | `NEXT_PUBLIC_FF_PHI_MODE` (present in code but ignored) | `false` | **No — hardcoded `false` in `getFeatureFlags()`** |
| `outbound_calling` | `NEXT_PUBLIC_FF_OUTBOUND_CALLING` | `false` | Yes |

## Flag-by-flag detail

### `healthcare_demo_mode`
- **Gates**: Healthcare vertical demo behaviors — sample scenarios, scripted
  demo data paths, and any UI surfaces specific to showcasing the healthcare
  `IndustryPack` (`src/industries/healthcare/`) without touching real
  patient data.
- **Safe to enable**: Any environment (Local, Preview, Staging, Production)
  for sales demos or QA of the healthcare pack, as long as `phi_mode` stays
  off and no real patient data is entered. This flag does not itself gate
  PHI handling.

### `restaurant_ordering`
- **Gates**: The restaurant vertical's ordering flow (`src/industries/restaurant/`,
  `src/domain/restaurant/`) — menu lookups, order placement, and Square POS
  integration surfaces.
- **Safe to enable**: Any environment once the vertical is ready to demo or
  ship. In Staging/Production, confirm Square OAuth credentials are
  configured for that environment before enabling, or ordering calls will
  fail.

### `real_estate_outbound`
- **Gates**: Real estate vertical outbound-calling-adjacent UI (lead
  follow-up scheduling, HubSpot sync triggers) in
  `src/industries/real-estate/`, `src/domain/real-estate/`. This flag is
  distinct from the platform-wide `outbound_calling` flag below — it gates
  vertical-specific UI/logic, not the underlying ability to place outbound
  calls.
- **Safe to enable**: Only after `outbound_calling` is enabled and the
  compliance checklist (below) is complete, since enabling this without the
  platform-wide flag exposes UI for a capability that isn't actually live.

### `phi_mode` — NEVER enable outside a reviewed environment
- **Gates**: Any code path that would treat call/session data as containing
  Protected Health Information — stricter logging redaction, extended
  retention/encryption requirements, BAA-covered storage assumptions, and
  healthcare-specific compliance UI.
- **Current state**: `getFeatureFlags()` in `src/config/features.ts`
  hardcodes this to `false` regardless of any environment variable:
  ```ts
  phi_mode: false, // PHI mode is never enabled via env — requires code change
  ```
- **MUST remain `false`** in Local, Preview, Staging, and Production until a
  legal/compliance review has been completed and explicitly signed off (BAA
  in place with Supabase and any voice/telephony subprocessors, HIPAA
  technical safeguards implemented and audited, data retention/deletion
  policy documented). See `docs/compliance/`. Enabling it requires an actual
  code change to `getFeatureFlags()`, not just an env var — this is
  deliberate friction to prevent accidental activation. Do not remove that
  friction without compliance sign-off recorded in `docs/compliance/`.

### `outbound_calling` — OFF by default everywhere
- **Gates**: The platform-wide ability to originate outbound calls (as
  opposed to only receiving inbound calls). This is the master switch that
  controls whether Twilio/Telnyx outbound call APIs are ever invoked.
- **Safe to enable**: Only in Staging (with sandbox/test numbers, for
  end-to-end testing of the outbound flow) or Production, and only after
  completing an outbound-calling compliance checklist:
  - [ ] Consent/opt-in language reviewed and implemented before any number
        is dialed
  - [ ] Opt-out handling (STOP/do-not-call requests) implemented and tested
  - [ ] Calling-hours restrictions enforced per applicable jurisdiction
        (e.g. TCPA quiet hours in the US)
  - [ ] Do-not-call list integration verified
  - [ ] Rate limiting / dialing caps in place to avoid runaway costs or
        spam-like behavior
  - [ ] Sign-off recorded in `docs/compliance/`
- **Never enable** in Local or Preview — those environments run with
  `TELEPHONY_PROVIDER=mock`, so even if this flag were flipped on, no real
  calls would be placed, but the flag should still stay off to keep
  environment behavior predictable and testable.

## General rule

When in doubt, leave a flag off. Flipping a flag on is cheap (an env var
change + redeploy); the cost of an accidental PHI exposure or an
unauthorized outbound call is not. See `docs/architecture/DEPLOYMENT.md`
for how flags map to each of the four environments.
