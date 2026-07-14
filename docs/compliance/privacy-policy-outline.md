# Privacy Policy — Structural Outline

**This is not legal advice and is not a publishable privacy policy.** It is
a structural checklist of what a real privacy policy needs to cover for
VerticalVoice AI, so legal counsel has a starting point that already
reflects what the product actually does. Every section below needs review
by a qualified privacy/data-protection lawyer before publication,
especially given the multi-vertical (healthcare/restaurant/real-estate)
and multi-jurisdiction nature of the product.

See `docs/compliance/known-limitations.md` for what's honestly *not* in
place yet (e.g. no signed HIPAA BAAs) — the published policy must not claim
protections that don't actually exist.

## 1. Who this policy covers

- VerticalVoice AI as the platform operator (data controller/processor
  distinction matters — see section 8).
- Each **tenant** (the business using VerticalVoice AI) as a separate data
  controller for their own end-customers' data (callers, patients, diners,
  leads). VerticalVoice AI acts as a data **processor** on the tenant's
  behalf for call data.
- End-users of the tenant (callers) whose voice/PII is captured during
  calls.

## 2. What data is collected

Map directly to what the schema actually stores
(`src/lib/database/types.ts`):

- **Account/tenant data**: `tenants`, `business_profiles`, `tenant_members`
  (admin/user emails, names).
- **Call data**: `calls` (caller/called numbers, duration, recording URL),
  `call_transcripts` (full transcript content, `is_redacted` flag).
- **Industry-specific data**: `appointments` (patient name/phone/DOB/reason
  — healthcare), `reservations`/`orders` (guest name/phone/email —
  restaurant), `real_estate_leads` (name/phone/email/budget/preferences —
  real estate).
- **Usage/billing data**: `usage_ledger`, `usage_limits`.
- **Audit/operational data**: `audit_events` (who did what, when — includes
  actor IDs and metadata).

## 3. How data is collected

- Directly from tenant admins (signup, business profile setup).
- From end-customers via phone calls handled by the AI agent (voice →
  transcript → structured data extraction into appointments/orders/leads).
- From telephony/voice providers via webhooks (Twilio, Telnyx, Ultravox —
  see `src/app/api/v1/webhooks/`).

## 4. Legal basis for processing

Depends on jurisdiction (GDPR, CCPA, state-level US laws, healthcare-specific
regimes) and needs counsel input per the tenant's/end-user's jurisdiction.
Likely bases: contract performance (providing the calling service to the
tenant), legitimate interest (call quality/analytics), and consent (for
recording, where required by two-party-consent states/countries).

**Known gap:** recording consent is a policy setting
(`policy_settings.recording_consent_required`) but the actual runtime
enforcement of two-party consent laws by caller jurisdiction is not fully
built — see `known-limitations.md`.

## 5. How data is used

- Operating the AI voice agent (answering calls, booking
  appointments/reservations, qualifying leads).
- Tool execution and policy enforcement (`src/lib/tools/gateway.ts`).
- Usage-based billing (`src/domain/usage/service.ts`).
- Product analytics and audit logging.
- **Not** used for: third-party advertising, sale of personal data (state
  this explicitly if true — verify against actual practice before
  publishing).

## 6. Data retention

- Needs an explicit, documented retention period per data category (call
  recordings, transcripts, PII in appointments/leads). Currently **no
  automated retention/expiry job exists** in this codebase — see
  `known-limitations.md`. This must either be built or the policy must
  accurately describe indefinite retention until deletion is requested.
- Dead-lettered events (`dead_letter_events`) and audit logs
  (`audit_events`) retention also needs a stated policy.

## 7. Data subject rights (export & deletion)

This is the section directly backed by shipped functionality:

- **Right to access / data portability**: `POST /api/v1/privacy/export`
  (`src/app/api/v1/privacy/export/route.ts`, backed by
  `exportTenantData` in `src/domain/privacy/service.ts`) — returns a JSON
  bundle of all tenant-scoped data (business profile, calls, transcripts,
  appointments/reservations/orders/leads depending on industry).
- **Right to deletion/erasure**: `POST /api/v1/privacy/delete`
  (`src/app/api/v1/privacy/delete/route.ts`, backed by `deleteTenantData`)
  — supports `mode: "soft"` (tenant marked deleted, data retained for a
  recovery window) and `mode: "hard"` (irreversible purge of tenant-scoped
  tables). Requires explicit `confirm: true` and admin/owner role; logged to
  `audit_events`.
- **Important scoping note:** these endpoints operate at the **tenant**
  level (all data for a business), not at the individual end-customer
  level (e.g. a single caller/patient requesting their own data be
  deleted). A real privacy policy serving individual data subject requests
  (a single patient asking "delete my records") needs a
  narrower-scoped deletion path that this codebase does not yet have —
  flag this explicitly as a gap, don't imply per-individual self-service
  exists today.
- The policy should state the process/timeline for a tenant or end-user to
  request export/deletion (who to contact, expected turnaround), since
  these endpoints are currently admin-triggered via API, not a self-service
  UI.

## 8. Sub-processors / third parties

List every third party that touches tenant/caller data:

- Supabase (database, auth, storage).
- Telephony/voice providers: Twilio, Telnyx, Ultravox (call audio,
  metadata, transcripts pass through these).
- Any AI/LLM providers used for transcript processing or voice generation
  (confirm exact providers and whether they retain data for training —
  this is a common gap; verify contractually before publishing a claim).
- Hosting provider.

## 9. Security measures (high level, not implementation detail)

Reference the *existence* of controls without over-promising:

- Webhook signature verification, tenant isolation, role-based access,
  audit logging, rate limiting. Do not claim SOC 2 / ISO 27001 / specific
  certifications unless actually obtained — see `known-limitations.md`.

## 10. Healthcare-specific (HIPAA) considerations

**Explicitly flag current status**: no signed Business Associate Agreements
(BAAs) with sub-processors are confirmed in place per
`known-limitations.md`. A healthcare tenant's privacy policy addendum (or
a HIPAA Notice of Privacy Practices) **cannot claim HIPAA compliance**
until BAAs are executed and a compliance review is done. This is the single
highest-risk gap for the healthcare vertical.

## 11. Children's data

State whether the service is intended for use where callers may be minors
(e.g. pediatric healthcare tenants) and what special handling applies
(COPPA if US, similar regimes elsewhere).

## 12. International data transfers

Depends on where Supabase project region + telephony providers process
data vs. where tenants/callers are located. Needs a stated mechanism
(SCCs, adequacy decisions, etc.) if data crosses borders — verify actual
infrastructure region before drafting this section.

## 13. Changes to this policy & contact information

Standard boilerplate — version history, effective date, and a real contact
channel for privacy requests (should route to whoever owns triggering the
export/delete endpoints above, since there's no self-service UI yet).

---

**Next step:** hand this outline to counsel along with
`docs/compliance/known-limitations.md` so the published policy doesn't
overstate protections the platform doesn't yet provide.
