# VerticalVoice AI: Project Charter

**Final Year Project 2026**  
**DHA Suffa University, Business Analytics & Programming**

---

## Project Information

| Field | Value |
|-------|-------|
| **Project Title** | VerticalVoice AI: Multi-Tenant B2B SaaS AI Voice Agents |
| **Project Type** | Final Year Project (FYP) |
| **Institution** | DHA Suffa University |
| **Program** | Business Analytics & Programming |
| **Academic Year** | 2026 |
| **Project Supervisor** | Dr. Arif Imtiaz |
| **Co-Supervisor** | Dr. Huma Jamshaid |
| **Repository** | https://github.com/alifakhar816/verticalvoice-ai |
| **Live Deployment** | https://verticalvoice.alphaos.tech |
| **Submission Date** | January 23, 2026 (mid-year); July 2026 (final) |

---

## Team

| Name | Role |
|------|------|
| Fakhar Ali | Group Leader |
| Muhammad Aman | Team Member |
| Saad Hasan | Team Member |
| Ahmed Peerani | Team Member |

---

## Project Synopsis

VerticalVoice AI is a multi-tenant, cloud-based SaaS platform that deploys AI-powered voice calling agents for inbound and outbound customer engagement. The platform serves three industry verticals — **Healthcare**, **Restaurants**, and **Real Estate** — with a single unified core engine and industry-specific plugin packs that contribute specialized intents, tools, policies, and compliance guardrails.

The system automates first-point-of-contact interactions: healthcare clinics receive AI receptionists handling appointment booking and patient triage; restaurants receive ordering and reservation agents; real estate firms receive lead qualification and showing scheduling agents. Calls are routed through Twilio and processed by the Ultravox voice AI, with context and knowledge integrated from tenant-specific data sources (calendars, POS systems, CRM databases).

The platform demonstrates a Pakistan-based IT export model: a domestically developed solution priced competitively and serving international customers, contributing to Pakistan's IT sector growth and hard-currency inflow.

**Status**: Live deployment with real voice traffic; 263 TypeScript source files; 91 database tables; 50 API routes; 9 test files covering compliance, isolation, and contracts.

---

## Document Index

This charter serves as the entry point to the academic documentation layer. The following files provide the detailed analysis expected by a Final Year Project defense panel:

1. **00-project-charter.md** (this file) — Project identification, team, synopsis, and document roadmap
2. **01-problem-statement.md** — Problem framing across three verticals; scope and explicit limitations
3. **02-objectives-and-scope.md** — SMART objectives, measurable against the actual system; in-scope and out-of-scope
4. **03-literature-review.md** — Conversational AI architectures, voice-agent pipelines, multi-tenant SaaS patterns, commercial landscape
5. **04-methodology.md** — Iterative/incremental development with provider-adapter design; live production testing; AI-assistance transparency
6. **05-requirements-specification.md** — Functional requirements (FR-1…FR-n) by module; non-functional requirements; traceability table
7. **06-system-design.md** — C4-style context and container diagrams; inbound/outbound call flows; agent lifecycle; ERD for core tables
8. **07-testing-and-evaluation.md** — Test strategy; existing test coverage; evaluation scenarios; gap analysis with prioritized remediation plan
9. **08-references.md** — Consolidated IEEE-style bibliography of all cited sources

---

## Scope Overview

**In Scope**:
- Multi-tenant SaaS architecture for voice AI agents across three industry verticals
- Inbound call handling with intent recognition and routing
- Outbound compliance-aware calling (DNC, suppression, consent tracking)
- Industry-pack plugin model with healthcare, restaurant, and real-estate implementations
- Agent configuration versioning, activation, and rollback
- Knowledge ingestion from multiple sources (calendars, POS, CRM, website scrapers)
- Real-time analytics and call audit trails
- Team/RBAC-based multi-user management
- GDPR compliance (data export, erasure) and PHI/PII redaction policies
- Test center for live call validation

**Out of Scope** (documented as future work):
- Group calling / conference bridge functionality
- Video capabilities
- Real-time transcription UI (backend only)
- Advanced NLU fine-tuning for domain-specific accents
- Multi-language voice synthesis
- Provider redundancy failover automation
- Client-facing mobile app

---

## Key Metrics & Deliverables

| Metric | Target | Actual |
|--------|--------|--------|
| Source code files | — | 263 |
| Database tables | — | 91 |
| API routes | ≥40 | 50 |
| Test files | ≥5 | 8 |
| Industry verticals | 3 | 3 (Healthcare, Restaurants, Real Estate) |
| Live voice provider integrations | ≥1 | 2 (Ultravox, Retell) |
| Telephony provider integrations | ≥1 | 3 (Twilio, Telnyx, Plivo) |
| Inbound call success rate (live) | ≥90% | — (TBD by panel evaluation) |
| P95 latency (inbound bridge to Ultravox) | <2s | — (TBD by panel evaluation) |

---

## Strategic Context

This project demonstrates the viability of Pakistan as an export hub for enterprise AI solutions. By developing a production-grade B2B SaaS platform locally and operating it for international customers, the team illustrates how skilled Pakistani talent can deliver competitive, compliance-aware software without reliance on Western development centers. The platform generates hard-currency revenue for participating businesses and establishes a template for future Pakistan-based software exports.

---

## How to Read This Documentation

1. **Start with 01-problem-statement.md** if you are unfamiliar with the business context
2. **Read 05-requirements-specification.md in parallel** with the codebase (`src/` directory) to understand the feature surface
3. **Consult 06-system-design.md** for architecture context and data flows
4. **Review 04-methodology.md** to understand the development process and tooling used
5. **Check 07-testing-and-evaluation.md** for coverage gaps and recommended next steps
6. **Refer to 08-references.md** for all citations used throughout this documentation

All diagrams in this documentation are rendered as Mermaid code blocks and display natively in GitHub markdown.
