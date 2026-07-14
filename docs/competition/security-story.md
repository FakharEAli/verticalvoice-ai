# VerticalVoice AI — Security Story

One page, verifiable against the actual codebase. Every claim below points at
a real file.

## 1. Multi-tenant isolation via Row-Level Security

- Data for Sunrise Medical Clinic, Bellas Italian Kitchen, and Metro Realty
  Group lives in the **same** Supabase PostgreSQL database, in the **same**
  tables, distinguished by a `tenant_id` column.
- Isolation is enforced at the database layer, not the application layer:
  `supabase/migrations/001_initial_schema.sql` defines **30 `CREATE POLICY`**
  statements implementing Row-Level Security across the schema's ~90 tables.
- The browser-facing Supabase client uses the **anon key** and is subject to
  RLS on every query. The **service-role key** (which bypasses RLS) is only
  used server-side, and only where the code explicitly needs cross-tenant
  operations (e.g. webhook ingestion before the tenant is resolved).
- Practical effect: even a bug in application code that forgets a `WHERE
  tenant_id = ?` clause cannot leak another tenant's patient records, menu
  data, or leads — the database itself refuses the row.

## 2. Deterministic policy engine — not LLM-decided

- Compliance rules (HIPAA verification, Fair Housing, allergen disclosure,
  emergency escalation) are evaluated by `src/industries/core/policies.ts`,
  a plain TypeScript function (`evaluateAllPolicies`) that matches structured
  `PolicyCondition`s against a `PolicyContext` — field equality, `in`/`not_in`,
  `gt`/`lt`, regex `matches`, etc.
- The LLM never decides whether a policy passes or fails. It can only trigger
  a tool call; the gateway then runs the deterministic policy check
  independently of what the model "believes" happened.
- Every `PolicyDecision` has an `allowed` boolean, a `severity`
  (`block`/`warn`/`log`), a `reason`, and where applicable a `regulation`
  field — so a `block` decision is auditable and reproducible outside the
  conversation.

## 3. Tool Gateway's 10-step validation pipeline

`src/lib/tools/gateway.ts`'s `handleToolCall()` runs every tool invocation
through, in order:

1. Authenticate the call-scoped JWT (`token.ts`)
2. Resolve the tenant from the call record and confirm it matches the token
3. Resolve agent config (redaction level, HIPAA mode) for that tenant
4. Confirm the tool is actually enabled for this specific call
5. Validate the tool's input against a registered Zod schema
6. Evaluate policies (`policies.ts`) — block on `severity: "block"` denials
7. Check an idempotency key to prevent duplicate execution
8. Execute the tool call, routed to the domain service
9. Apply PII/PHI redaction rules to the output
10. Log the tool run to `audit_events`

No step can be skipped by a crafted prompt — they are sequential function
calls in server code, not instructions the model can be talked out of.

## 4. Webhook signature verification

`src/lib/webhooks/signature.ts` plus the three webhook routes under
`src/app/api/v1/webhooks/` (`twilio/route.ts`, `ultravox/route.ts`,
`telnyx/route.ts`) verify the provider's signature on every inbound webhook
before any data is trusted or written. An unsigned or forged webhook claiming
"call ended, here's a fake transcript" is rejected before it reaches the
`call-normalizer` worker.

## 5. Call-scoped JWT, not browser auth, for voice tools

- `src/lib/tools/token.ts` issues an HMAC-signed JWT (`createCallToken`)
  scoped to a single `call_id`, `tenant_id`, and an explicit `enabled_tools`
  allowlist, with a short expiry (`exp`).
- This is a **different trust boundary** from the dashboard's Supabase Auth
  session. The voice runtime, which is talking to an anonymous caller on the
  phone, never receives a user's browser session — it only ever holds a
  token that can invoke a narrow, pre-approved set of tools for one call and
  then expires.
- The gateway's step 4 (tool enablement check) re-validates the token's
  `enabled_tools` list against the requested tool name on every call.

## 6. Data redaction (PHI / PCI)

- `src/lib/tools/redaction.ts` (`buildRedactionRules`, `redactOutput`)
  produces a rule set at `standard` or `strict` level. `strict` is used when
  `hipaa_mode` is on for the tenant (checked via `policy_settings` in step 3
  of the gateway).
- Redaction is applied to tool *output* (step 9) before it's returned to the
  voice runtime or logged, so sensitive fields don't round-trip into the
  conversation transcript or audit log unredacted.

## 7. Audit logging

- Every tool call — success or failure — is written to `audit_events`
  (`logToolRun()` in `gateway.ts`), including tool name, duration, status,
  and error message where applicable.
- The dashboard exposes this at `/dashboard/audit`, giving a tenant (and a
  judge) a verifiable trail of what the agent actually did on a call, not
  just what the transcript claims.

## 8. Rate limiting

- The `IndustryPack` tool interface (`src/industries/core/industry-pack.ts`)
  defines a `rateLimit` field (`maxCalls`, `windowSeconds`) as part of
  `ToolBinding`, so rate limits are declared per-tool, per-vertical, at the
  pack level rather than hardcoded once for the whole platform — e.g. a
  healthcare `check-insurance` call can be capped independently of a
  restaurant `get-menu` call. This is enforced as part of the tool
  configuration the gateway resolves before executing a tool (step 3/4).

## Bottom line for judges

None of the above is "the LLM promises to behave." Tenant isolation is a
database constraint. Compliance is a deterministic function with unit-testable
inputs and outputs. Tool access is a short-lived, narrowly-scoped signed
token, not a login session. Every decision point is logged. This is the
difference between a voice demo and a system a healthcare compliance
reviewer could actually audit.
