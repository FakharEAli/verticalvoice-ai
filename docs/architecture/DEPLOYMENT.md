# Deployment

VerticalVoice AI runs across four environments. Each has its own Supabase
project, its own set of live/mock provider credentials, and its own risk
posture around PHI handling and outbound calling. Never point two
environments at the same Supabase project — tenant data, RLS policies, and
audit logs must stay isolated per environment.

## Environments

| Environment | Purpose | Supabase Project | Phone Numbers | PHI Mode | Outbound Calling |
|---|---|---|---|---|---|
| **Local** | Individual developer machines | Local Docker instance (`supabase start`) | None — `VOICE_PROVIDER=mock`, `TELEPHONY_PROVIDER=mock` | OFF | OFF |
| **Preview** | Per-PR Vercel preview deployments | Dedicated free-tier Supabase project (e.g. `verticalvoice-preview`), shared across all preview deployments, reset periodically | None — mock providers only | OFF | OFF |
| **Staging** | Pre-release QA, demo rehearsals | Dedicated free-tier Supabase project (e.g. `verticalvoice-staging`) | Sandbox/test numbers only (Twilio test credentials or a single non-production DID) | OFF | OFF |
| **Production** | Live customer traffic | Dedicated production Supabase project (e.g. `verticalvoice-prod`) | Real, purchased numbers (Twilio/Telnyx) | OFF, unless a documented compliance review has explicitly signed off | OFF by default; only ON after the compliance checklist below is complete |

Key rules that apply everywhere except a fully reviewed production environment:

- **`phi_mode` stays `false`.** The flag is hardcoded to `false` in
  `src/config/features.ts` regardless of environment variables — it cannot be
  flipped on by an env var alone. Enabling it for real requires a code change
  plus legal/compliance sign-off (see `docs/compliance/`).
- **Outbound calling stays off by default everywhere**, including
  production, until the compliance checklist (consent language, opt-out
  handling, calling-hours restrictions, do-not-call list integration) has
  been completed and documented. See `docs/compliance/` and
  `docs/architecture/FEATURE-FLAGS.md`.
- **No real phone numbers below staging.** Local and Preview always run with
  `VOICE_PROVIDER=mock` and `TELEPHONY_PROVIDER=mock` so no real calls can be
  placed and no telephony costs are incurred.

## Deploying to Vercel

1. **Link the GitHub repo.**
   - In the Vercel dashboard, click **Add New → Project**.
   - Import `alifakhar816/verticalvoice-ai` from GitHub.
   - Vercel auto-detects the Next.js framework from `vercel.json` /
     `package.json`; leave the build command as `npm run build`.
2. **Set environment variables** (Vercel dashboard → Project → Settings →
   Environment Variables). Add every variable from `.env.example`, scoped
   per Vercel environment:
   - **Production** scope → production Supabase keys, real Twilio/Telnyx
     credentials, real `ULTRAVOX_API_KEY`, `VOICE_PROVIDER=ultravox`,
     `TELEPHONY_PROVIDER=twilio` (or your chosen providers).
   - **Preview** scope → preview Supabase project keys,
     `VOICE_PROVIDER=mock`, `TELEPHONY_PROVIDER=mock`.
   - Set `CALL_TOKEN_SECRET` uniquely per environment (`openssl rand -hex 32`).
   - Leave feature-flag env vars (`NEXT_PUBLIC_FF_*`) unset/`false` unless a
     specific vertical is being demoed.
3. **Connect a custom domain** (optional).
   - Project → Settings → Domains → add the domain.
   - Follow Vercel's DNS instructions (A/CNAME record) at your registrar.
   - Update `NEXT_PUBLIC_APP_URL` to the final domain so OAuth callbacks and
     webhook URLs resolve correctly.
4. **Trigger the first deploy** by pushing to `master` (production) or
   opening a PR (preview). The GitHub Actions workflow in
   `.github/workflows/ci.yml` runs type-check, lint, build, and tests on
   every push/PR — treat a red CI run as a blocker before merging, since
   Vercel will deploy whatever lands on `master` regardless of CI status.

## Setting up a production Supabase project

1. Create a new project in the Supabase dashboard, named clearly (e.g.
   `verticalvoice-prod`) and in a region close to your primary customer base.
2. Apply the schema migration:
   ```bash
   supabase link --project-ref <production-project-ref>
   supabase db push
   ```
   This applies `supabase/migrations/001_initial_schema.sql`. Review the
   migration diff before pushing to a live project.
3. **Do not run `supabase/seed.sql` against production.** Seed data
   contains fake demo tenants, agents, and a demo user
   (`demo@verticalvoice.ai`) — it is for local and staging only. To seed
   staging:
   ```bash
   supabase link --project-ref <staging-project-ref>
   supabase db push
   psql "$STAGING_DATABASE_URL" -f supabase/seed.sql
   ```
4. Copy the project's URL and keys (Settings → API) into Vercel's Production
   environment variables as described above.
5. Configure Supabase Auth: allowed redirect URLs, Google OAuth client
   (production client ID/secret, separate from local/staging), and email
   templates.
6. Confirm Row-Level Security is enabled on every table before going live —
   the service-role key bypasses RLS and must never be exposed to the
   browser or committed to source control.

## Rollback procedure

Two independent rollback mechanisms exist — use the one that matches what
broke.

### 1. Application rollback (Vercel instant rollback)

If a deploy introduces a bug in the app itself (UI, API route, build
artifact):

1. Go to the Vercel dashboard → Project → Deployments.
2. Find the last known-good deployment.
3. Click the "..." menu → **Promote to Production** (Vercel's instant
   rollback). This repoints production traffic to the previous build with no
   rebuild required — typically live within seconds.
4. Separately, revert or fix the offending commit on `master` so the next
   deploy doesn't reintroduce the bug.

### 2. Agent configuration rollback

If a voice agent's compiled configuration (prompt, tools, policies) starts
misbehaving after a new version was published, roll back the agent config
independently of the app deployment using the existing rollback endpoint:

```
POST /api/v1/agents/{id}/rollback
Body: { "tenant_id": "<uuid>", "version_id": "<uuid of the known-good agent_versions row>" }
```

This creates a new `agent_versions` row that copies the target version's
`config`/`config_hash` and marks it `active` (it does not delete history —
rollback is itself a new, auditable version). The action is logged to
`audit_events` with action `agent.rolled_back`. Requires the caller to be an
authenticated member of the tenant.

To find the right `version_id`, list an agent's version history via
`GET /api/v1/agents/{id}/versions` and pick the last version known to behave
correctly.
