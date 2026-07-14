# Known Limitations

An honest, current list of what VerticalVoice AI does **not** yet have in
place, so nobody (internally or externally) assumes production-grade
guarantees that don't exist. Update this file as gaps are closed — don't
let it go stale.

## Compliance & legal

- **No signed HIPAA Business Associate Agreements (BAAs).** The healthcare
  vertical stores PHI-adjacent data (`appointments.patient_name`,
  `patient_phone`, `patient_dob`, `reason`, call transcripts) but there are
  no confirmed, signed BAAs with Supabase, the telephony providers
  (Twilio/Telnyx), or any LLM/transcription provider in this repo or its
  docs. **Do not market this as HIPAA-compliant until BAAs are executed and
  a compliance review is complete.**
- **No formal breach notification process.** `docs/runbooks/incident-response.md`
  covers technical containment steps but there is no legal/regulatory
  breach-notification playbook (timelines, required disclosures per
  jurisdiction) or retained counsel for this.
- **Privacy policy is an outline, not a published policy.** See
  `docs/compliance/privacy-policy-outline.md` — it is explicitly a
  structural checklist for counsel, not a document that should be shown to
  end users as-is.
- **No confirmed SOC 2 / ISO 27001 / other certifications.** Don't claim
  them in sales materials until actually obtained.
- **Data subject rights are tenant-scoped, not individual-scoped.** The
  `/api/v1/privacy/export` and `/api/v1/privacy/delete` endpoints
  (`src/app/api/v1/privacy/`) operate on an entire tenant's data. There is
  no self-service path yet for a single end-customer (e.g. one patient or
  diner) to request deletion of just their own record.
- **No automated data retention/expiry.** Data (recordings, transcripts,
  PII) is retained indefinitely until an admin explicitly triggers
  deletion. No scheduled job purges old data per a retention policy.

## Consent & telephony

- **Outbound calling requires consent infrastructure that isn't fully
  activated.** `POST /api/v1/calls/outbound` exists, but the platform does
  not runtime-enforce two-party-consent recording laws by caller
  jurisdiction, TCPA-style outbound consent tracking, or Do-Not-Call
  registry checks. `policy_settings.recording_consent_required` is a
  boolean flag a tenant can set, but there's no automatic detection of
  which states/countries actually require it, and no enforced opt-in
  capture flow for outbound calls before this ships to production use with
  real consumers.
- **No automatic provider failover.** Each tenant is wired to a single
  telephony/voice provider config; if Twilio/Telnyx/Ultravox has an
  outage, there's no automatic cutover to a backup provider (see
  `docs/runbooks/incident-response.md` § Provider outage).

## Infrastructure & accounts

- **Voice/telephony providers need real, paid, production accounts.**
  Development likely runs against trial/sandbox credentials
  (`TWILIO_ACCOUNT_SID`, `ULTRAVOX_API_KEY`, `TELNYX_API_KEY` in
  `.env.example` are placeholders). Trial accounts typically have caller-ID
  verification requirements, rate caps, and watermarked/limited
  functionality that will not match production behavior. Confirm paid
  production accounts, verified phone numbers, and provider-side
  compliance (e.g. Telnyx/Twilio KYC for A2P messaging if SMS is used) are
  in place before onboarding real tenants.
- **No load testing performed at scale.** The rate limiter
  (`src/lib/security/rate-limit.ts`) and tool gateway rate limits
  (`src/lib/tools/gateway.ts`) are in-memory, per-process — untested under
  concurrent multi-instance load or high call volume. No load/stress
  testing has been run against realistic concurrent-call volumes, webhook
  burst rates, or database connection limits under load.
- **In-memory rate limiting is per-instance, not shared.** If the app is
  horizontally scaled across multiple Node.js instances, each instance
  enforces its own rate-limit counters independently — the effective limit
  across the fleet is `limit × instance count`, not `limit`. Fine at
  current scale; would need a shared store (e.g. Redis) to enforce a true
  global limit once horizontally scaled.
- **Idempotency cache in `src/lib/tools/gateway.ts` is also in-memory and
  per-process** — a retried request routed to a different instance won't
  see the cached result. Same caveat as rate limiting.
- **No confirmed production hosting/deployment pipeline documented in this
  repo.** `docs/runbooks/incident-response.md` § "General rollback" flags
  this explicitly — there's no automated blue/green or canary deploy
  process captured here.
- **Backup/restore has a documented drill procedure
  (`docs/runbooks/backup-restore.md`) but the drill has not necessarily
  been run yet.** An untested backup is not a verified backup — run the
  drill before relying on it during a real incident.

## Application-level gaps

- **Telnyx webhook signature verification is incomplete.** Per the `TODO`
  comment in `src/app/api/v1/webhooks/telnyx/route.ts`, full Ed25519
  signature verification isn't implemented — only timestamp freshness is
  checked when `TELNYX_WEBHOOK_SECRET` is set. This is weaker than the
  HMAC verification used for Twilio/Ultravox.
- **Webhook `calls` upserts don't set `tenant_id`.** The Twilio/Telnyx/
  Ultravox webhook handlers upsert into `calls` keyed by
  `provider_call_id` without setting `tenant_id` on the insert path — this
  means dead-letter tenant resolution (see
  `docs/runbooks/incident-response.md`) depends on a prior write having
  set it, and is a gap worth closing (calls should be tenant-scoped from
  creation, e.g. via the phone number → tenant mapping in `phone_numbers`).
- **Dead letter queue requires a resolvable `tenant_id` to record a
  failure.** If a webhook fails before any `calls` row exists for that
  `provider_call_id` (so tenant lookup fails), the failure is logged via
  `logger.error` only — it is not durably queued and will not show up in
  `dead_letter_events` for later replay. See `src/lib/jobs/dead-letter.ts`
  and the webhook route `catch` blocks.
- **No automated accessibility test suite.** The accessibility fixes in
  this pass (`src/app/(marketing)/page.tsx`, `src/app/(auth)/login/page.tsx`,
  `src/app/dashboard/overview/page.tsx`, `src/components/shared/app-sidebar.tsx`,
  `src/components/marketing/header.tsx`) were manual/targeted, covering
  only those files — not a full WCAG audit of all ~60+ pages, and not
  backed by an automated a11y linter/CI check.
- **Rollback runbook covers agent-config rollback, not infrastructure
  rollback.** `POST /api/v1/agents/[id]/rollback` reverts a tenant's agent
  configuration; it does not roll back application code deploys, database
  migrations, or provider-side configuration changes.

## How to use this file

Before selling into a new vertical, signing a new tenant with sensitive
data requirements (especially healthcare), or making external claims about
security/compliance posture, review this list and confirm which items have
actually been closed since it was last updated.
