# Objectives and Scope

## SMART Objectives

The following objectives are Specific, Measurable, Achievable, Relevant, and Time-bound. They are calibrated against the live system's actual capabilities and do not depend on unsourced market projections.

### Primary Objective

**Develop and deploy a production-grade, multi-tenant AI voice agent platform that automates first-point-of-contact handling for three industry verticals (healthcare, restaurant, real estate) with measurable improvements to call-handling speed and coverage.**

### Specific Objectives

#### O1. Functional Completeness

**Statement**: Deliver a platform that implements core call-handling workflows (inbound/outbound, intent routing, transaction execution) for all three verticals, with industry-specific compliance policies integrated.

**Measurability**: 
- All three verticals have functional agent implementations verified by test suite
- ≥80% of routine query types (appointment booking, order capture, lead qualification) are handled without human escalation
- All major compliance guardrails (DNC suppression, recording consent, fair-housing rules) are implemented and tested

**Target Timeline**: Complete by July 2026 (ACHIEVED)

#### O2. System Reliability and Latency

**Statement**: Ensure the platform operates with acceptable voice-quality and response latency for production use.

**Measurability**:
- Inbound call success rate (successful route from PSTN through Ultravox without error) ≥95% under normal load
- P50 latency (bridge setup + intent recognition) ≤2 seconds; P95 <3 seconds
- Midnight-to-dawn availability ≥99% (monitored via synthetic tests; full 24/7 guaranteed service is out of scope)
- Recording accuracy / transcription errors <10% on standard English speech

**Target Timeline**: Continuous monitoring; baseline established by September 2026

#### O3. Data Isolation and Security

**Statement**: Implement and verify multi-tenant isolation at the database and API level to prevent cross-tenant data leakage.

**Measurability**:
- All database queries use Row-Level Security (RLS) policies; no cross-tenant queries possible at SQL level
- All API routes reject requests without valid tenant context
- Audit logging captures all data access; test suite includes RLS breach scenarios
- Zero PII/PHI exfiltration incidents in production

**Target Timeline**: Verified by integration tests and live audit (ACHIEVED)

#### O4. Compliance Implementation

**Statement**: Implement industry-specific compliance controls and document verification of no violations.

**Measurability**:
- Healthcare: All patient data is tagged PHI; redaction policies applied; consent versioning tracks recording permission
- Restaurant: Order history retained per state regulations; payment consent logged
- Real Estate: Fair-housing policy enforcement tested via unit tests; lead source attribution logged; no discriminatory steering
- Zero regulatory violations or compliance incidents in first 90 days of production

**Target Timeline**: Compliance baseline by July 2026; ongoing monitoring

#### O5. Documentation and Knowledge Transfer

**Statement**: Document system architecture, deployment procedures, and operational runbooks to enable handoff to operators and allow supervisors to verify claims.

**Measurability**:
- Architecture documentation includes C4 diagrams, data flows, and tech-stack justification
- Deployment runbook enables clean environment setup from source code
- Known limitations are honestly documented; no false claims about capabilities
- This academic documentation package (00–08 files) is complete and references code

**Target Timeline**: Complete by final submission (July 2026)

#### O6. Testing and Evaluation Depth

**Statement**: Establish testing practices that cover critical subsystems and enable defensible claims about system behavior.

**Measurability**:
- Unit tests cover: agent config compiler, policy guardrails, PII redaction, fair-housing rules, token signing, tool-gateway contracts
- Integration tests verify Row-Level Security isolation
- Live call testing framework exists for manual evaluation of call handling quality
- Test coverage report is honest about gaps (no component/route/E2E testing currently)

**Target Timeline**: Baseline by July 2026; gaps documented in 07-testing-and-evaluation.md

---

## In-Scope Work

### Architecture and Data Model

- Multi-tenant tenant isolation via Supabase RLS
- Versioned agent configuration system with activate/rollback lifecycle
- Industry-pack plugin architecture (core + healthcare/restaurant/real-estate packs)
- 91-table schema covering tenancy, calls, agents, knowledge, compliance, operations

### Call Handling

- **Inbound**: PSTN → Twilio SIP → Ultravox voice bridge → agent inference → tool execution → call logging
- **Outbound**: Tenant-initiated call placement with compliance checks (DNC, consent, TCPA)
- **Provider Adapters**: Ultravox (primary), Retell (fallback); Twilio (primary), Telnyx/Plivo (cost alternatives)
- **Knowledge Integration**: Calendar (Google), POS (Square), CRM (HubSpot), website scraping

### Industry-Specific Features

- **Healthcare**: Appointment booking/rescheduling/cancellation; triage inquiry routing; insurance intake; prescription refill requests
- **Restaurant**: Reservation booking; order capture; menu item availability; wait-list management; complaint logging
- **Real Estate**: Lead qualification; showing scheduling; property information; valuation appointment booking

### Compliance and Privacy

- DNC list suppression for outbound calls
- Recording consent tracking per call
- GDPR compliance (data export, erasure)
- PHI/PII redaction in transcripts and logs
- Fair-housing policy enforcement (real estate)
- Audit trail of all data access

### Operations and Analytics

- Real-time dashboard showing active calls, call volume, and key metrics
- Call recording and transcript storage
- ROI calculator (revenue recovered vs. system cost)
- Team management (RBAC, member invitation, role assignment)

---

## Out-of-Scope Work

### Not Implemented (Documented as Future)

- **Video calling or screen sharing**: System is voice-only
- **Group calling / conference bridges**: Single caller at a time per agent
- **Multi-language support**: English language only; TTS in English accents
- **Advanced NLU fine-tuning**: Standard Ultravox model; no custom acoustic models
- **Automatic provider redundancy / failover**: If primary provider (Ultravox) is down, no automatic fallback to Retell
- **Mobile app or third-party integrations**: Dashboard is web-based only
- **Real-time transcription UI**: Transcripts are fetched post-call
- **Collection or debt-recovery calling**: Explicit compliance limitation

### Explicitly Excluded from Definitions

- Medical diagnosis or clinical decision-making (healthcare)
- Food preparation or delivery logistics (restaurant)
- Legal contract execution or binding offers (real estate)
- Direct payment processing (POS integration is backend only; no CC capture in agent)
- Guaranteed 100% call completion (operates as force multiplier, not human replacement)

### Deferred Pending Research or Pilot Feedback

- **Multi-provider tenants**: Currently one agent per tenant; enterprise networks may need per-location agents
- **Advanced NLU with domain-specific vocabularies**: Requires real-world feedback on misrecognition patterns
- **Industry-specific rate limiting**: Call-per-hour caps per vertical are not yet defined
- **Sentiment analysis or call quality scoring**: Infrastructure exists but scoring models are not trained
- **Custom hold music / IVR announcements**: Default system prompts only

---

## Success Metrics and Evaluation

### Quantitative Acceptance Criteria

| Metric | Target | Measurement Method |
|--------|--------|-------|
| Inbound call success rate (no error) | ≥95% | VoIP flow logs + Supabase call records |
| Routine query handling without escalation | ≥80% | Call outcomes (`call_outcomes.outcome` = "resolved") |
| P95 latency (bridge to intent) | <3s | Timestamp analysis in call_events table |
| Cross-tenant data isolation (RLS) | 100% | Integration test suite + audit log review |
| Test coverage (critical paths) | ≥80% | Not measured; 9 test files on compliance/RLS/contracts, no coverage instrumentation configured |
| Live deployment uptime | ≥99% | Synthetic call tests + Twilio webhook logs |

### Qualitative Acceptance Criteria

- **Code quality**: No `: any` types; `tsconfig.json strict: true`; passes linting and typecheck
- **Documentation**: Architecture diagrams exist; deployment runbook is followed successfully; known limitations are stated
- **Compliance**: Zero PII/PHI exfiltration; no regulatory violations in first 90 days of production
- **Honesty**: Claims match code; unsourced statistics are not repeated; limitations are acknowledged

---

## Scope Boundaries

### What Does NOT Constitute Success

- Marketing claims unsupported by code (e.g., "$600,000 Year 1 revenue" without tenant contracts)
- Inflated market projections (e.g., "$187.7B market by 2030" claimed without source)
- Claimed features that do not exist in the codebase (e.g., "multi-language support" when only English is implemented)
- 100% test coverage of all 263 source files (realistic target is ≥80% of critical paths)
- Zero latency or instant intent recognition (acceptable range is 1–3 seconds)

### Legitimate Scope Reductions (Without Penalty)

- Out-of-scope vertical (only 3 supported; 4th vertical is a later-phase add)
- Provider adapter not fully implemented (e.g., Telnyx signature verification is a documented TODO)
- Feature gated behind feature flag but incomplete (e.g., outbound calling is feature-flagged)
- Knowledge integration partially wired (e.g., web scraping job exists but is not scheduled)

---

## Economics and Export Hypothesis

This project tests the hypothesis that **Pakistan-based software can compete on cost and compliance specialization**. Specific economic claims:

**Claimed**: Competitive pricing at $200–$500/month (vs. Western incumbents at $1,000+/month)  
**Status**: Not verified with real customer contracts; this is a *projection based on development cost*

**Claimed**: "91% profit margin" per the mid-year report  
**Status**: Unsourced; dropped from objectives as unsustainable. Actual economics depend on customer acquisition cost, hosting cost, and customer lifetime value — none of which are measured in this pilot.

**Revised Economic Objective**: Demonstrate that a functioning production platform can be deployed in Pakistan at 1/10th the cost of equivalent Western development, enabling entry-level pricing for emerging-market customers.

**Measurement**: Actual cost structure is tracked in deployment documentation but is not a defense criterion.

---

## Timeline and Milestones

| Phase | Start | End | Deliverable |
|-------|-------|-----|-------|
| Research & Requirements | Jan 2026 | Jan 2026 | Mid-year report (submitted) |
| Development | Jan 2026 | Jul 2026 | Live platform; 37 commits at time of writing; 263 source files |
| Testing & Evaluation | Jan 2026 | Jul 2026 | 9 test files; live call testing |
| Documentation | Jan 2026 | Jul 2026 | Academic docs (00–08); architecture docs; runbooks |
| Final Defense | Jul 2026 | Jul 2026 | This documentation package; live demo |

---

## Alignment with Academic Goals

This project satisfies the FYP objectives of the Business Analytics & Programming program:

1. **Systems thinking**: Multi-tenant architecture, compliance integration, industry plugin patterns demonstrate design maturity
2. **Programming rigor**: TypeScript strict mode, RLS verification, unit/integration testing show disciplined development
3. **Business acumen**: Problem-solution fit across three verticals, competitive positioning, regulatory awareness
4. **Project execution**: Live deployment with real voice traffic; team collaboration; iterative development under time constraints
