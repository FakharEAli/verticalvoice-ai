# Changelog

All notable changes to VerticalVoice AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Reconstructed from the project's git history (`git log --reverse`),
covering commits `eff144b`..`314124a`, 2026-07-14 to 2026-07-18 (36 commits
on `master`, plus this packaging pass).

## [Unreleased]

Open-source packaging for public release: `CONTRIBUTING.md`, `SECURITY.md`,
`CODE_OF_CONDUCT.md`, this `CHANGELOG.md`, GitHub issue forms, PR template,
and Dependabot configuration.

## [1.0.0] - 2026-07-18

Initial public release. Built as a Final Year Project (DHA Suffa
University, Business Analytics & Programming) and deployed live at
https://verticalvoice.alphaos.tech. Four days of active development,
2026-07-14 to 2026-07-18.

### Added

- Multi-tenant AI voice-calling platform foundation: Next.js App Router
  app, Supabase (Postgres + RLS) backend, tenant/agent/call domain model
  (`eff144b`).
- 10-step onboarding wizard and full industry packs for healthcare,
  restaurant, and real estate verticals (`10e7a53`).
- Voice and telephony provider adapters (Ultravox, Twilio, mock), domain
  services, API routes, and the full operator dashboard (`cdfbb58`).
- Third-party integrations (calendars, CRM, EHR, messaging, POS,
  reservations), database migrations, public marketing pages, the tool
  gateway, and background workers (`2f04a54`).
- Vertical-specific domain services, evaluation scenarios, and
  architecture documentation (`e97ad6d`).
- Production hardening pass: test suite, CI/CD pipeline, and a
  competition-ready project package (`a86a7f0`).
- Twilio inbound-call webhook bridging live calls into Ultravox
  (`74d47e5`).
- Real outbound calling — Twilio + Ultravox — with industry-specific call
  types (`9d85016`).
- Live browser-based test calling via Twilio Client (WebRTC) (`d904fa3`).
- AI-driven post-call actions: Ultravox tool-calling, per-industry
  handlers, call summaries, the Operations dashboard, and staff
  notifications (`5fa280e`).
- Gmail SMTP as the primary email provider for staff notifications
  (`ee7a9fc`).
- "Obsidian and Brass" design system applied across the product
  (`e4801e3`).
- Test Center call isolation: a wipeable test-call flag that keeps test
  calls out of real business data, surfaced everywhere with a visible
  Test badge instead of being hidden (`fd12fd2`, `fb48ca1`).
- Post-call data pipeline that reconciles transcript, recording, summary,
  and status from Ultravox after a call ends (`4c3bfb2`), including a
  reconcile sweep that backfills missing summaries/outcomes and
  evaluation scores (`51c13bd`, `b5f27d1`).
- Operations item detail sheets, a plain-English dashboard, real
  evaluation scores, and a Contacts system (`cdff7a5`).

### Fixed

- Build failures, lint errors, and local dev environment issues
  (`1758a2c`).
- Twilio signature validation failing behind a reverse proxy (`2a8392a`).
- Provider webhooks blocked by RLS — added a service-role admin client
  for server-side webhook ingestion (`21b4a46`).
- Missing unique constraint on `calls.provider_call_id` allowing
  duplicate call rows (`15a65da`).
- RLS blocking the tool gateway, background workers, and the dead-letter
  queue (`d9f67d0`).
- Status-callback handler inserting `audit_events` rows with missing
  required columns (`27af0f0`).
- Onboarding wizard not wired to the backend, an internal-user
  provisioning gap, and public marketing routes being unreachable
  (`5f000ae`).
- Tenant provisioning bootstrap blocked by RLS for real (non-service-role)
  users — routed through the service role (`812a518`).
- QA backlog across Call Detail, Analytics, Test Center, Team, Audit Log,
  the Agent toggle, and auth/marketing/onboarding polish (`6336697`).
- Two additional bugs surfaced by live production testing (`6849dc6`).
- Onboarding voice picker names not mapped to real Ultravox voice IDs
  (`9be10fe`).
- Live-call errors were being swallowed into a generic message instead of
  surfaced to the user (`e7efbf4`).
- Browser Access Tokens were signed with hand-rolled crypto instead of
  `jsonwebtoken` (`b06046c`).
- `/api/v1/tools/*` routes were incorrectly blocked by session-cookie auth
  middleware, breaking tool-calling from the voice runtime (`0f5eda5`).
- Bookings not surfacing on the dashboard: the agent now receives the
  current date, the operations window was widened, outcomes self-heal,
  and reconcile can be triggered on demand (`4bd92fc`).
- Tool calls that return an ID were being misreported as failed —
  id-returning tools are now treated as successful outcomes, fixing
  under-reported orders (`d24bec8`).
- Phone orders were missing the customer's name and showing placeholder
  values instead of hiding them (`cddfe52`).
- Order descriptions counted line items instead of ordered units
  (`314124a`).

[Unreleased]: https://github.com/alifakhar816/verticalvoice-ai/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/alifakhar816/verticalvoice-ai/releases/tag/v1.0.0
