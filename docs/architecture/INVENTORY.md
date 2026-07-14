# Architecture Inventory

> VerticalVoice AI -- multi-vertical voice AI platform

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.2.10 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Database | Supabase PostgreSQL | @supabase/supabase-js 2.110+ |
| Auth | Supabase Auth | email/password, magic link, Google OAuth |
| Voice (primary) | Ultravox | via REST API |
| Voice (fallback) | Retell | via REST API |
| Telephony (primary) | Twilio | via REST API |
| Telephony (cost opt) | Telnyx | via REST API |
| Calendar | Google Calendar API | OAuth 2.0 |
| POS | Square | via REST API |
| CRM | HubSpot | via access token |
| Email | Resend | via API key |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui | 4.13+ |
| Validation | Zod | 4.4+ |
| SSR Integration | @supabase/ssr | 0.12+ |

## Database

- **Provider**: Supabase PostgreSQL
- **Migrations**: 2 SQL migration files in `supabase/migrations/`
- **Auth**: Supabase Auth with email/password, magic link, and Google OAuth
- **RLS**: Row-Level Security enforced; service-role key for server-side only

## Source Structure

```
src/
  app/              # Next.js App Router pages and API routes
  components/       # Shared React components (shadcn/ui based)
  config/           # Feature flags, app configuration
  domain/           # Domain logic per vertical (healthcare, restaurant, real-estate)
  hooks/            # React hooks
  industries/       # IndustryPack definitions and core framework
    core/           # industry-pack.ts, evaluations.ts, shared types
    healthcare/     # Healthcare pack implementation
    restaurant/     # Restaurant pack implementation
    real-estate/    # Real estate pack implementation
  integrations/     # Third-party service clients (Twilio, Ultravox, etc.)
  lib/              # Shared utilities (database, observability, auth)
  providers/        # React context providers
  tests/            # Evaluation scenario suites (140 scenarios)
    scenarios/      # Healthcare (40), Restaurant (40), Real Estate (40), Adversarial (20)
  workers/          # Background workers (evaluations, call processing)
  middleware.ts     # Next.js middleware (auth, tenant resolution)
```

## File Counts

| Category | Count |
|---|---|
| TypeScript/TSX files | ~201 |
| Source directories | ~152 |
| SQL migrations | 2 |
| Evaluation scenarios | 140 |

## Industry Verticals

| Vertical | Pack ID | Domain Path |
|---|---|---|
| Healthcare | `healthcare` | `src/industries/healthcare/`, `src/domain/healthcare/` |
| Restaurant | `restaurant` | `src/industries/restaurant/`, `src/domain/restaurant/` |
| Real Estate | `real_estate` | `src/industries/real-estate/`, `src/domain/real-estate/` |

## Key Interfaces

- **IndustryPack** (`src/industries/core/industry-pack.ts`): Pluggable vertical definition -- intents, tools, policies, evaluations, prompts, onboarding
- **EvaluationScenario** (same file): Test scenario structure for automated voice agent QA
- **EvaluationResult** (`src/industries/core/evaluations.ts`): Scored evaluation output with dimension breakdowns
- **FeatureFlags** (`src/config/features.ts`): Runtime feature toggles per vertical

## Integration Points

| Integration | Purpose | Auth Method |
|---|---|---|
| Ultravox | Voice AI conversation runtime | API key |
| Retell | Fallback voice runtime | API key |
| Twilio | Phone number provisioning, call routing | Account SID + Auth Token |
| Telnyx | Cost-optimized telephony | API key |
| Google Calendar | Appointment scheduling | OAuth 2.0 |
| Square | Restaurant POS integration | OAuth 2.0 |
| HubSpot | CRM lead sync for real estate | Access token |
| Resend | Transactional email | API key |
| Supabase | Database, auth, realtime | Anon key (client) / Service role key (server) |
