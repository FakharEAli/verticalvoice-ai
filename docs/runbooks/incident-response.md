# Incident Response Runbook

Operational playbook for the most likely production incidents on VerticalVoice AI:
voice/telephony provider outages, database issues, webhook floods, suspected
data breaches, and how to roll back a bad agent configuration.

This is a **structural** runbook for a small team, not a formal IR policy.
See `docs/compliance/known-limitations.md` for what's explicitly out of scope
today (no on-call rotation, no paid incident tooling, etc).

## General incident flow

1. **Detect** — via provider status pages, error logs (`logger.error` entries
   are structured JSON, see `src/lib/observability/logger.ts`), Supabase
   dashboard alerts, or a user report.
2. **Triage** — is this affecting all tenants or one? Is it a hard outage or
   degraded service? Check `docs/runbooks/backup-restore.md` if data
   integrity is in question.
3. **Mitigate** — see the specific playbooks below.
4. **Communicate** — notify affected tenants if the incident is customer-visible
   and expected to last more than a few minutes.
5. **Resolve & document** — once fixed, write a short postmortem: what
   happened, blast radius, root cause, and the follow-up fix.

---

## 1. Provider outage (voice/telephony: Twilio, Telnyx, Ultravox)

**Symptoms:** calls failing to connect, webhooks stop arriving, provider
status page shows an incident, or the `calls` table stops updating for a
given `provider_call_id` (initiated/ringing but never progresses).

**Steps:**

1. Check the provider's public status page:
   - Twilio: https://status.twilio.com
   - Telnyx: https://status.telnyx.com
   - Ultravox: check their status/support channel (no public status page
     confirmed at time of writing — see known-limitations.md)
2. Confirm it's the provider and not us: check recent deploys, check
   `dead_letter_events` (via `listPendingDeadLetters` in
   `src/lib/jobs/dead-letter.ts`) for a spike in `webhook:twilio` /
   `webhook:telnyx` / `webhook:ultravox` entries — a spike there means our
   webhook handlers are failing, which could be us, not them.
3. If it's a genuine provider outage:
   - There is currently **no automatic failover** between telephony
     providers (VerticalVoice AI is single-provider per tenant today — see
     known-limitations.md). Inbound calls to the affected provider's numbers
     will fail until the provider recovers.
   - Post a status update if you have a status page / customer channel.
   - Once the provider recovers, replay any dead-lettered webhook events:
     `retryDeadLetter(id)` from `src/lib/jobs/dead-letter.ts` for each
     `pending` row, or run through `listPendingDeadLetters(tenantId)` per
     affected tenant.
4. If it's us (e.g. webhook signature validation flipped due to a rotated
   secret): check `TWILIO_AUTH_TOKEN` / `ULTRAVOX_WEBHOOK_SECRET` /
   `TELNYX_WEBHOOK_SECRET` env vars match what's configured in the provider
   dashboard, redeploy, then replay dead-lettered events as above.

---

## 2. Database issue (Supabase down, slow queries, connection exhaustion)

**Symptoms:** API routes timing out or returning 500s, Supabase dashboard
shows high CPU/connections, or the Supabase status page shows an incident.

**Steps:**

1. Check Supabase status: https://status.supabase.com
2. Check the project's own health in the Supabase dashboard (Database →
   Reports) for connection count, slow queries, and disk usage.
3. If it's a genuine Supabase platform outage: there's nothing to do but
   wait and monitor — Supabase Cloud is a managed dependency. Communicate to
   users if the outage is prolonged.
4. If it's connection exhaustion from our side (e.g. a runaway loop calling
   `createServerClient()` per-request without pooling issues, or a stuck
   long-running query):
   - Identify the offending query via Supabase's Query Performance view.
   - Kill it if possible (Database → Roles / `pg_terminate_backend` via SQL
     editor, requires care).
   - Look for recent deploys that introduced N+1 query patterns or missing
     `.limit()` calls.
5. If data appears corrupted or a bad migration/write went out: **stop
   writes** (put the app in maintenance mode / roll back the deploy that
   caused it) before attempting any repair, then follow
   `docs/runbooks/backup-restore.md` to assess whether a point-in-time
   restore is needed.

---

## 3. Webhook flood (retry storm, replay attack, or provider misbehavior)

**Symptoms:** spike in requests to `/api/v1/webhooks/*`, elevated database
load from `audit_events`/`calls` writes, or repeated identical events.

**Steps:**

1. All three webhook routes (`src/app/api/v1/webhooks/{twilio,ultravox,telnyx}/route.ts`)
   already have:
   - **Signature validation** (HMAC, see `src/lib/webhooks/signature.ts`) —
     rules out unauthenticated flooding from being processed (invalid
     signatures return 401 immediately, cheaply).
   - **Idempotency checks** against `audit_events` (same `resource_id` +
     `action` is a no-op) — rules out duplicate-delivery floods from doing
     real work twice.
   - **Retry + dead-letter wiring** (`src/lib/jobs/retry.ts` /
     `src/lib/jobs/dead-letter.ts`) — a burst of failures durably queues
     instead of hammering the DB with unbounded retries.
2. Webhook routes are intentionally **excluded** from the proxy-level rate
   limiter (`src/proxy.ts` — provider-authenticated, and providers may
   legitimately burst-deliver many events after their own outage). If a
   flood is coming from an unauthenticated/spoofed source, the signature
   check rejects it before any DB write — confirm the webhook secret env
   vars (`TWILIO_AUTH_TOKEN`, `ULTRAVOX_WEBHOOK_SECRET`,
   `TELNYX_WEBHOOK_SECRET`) are set in production; if unset, the routes fall
   back to a **skip-validation warning** (dev-mode behavior) which is unsafe
   in production — this is the first thing to check.
3. If a specific IP/source is clearly abusive and signature validation
   somehow isn't stopping it, block at the infra layer (hosting
   provider/CDN firewall) — the app itself has no IP-blocklist mechanism.
4. If the flood is legitimate (e.g. provider replaying a large backlog after
   their own outage), let idempotency absorb it; monitor DB load and scale
   Supabase compute if needed.

---

## 4. Suspected data breach

**Steps:**

1. **Contain first, investigate second.** If a credential (Supabase service
   role key, provider API key, webhook secret) is suspected compromised,
   rotate it immediately in the provider dashboard and redeploy with the
   new value.
2. Check `audit_events` for the affected tenant(s) — every tool call,
   privacy export/delete, and webhook event is logged there
   (`src/lib/tools/gateway.ts` step 10, `src/app/api/v1/privacy/*`). Look for
   unexpected `privacy_export` / `privacy_delete_*` actions or tool calls
   from unfamiliar `actor_id`s.
3. Identify scope: which tenant(s), which tables, what data (PII/PHI risk
   depends on industry — healthcare tenants may hold patient data, see
   `docs/compliance/known-limitations.md` on HIPAA/BAA status).
4. If confirmed, this is a legal/compliance event, not just an engineering
   one — VerticalVoice AI does not currently have a formal breach
   notification process or legal counsel on retainer (see
   `docs/compliance/known-limitations.md`). Escalate to whoever owns that decision before
   any external communication.
5. Once contained, use `exportTenantData` (`src/domain/privacy/service.ts`)
   to capture the affected tenant's current data state for the incident
   record, and consider whether to `deleteTenantData` / rotate exposed
   tenant-facing tokens (call tokens, agent config secrets) as a precaution.

---

## 5. Rollback procedure (agent configuration)

Agent configs are versioned. To roll back a tenant's agent to a previous
known-good version:

1. List the agent's version history:
   `GET /api/v1/agents/[id]/versions` (see
   `src/app/api/v1/agents/[id]/versions/route.ts`).
2. Identify the `version_id` to roll back to (the last version known to be
   working, before the incident-causing change).
3. Call the rollback endpoint:
   ```
   POST /api/v1/agents/[id]/rollback
   { "tenant_id": "<uuid>", "version_id": "<uuid>" }
   ```
   (see `src/app/api/v1/agents/[id]/rollback/route.ts`). This requires the
   caller to be an authenticated member of the tenant — it verifies
   membership and that the target version belongs to the same agent before
   applying it.
4. Verify the rollback took effect — re-fetch the agent
   (`GET /api/v1/agents/[id]`) and confirm the active config hash matches
   the target version's `config_hash`.
5. If the agent was mid-compile or mid-activation when the incident
   started, also check `/api/v1/agents/[id]/compile` and
   `/api/v1/agents/[id]/activate` — a rollback resets the config but does
   not automatically re-run compile/activate; re-run those if the rolled
   back version needs to be re-activated for live calls.

## General rollback (application deploy)

There is no automated blue/green deploy or canary system documented in this
repo today. A bad deploy should be rolled back via your hosting platform's
standard "redeploy previous build" mechanism (document your specific
platform's steps here once production hosting is finalized — see
`docs/compliance/known-limitations.md`).
