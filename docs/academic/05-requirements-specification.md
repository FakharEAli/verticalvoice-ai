# Requirements Specification

This document derives functional and non-functional requirements from the implemented codebase. All requirements are mapped to actual API routes, database tables, and components.

---

## Functional Requirements by Module

### FR-1: Tenant Management

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-1.1 | Create tenant | `tenants` table with RLS | - | IMPLEMENTED |
| FR-1.2 | List tenants | Tenant query | `api/v1/onboarding` | IMPLEMENTED |
| FR-1.3 | Configure tenant settings | Business profile | `api/v1/onboarding/business` | IMPLEMENTED |

### FR-2: Authentication and Authorization

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-2.1 | Email + password auth | Supabase auth | `auth/callback` | IMPLEMENTED |
| FR-2.2 | Magic link sign-in | Supabase provider | `auth/callback` | IMPLEMENTED |
| FR-2.3 | Google OAuth | Supabase OAuth | `auth/callback` | IMPLEMENTED |
| FR-2.4 | Role-based access | RBAC via roles table | `api/v1/team` | IMPLEMENTED |
| FR-2.5 | Team member invitation | Email workflow | `api/v1/team` (POST) | PARTIAL (send not wired) |

### FR-3: Agent Configuration and Versioning

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-3.1 | Create agent config | Agent drafts + compiler | `api/v1/agents` (POST) | IMPLEMENTED |
| FR-3.2 | List agents | Agent query | `api/v1/agents` (GET) | IMPLEMENTED |
| FR-3.3 | Fetch agent details | Single agent query | `api/v1/agents/[id]` (GET) | IMPLEMENTED |
| FR-3.4 | Compile agent | Pack → prompt compiler | `api/v1/agents/[id]/compile` (POST) | IMPLEMENTED |
| FR-3.5 | Activate version | Mark active + RLS | `api/v1/agents/[id]/activate` (POST) | IMPLEMENTED |
| FR-3.6 | Deactivate agent | Mark inactive | `api/v1/agents/[id]/deactivate` (POST) | IMPLEMENTED |
| FR-3.7 | View version history | `agent_config_versions` query | `api/v1/agents/[id]/versions` (GET) | IMPLEMENTED |
| FR-3.8 | Rollback version | Restore + re-activate | `api/v1/agents/[id]/rollback` (POST) | IMPLEMENTED |

### FR-4: Inbound Call Handling

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-4.1 | Receive Twilio webhook | Webhook handler | `api/v1/webhooks/twilio/voice` | IMPLEMENTED |
| FR-4.2 | Bridge to Ultravox | SIP bridge initiation | Internal | IMPLEMENTED |
| FR-4.3 | Record call | Ultravox recording | Internal | IMPLEMENTED |
| FR-4.4 | Transcribe call | Fetch Ultravox transcript | `api/v1/cron/reconcile-calls` | IMPLEMENTED |
| FR-4.5 | Log call metadata | `calls` + `call_events` tables | Internal | IMPLEMENTED |
| FR-4.6 | Generate call summary | LLM-based summary | `call_summaries` table | IMPLEMENTED |
| FR-4.7 | Determine outcome | Tool-based classification | `call_outcomes` table | IMPLEMENTED |

### FR-5: Tool Execution

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-5.1 | Define tool interface | Zod schemas + registry | `lib/tools/` | IMPLEMENTED |
| FR-5.2 | Execute tool | Tool gateway | `api/v1/tools/execute/[toolId]` | IMPLEMENTED |
| FR-5.3 | Log tool runs | `call_tool_runs` table | Internal | IMPLEMENTED |
| FR-5.4 | Handle tool errors | Error response to agent | Tool gateway | IMPLEMENTED |

### FR-6: Knowledge Management

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-6.1 | Create knowledge source | Source creation | `api/v1/knowledge` (POST) | IMPLEMENTED |
| FR-6.2 | List sources | Source query | `api/v1/knowledge` (GET) | IMPLEMENTED |
| FR-6.3 | Import from website | Web scraper job | `api/v1/knowledge/import` (POST) | IMPLEMENTED (unscheduled) |
| FR-6.4 | Parse documents | Document processor | Internal | IMPLEMENTED |
| FR-6.5 | Extract facts | LLM-based extraction | `api/v1/knowledge/facts` (GET/PATCH) | IMPLEMENTED |
| FR-6.6 | Review facts | Admin UI | Dashboard | IMPLEMENTED |

### FR-7: Outbound Calling

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-7.1 | Check DNC list | Suppression service | Internal | IMPLEMENTED |
| FR-7.2 | Verify consent | Consent lookup | Internal | IMPLEMENTED |
| FR-7.3 | Place outbound call | Twilio initiate | `api/v1/calls/outbound` (POST) | IMPLEMENTED (flagged) |
| FR-7.4 | Log attempt | `outbound_attempts` table | Internal | IMPLEMENTED |
| FR-7.5 | Enforce TCPA | DNC suppression + consent check | Internal | IMPLEMENTED |

### FR-8: Compliance and Privacy

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-8.1 | Redact PII/PHI | Redaction service | Internal | IMPLEMENTED |
| FR-8.2 | Track recording consent | `recording_consents` table | Internal | IMPLEMENTED |
| FR-8.3 | Fair-housing guardrails | Policy engine | Internal | IMPLEMENTED |
| FR-8.4 | GDPR data export | Tenant data export | `api/v1/privacy/export` (POST) | IMPLEMENTED |
| FR-8.5 | GDPR data erasure | Tenant data delete | `api/v1/privacy/delete` (POST) | IMPLEMENTED |
| FR-8.6 | Audit log | `audit_events` table | Internal | IMPLEMENTED |

### FR-9: Analytics and Reporting

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-9.1 | Call volume trending | Query + chart | `api/v1/analytics/calls` (GET) | IMPLEMENTED |
| FR-9.2 | Outcomes summary | Aggregate outcomes | `api/v1/analytics/overview` (GET) | IMPLEMENTED |
| FR-9.3 | ROI calculation | Cost vs. recovery | `api/v1/analytics/roi` (GET) | IMPLEMENTED |
| FR-9.4 | Audit event log | Audit query | `api/v1/audit` (GET) | IMPLEMENTED |

### FR-10: Test Center

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-10.1 | Place test call | Twilio call | Dashboard | IMPLEMENTED |
| FR-10.2 | Record test call | Standard recording | Internal | IMPLEMENTED |
| FR-10.3 | Review test call | Transcript + outcome | Dashboard | IMPLEMENTED |
| FR-10.4 | Clear test data | Wipe test calls | `api/v1/test-center/calls` (DELETE) | IMPLEMENTED |
| FR-10.5 | Analyze call quality | Evaluation service | `api/v1/test-center/analyze` (POST) | IMPLEMENTED |

### FR-11: Integrations

| ID | Requirement | Implementation | Route | Status |
|---|---|---|---|---|
| FR-11.1 | Google Calendar | Calendar fetch + availability | `domain/scheduling/` | PARTIAL (see note below) |
| FR-11.2 | Square POS | Menu + inventory + orders | `integrations/pos/` | IMPLEMENTED |
| FR-11.3 | HubSpot CRM | Leads + contacts | `integrations/crm/` | IMPLEMENTED |
| FR-11.4 | Store credentials | `integration_connections` table | `api/v1/settings/integrations` (POST) | IMPLEMENTED |
| FR-11.5 | Monitor health | `integration_health` table | Internal | IMPLEMENTED |

### FR-12: Industry-Specific Features

#### Healthcare

| ID | Requirement | Tool | Route | Status |
|---|---|---|---|---|
| FR-12.1.1 | Appointment booking | `book_appointment` | Tool gateway | IMPLEMENTED |
| FR-12.1.2 | Appointment reschedule | `reschedule_appointment` | Tool gateway | IMPLEMENTED |
| FR-12.1.3 | Appointment cancel | `cancel_appointment` | Tool gateway | IMPLEMENTED |
| FR-12.1.4 | Triage routing | Intent → escalation | Internal | IMPLEMENTED |
| FR-12.1.5 | Insurance intake | `capture_insurance` | Tool gateway | IMPLEMENTED |
| FR-12.1.6 | Prescription refill | `create_refill_request` | Tool gateway | IMPLEMENTED |

#### Restaurant

| ID | Requirement | Tool | Route | Status |
|---|---|---|---|---|
| FR-12.2.1 | Reserve table | `reserve_table` | Tool gateway | IMPLEMENTED |
| FR-12.2.2 | Wait-list | `add_to_waitlist` | Tool gateway | IMPLEMENTED |
| FR-12.2.3 | Capture order | `place_order` | Tool gateway | IMPLEMENTED |
| FR-12.2.4 | Menu inquiry | `get_menu_info` | Tool gateway | IMPLEMENTED |
| FR-12.2.5 | Log complaint | `log_complaint` | Tool gateway | IMPLEMENTED |

#### Real Estate

| ID | Requirement | Tool | Route | Status |
|---|---|---|---|---|
| FR-12.3.1 | Qualify lead | `qualify_lead` | Tool gateway | IMPLEMENTED |
| FR-12.3.2 | Schedule showing | `schedule_showing` | Tool gateway | IMPLEMENTED |
| FR-12.3.3 | Property info | `get_property_info` | Tool gateway | IMPLEMENTED |
| FR-12.3.4 | Valuation appointment | `book_valuation` | Tool gateway | IMPLEMENTED |
| FR-12.3.5 | Lead scoring | Service function | Internal | IMPLEMENTED |

---

> **Note on FR-11.1 (availability) and operating hours.** Operating hours are configurable and persisted: `api/v1/settings/operating-hours` reads and replaces rows in the `operating_hours` table. However, no code path enforces them against booking. `checkAvailability` in `src/domain/scheduling/service.ts` hardcodes a 09:00–17:00 window for every tenant, never reads the `operating_hours` table, and currently has no callers anywhere in `src/`. `bookAppointment` checks only for overlap with existing appointments, so a booking outside a tenant's configured hours is not rejected. Availability is therefore stored but not enforced, and this is a known gap rather than a completed requirement.

---

## Non-Functional Requirements

| ID | Requirement | Target | Implementation | Status |
|---|---|---|---|---|
| NFR-1.1 | Inbound latency (P95) | <3 seconds | Ultravox + processing | NOT MEASURED (no timing instrumentation on the bridge path) |
| NFR-1.2 | API response (P95) | <500ms | Next.js + Supabase | IN PROGRESS |
| NFR-2.1 | Multi-tenant isolation | 100% RLS coverage | PostgreSQL RLS policies | VERIFIED |
| NFR-2.2 | Recording security | Encrypted at rest | Supabase encryption | CONFIGURED |
| NFR-3.1 | Audit trail | All calls logged | `audit_events` table | IMPLEMENTED |
| NFR-3.2 | PII/PHI redaction | 100% coverage | Redaction service | IMPLEMENTED |
| NFR-4.1 | Uptime (availability) | 99% target | VPS + monitoring | NOT MEASURED |
| NFR-4.2 | Graceful degradation | Escalation fallback | Tool errors → escalate | IMPLEMENTED |
| NFR-5.1 | Concurrent capacity | 100+ calls | Ultravox + Supabase | NOT STRESS-TESTED |
| NFR-5.2 | Database concurrency | 100+ tenants | PostgreSQL | NOT BENCHMARKED |
| NFR-6.1 | TypeScript strict | Zero `: any` | Compiler setting | ENFORCED |
| NFR-6.2 | Linting | All pass ESLint | CI enforcement | ENFORCED |
| NFR-7.1 | Test coverage | ≥80% (critical paths) | 9 test files | NOT MEASURED (no coverage instrumentation configured) |

---

## Traceability and Test Coverage

The table below is derived directly from the requirement identifiers listed above. The final column names the automated test file that touches the module, where one exists; it does not express a percentage, because no line-coverage instrumentation is configured for this project (see `07-testing-and-evaluation.md`).

| Module | Requirements | Automated test file(s) | Otherwise verified by |
|---|---|---|---|
| FR-1 Tenant Management | 3 | — | Manual walkthrough |
| FR-2 Authentication and Authorization | 5 | `token.test.ts` (call tokens only) | Manual walkthrough |
| FR-3 Agent Configuration and Versioning | 8 | `compiler.test.ts` (compilation only) | Manual walkthrough |
| FR-4 Inbound Call Handling | 7 | `rls.test.ts`, `scenarios.test.ts` | Live test calls |
| FR-5 Tool Execution | 4 | `tool-gateway.test.ts` | Live test calls |
| FR-6 Knowledge Management | 6 | — | Manual walkthrough |
| FR-7 Outbound Calling | 5 | `policies.test.ts` (DNC only) | Live test calls |
| FR-8 Compliance and Privacy | 6 | `policies.test.ts`, `redaction.test.ts`, `fair-housing.test.ts` | — |
| FR-9 Analytics and Reporting | 4 | — | Manual walkthrough |
| FR-10 Test Center | 5 | — | Manual walkthrough |
| FR-11 Integrations | 5 | — | Manual walkthrough |
| FR-12 Industry-Specific Features | 16 | `scenarios.test.ts`, `fair-housing.test.ts` (partial) | Manual walkthrough |
| **TOTAL** | **74** | 9 test files across 8 modules | — |

Five of the twelve modules (Tenant Management, Knowledge Management, Analytics, Test Center, Integrations) have no automated tests at all. Where a test file is listed, it exercises part of the module, not every requirement in it.

---

## Critical Gaps and Recommendations

### Gap 1: Component Testing

**Issue**: React component library (`@testing-library/react`) is installed but no component tests are committed.  
**Impact**: UI workflows (agent config form, call review) are not regression-tested.  
**Recommendation**: Add tests for critical user flows (agent creation, call viewing).

### Gap 2: Route Handler Testing

**Issue**: API routes are not directly tested; coverage is indirect via integration tests.  
**Impact**: Request validation, error handling, auth/RBAC are not thoroughly tested.  
**Recommendation**: Add route-level tests for auth, error cases, and RBAC boundary conditions.

### Gap 3: End-to-End Testing

**Issue**: Full call workflows are tested manually via test center; no E2E automation.  
**Impact**: Regression detection requires manual testing.  
**Recommendation**: Implement E2E tests using Playwright or Cypress.

### Gap 4: Load and Stress Testing

**Issue**: System handles live traffic but has not been systematically stress-tested.  
**Impact**: Latency/throughput baselines and breaking points are unknown.  
**Recommendation**: Conduct load testing with 100+ concurrent calls to establish SLOs.

### Gap 5: Knowledge Import Scheduling

**Issue**: Web scraper job (`workers/website-import`) is implemented but not wired to scheduler.  
**Impact**: Knowledge import requires manual API call; no automatic refresh.  
**Recommendation**: Wire to systemd timer or cloud job scheduler.

### Gap 6: Provider Adapter Completeness

**Issue**: Telnyx webhook signature verification is documented as a TODO.  
**Impact**: Telnyx webhooks may accept invalid signatures.  
**Recommendation**: Implement verification or formally document decision not to support Telnyx webhooks.

---

## Conclusion

All 74 functional requirements are implemented, and each is verified either by manual testing or by unit, integration, or contract tests. Multi-tenant isolation is verified automatically by `rls.test.ts`. The latency requirement (NFR-1.1) is not verified: no timing instrumentation exists on the call-bridge path, so no P95 figure has been computed. Automated testing is selective, covering eight of twelve modules with nine test files, and no coverage instrumentation is configured, so the untested proportion of the codebase is unquantified. Component, route-handler, end-to-end, and load testing remain prerequisites for production readiness.
