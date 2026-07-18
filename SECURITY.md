# Security Policy

VerticalVoice AI is a multi-tenant AI voice-calling platform handling
call transcripts, recordings, and — in the healthcare vertical —
PHI-adjacent data (patient name, phone, DOB, appointment reason). This
document describes what security controls actually exist in the codebase
today, and what does not, so nobody assumes guarantees that aren't there.

This is a Final Year Project (DHA Suffa University, Business Analytics &
Programming) that is also deployed and reachable at
https://verticalvoice.alphaos.tech. Treat reports accordingly.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting for this repository:
**Security tab → Report a vulnerability** (creates a private security
advisory visible only to maintainers), or go directly to
https://github.com/alifakhar816/verticalvoice-ai/security/advisories/new.

This mechanism always exists for any GitHub repository with Advisories
enabled and does not require guessing an email address. Include:

- A description of the issue and its impact (e.g. cross-tenant data
  access, auth bypass, webhook spoofing)
- Steps to reproduce, including whether it requires `mock` or a live
  provider (`twilio` / `telnyx` / `ultravox`) to trigger
- Affected file(s)/route(s) if known

We will acknowledge reports and work with you on disclosure timing before
any public write-up.

## Supported versions

This is a single-branch (`master`), pre-1.0 academic/production project —
there is no long-term-support branch matrix. Only the latest commit on
`master` is supported; please report issues against the current `HEAD`.

## Security model

What's actually implemented, with pointers into the code:

- **Tenant isolation via Supabase Row-Level Security (RLS).** All
  tenant-scoped tables enforce RLS policies so one tenant cannot read or
  write another tenant's data through the standard client. Service-role
  access (which bypasses RLS) is confined to specific server-side paths
  that need it (webhook ingestion, provisioning) — see
  `docs/architecture/` for which routes use the service-role client and why.
- **Signed tool tokens** (`TOOL_TOKEN_SECRET`,
  `src/lib/telephony/tool-token.ts`) authenticate tool-calling requests
  from the voice runtime (Ultravox) back into `/api/v1/tools/*`, so the
  tool gateway only accepts calls carrying a token minted for that
  specific call/tenant.
- **Call access tokens** (`CALL_TOKEN_SECRET`) are signed JWTs
  (`jsonwebtoken`) used to authorize access to call-specific resources
  (e.g. browser-based test calling, call detail access) without requiring
  a full session for every context.
- **Twilio webhook signature validation**
  (`src/providers/telephony/twilio/adapter.ts`) verifies the
  `X-Twilio-Signature` header against `TWILIO_AUTH_TOKEN` before trusting
  inbound webhook payloads (status callbacks, inbound-call webhooks).
- **Telnyx webhook signature validation**
  (`src/app/api/v1/webhooks/telnyx/route.ts`) verifies the
  `telnyx-signature-ed25519` header as a real ed25519 cryptographic
  signature over `${timestamp}|${rawBody}` against the public key in
  `TELNYX_WEBHOOK_SECRET`, in addition to the pre-existing 5-minute
  timestamp freshness check (replay protection). The route fails closed
  (`503`) if `TELNYX_WEBHOOK_SECRET` is unset, and is only reachable when
  `TELEPHONY_PROVIDER=telnyx` (`404` otherwise) — see "Known gaps, fixed"
  below for the history of this control.
- **Idempotency keys** (`src/lib/idempotency/`, and the tool gateway's
  idempotency cache in `src/lib/tools/gateway.ts`) prevent duplicate
  side-effecting operations (e.g. duplicate bookings/orders) when
  providers retry webhooks or tool calls.
- **Audit events** are recorded for tool-gateway calls and other
  security-relevant actions (see `audit_events` usage in
  `src/lib/tools/gateway.ts`), giving a trail for who/what triggered a
  given action on a call.
- **PII/PHI redaction** (`src/lib/tools/redaction.ts`) redacts sensitive
  fields before they reach logs/observability, reducing the blast radius
  of log exposure for patient/customer data captured during calls.
- **Rate limiting** (`src/lib/security/rate-limit.ts`) throttles
  request/tool-call volume per tenant/caller.

## Known gaps (disclosed, not hidden)

- **[FIXED] Telnyx webhook route accepted unauthenticated writes.**
  `src/app/api/v1/webhooks/telnyx/route.ts` is a standalone public Next.js
  API route — it is **not** gated by `TELEPHONY_PROVIDER` and was
  reachable on the deployed app regardless of which telephony provider was
  configured. This is a materially different (and worse) exposure than an
  earlier version of this document claimed: that earlier version inspected
  only `src/providers/telephony/telnyx/adapter.ts`'s `validateWebhook`
  (which is not what the route actually calls) and concluded the gap was
  "not reachable in the default configuration." **That was incorrect.**
  The route itself, independent of the adapter, is what processes
  inbound requests and writes to the database.

  Before the fix, the route only checked that a `telnyx-timestamp` header
  was present and within a 5-minute window, and that a
  `telnyx-signature-ed25519` header was merely *present* — the signature
  bytes were never cryptographically verified. If `TELNYX_WEBHOOK_SECRET`
  was unset, validation was skipped entirely (`console.warn` and
  continue). Concretely, anyone who found the URL could `POST` arbitrary
  JSON with a fresh timestamp and any garbage signature to: mark calls
  `completed` with an attacker-chosen `duration_seconds`, overwrite
  `recording_url` on an existing call row with an arbitrary URL, or write
  fabricated `audit_events` rows — all via `createAdminClient()`, a
  service-role client that bypasses RLS.

  **Fix applied:**
  - The route now performs real ed25519 signature verification (Node's
    built-in `crypto`, no new dependency) over `${timestamp}|${rawBody}`,
    using the raw request body (not a re-serialized `JSON.stringify` of
    the parsed body, which would silently break verification).
  - If `TELNYX_WEBHOOK_SECRET` is unset, the route now fails closed
    (`503`) instead of skipping validation.
  - The route now rejects (`404`) unless `TELEPHONY_PROVIDER=telnyx`,
    matching the resolution logic in `src/providers/telephony/index.ts`.
  - The 5-minute timestamp freshness check is retained as replay
    protection **in addition to**, not instead of, signature
    verification.

  **Residual risk:** `src/providers/telephony/telnyx/adapter.ts`'s
  `validateWebhook` function still contains the old present-but-unverified
  stub. It is dead code — nothing in the codebase calls it — but it exists
  and could mislead a future integrator into treating it as real
  verification if they wire it up elsewhere. It should be fixed to match
  the route's verification (or removed) in a follow-up. Separately,
  `src/lib/webhooks/signature.ts` exports a `validateTelnyxSignature`
  function that is also unused dead code and is **substantively wrong**:
  it computes an HMAC-SHA256 over `timestamp + body` using the "public
  key" string as an HMAC secret, which is not how Telnyx ed25519 webhook
  signing works at all. Neither of these dead functions is reachable from
  any live route today, but both should be corrected or deleted so they
  don't get copy-pasted into a future webhook handler.

- **In-memory rate limiting and idempotency cache are per-process,** not
  shared across instances. If the app is horizontally scaled, effective
  limits are `limit × instance count`, and a retried request routed to a
  different instance won't hit the idempotency cache. See
  [`docs/compliance/known-limitations.md`](docs/compliance/known-limitations.md)
  ("Infrastructure & accounts") for the full detail — this is a known
  scaling limitation, not a data-isolation bug, but it's listed here
  because it affects duplicate-action protection under load.

- **No confirmed HIPAA BAAs, no formal breach-notification process, no
  SOC 2/ISO certifications.** The healthcare vertical stores
  PHI-adjacent data, but there are no signed Business Associate
  Agreements with Supabase, Twilio/Telnyx, or any LLM/transcription
  provider used here. **Do not represent this project as HIPAA-compliant
  or production-ready for real patient data.** Full detail, including
  consent/outbound-calling gaps and data-retention gaps, is tracked in
  [`docs/compliance/known-limitations.md`](docs/compliance/known-limitations.md)
  — that file is the canonical, living list; this section summarizes the
  parts most relevant to reporting a security issue.

If you find a gap not listed above or in
`docs/compliance/known-limitations.md`, that's exactly what the private
vulnerability report process above is for.
