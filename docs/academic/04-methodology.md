# Methodology

## Development Approach

### Iterative and Incremental Development

The project followed an iterative, incremental development model with continuous integration and live production testing. Rather than waterfall phases, the team built the platform in vertical slices across all layers: each industry vertical was implemented end-to-end, tested, and deployed in rapid succession.

**Timeline evidence**:
- First commit: 2026-07-14 08:40 UTC
- Last commit: 2026-07-18 10:59 UTC
- Total: 37 commits over 4 calendar days (14, 16, 17, and 18 July 2026), counted at time of writing
- Live deployment: https://verticalvoice.alphaos.tech (operational with real Twilio/Ultravox traffic)

The compressed timeline reflects focused, high-intensity development. The team prioritized working code deployed to production over comprehensive documentation or extended testing cycles.

### Provider-Adapter Design Pattern

A critical architectural decision was the provider-adapter pattern for voice and telephony integrations. Rather than hard-coding Ultravox and Twilio, the team defined abstract interfaces (`Voice`, `Telephony`) and implemented multiple adapters:

**Voice providers**: Ultravox (primary), Retell (fallback), Mock (local development)  
**Telephony providers**: Twilio (primary), Telnyx (cost alternative), Plivo (alt), Mock (local development)

This design enabled **mock-first development**: developers could build and test call handling logic without live credentials. Local development uses mock providers, eliminating credential friction.

### Industry-Pack Plugin Architecture

Rather than reimplementing business logic per vertical, the team designed an industry-pack system:

- **Core pack**: Common call handling, compliance utilities, generic tools
- **Industry packs**: Healthcare, Restaurant, Real-Estate — each contributes:
  - Domain-specific intents
  - Domain-specific tool integrations
  - Domain-specific guardrail policies
  - Domain-specific prompts

This allowed rapid iteration: modifying a vertical's behavior required editing one pack.

### Live Production Testing and Debugging

The most valuable testing occurred against real production traffic. Real Twilio and Ultravox calls exposed issues mocked providers could not simulate:

- Signature validation
- Real latency constraints
- Provider error conditions
- Compliance edge cases

Commit history shows this cycle: 2026-07-16 and 2026-07-17 contain RLS/constraint fixes ("Fix bookings not surfacing", "fix: two more bugs caught by live production testing"). These are authentic fixes discovered by operating the live system.

---

## Technical Stack and Tooling

**Framework**: Next.js 16 (App Router) + React 19  
**Language**: TypeScript (strict mode, zero `: any` escapes)  
**Database**: Supabase (PostgreSQL, RLS)  
**Styling**: Tailwind CSS 4 + shadcn/ui  
**Validation**: Zod  
**Testing**: vitest + @testing-library/react  
**CI/CD**: GitHub Actions (typecheck, lint, test)  
**Deployment**: Git-reset deploy to Hostinger VPS  

**Voice/Telephony**:
- Browser: Twilio SDK (`@twilio/voice-sdk`)
- Server: Hand-rolled HTTP against Ultravox/Twilio APIs
  - **Rationale**: Enables easier provider swapping
  - **Risk**: Requires careful credential and signature verification
  - **Learning**: Early retreat from hand-rolled crypto to `jsonwebtoken` shows the team recognized risks

**Feature Flags**:
```
NEXT_PUBLIC_FF_HEALTHCARE_DEMO_MODE
NEXT_PUBLIC_FF_OUTBOUND_CALLING
NEXT_PUBLIC_FF_REAL_ESTATE_OUTBOUND
NEXT_PUBLIC_FF_RESTAURANT_ORDERING
```

---

## AI Assistance and Development Practices

### Transparency on AI-Assisted Development

This project was developed with large language model (LLM) assistance for code generation and architecture guidance. The team used AI for:

- Boilerplate infrastructure (migrations, routes, components)
- Business logic implementation
- Production debugging

The team did **not** use AI for:

- Architecture decisions (multi-tenancy, industry-pack design, provider-adapter pattern)
- Compliance policy design (PHI redaction, fair-housing, consent tracking)
- Production operations (Twilio setup, database management, VPS deployment)

### Verification Practices

To ensure correctness:

1. **TypeScript strict mode**: All 263 files pass `strict: true` typecheck
2. **Linting**: ESLint + `eslint-config-next`
3. **Unit testing**: Compiler, policies, redaction, contracts
4. **Integration testing**: Row-Level Security isolation
5. **Live call testing**: Manual evaluation via test center
6. **Code review**: Limited (all commits from one author; would benefit from peer review)

### Known Risks

1. **Single author**: No peer code review
2. **Selective test coverage**: 9 test files against 249 non-test source files; most routes and components are not covered. No coverage instrumentation is configured, so the untested proportion is unquantified rather than measured.
3. **AI artifacts**: Presentation deck has spelling errors; similar artifacts may exist in documentation
4. **Limited documentation**: In-code docstrings are minimal

### Mitigation Recommendations

- Establish mandatory peer code review
- Increase coverage to ≥80% of critical paths
- Conduct security audit (credential handling, RLS)
- Document all LLM prompts for transparency
- Separate architecture (human-only) from implementation (can be AI-assisted)

---

## Testing Strategy

### Unit Tests (4 files)

- `compiler.test.ts`: Agent config compilation
- `policies.test.ts`: DNC, redaction, fair-housing guardrails
- `redaction.test.ts`: PII/PHI masking
- `token.test.ts`: Call token JWT validation

### Integration Tests (2 files)

- `rls.test.ts`: Row-Level Security cross-tenant prevention
- `scenarios.test.ts`: Call workflow evaluation

### Contract Tests (1 file)

- `tool-gateway.test.ts`: Tool execution schema validation

### Live Call Testing

Test Center (`api/v1/test-center/`) enables:
- Place test calls to configured Twilio number
- Review transcripts, recordings, outcomes
- Flag as success/failure for evaluation

### Coverage Gaps

**Not automated**:
- React components (installed library; not used)
- API route handlers
- End-to-end flows
- Error scenarios
- Load testing

**Covered manually**:
- Full inbound workflows
- Outbound compliance
- Cross-tenant isolation (verified on production database)

---

## Continuous Integration

GitHub Actions workflow on every push:

1. Checkout code
2. Setup Node.js v20
3. `npm ci`
4. `tsc --noEmit` (typecheck)
5. `eslint` (linting)
6. `vitest run` (tests)

Workflow forces `VOICE_PROVIDER=mock` and `TELEPHONY_PROVIDER=mock` (no credentials needed in CI).

---

## Deployment and Operations

### Local Development

```bash
git clone https://github.com/alifakhar816/verticalvoice-ai.git
npm install
supabase start                 # local Postgres (Docker required)
npm run dev                    # Next.js dev server
```

Mock providers allow full exploration without external credentials.

### Production

https://verticalvoice.alphaos.tech runs on Hostinger VPS:
- `git reset --hard` deploys master branch
- Supabase manages remote database
- Twilio/Ultravox credentials in VPS `.env`
- Traefik reverse proxy (TLS)
- PM2/systemd manages processes

---

## Documentation

**In-Code**:
- README.md: Quickstart
- docs/architecture/INVENTORY.md: File structure
- docs/architecture/ADR-001: Architecture decisions
- docs/compliance/known-limitations.md: Honest gaps
- docs/runbooks: Operational procedures

**This Package**: Files 00–08 provide comprehensive academic documentation.

---

## Methodology Limitations

1. **Single author**: No peer review; shared code ownership absent
2. **Time compression**: 37 commits over 4 days is unsustainable; limits review and hardening
3. **Selective testing**: Critical paths only; edge cases not covered
4. **No formal requirements**: Inferred from problem statement; evolved during development
5. **Retroactive documentation**: Written after development, not used to guide it
6. **No load testing**: System handles live traffic but not stress-tested

---

## Conclusion

The methodology prioritized speed and pragmatism appropriate for a research pilot. Production use at scale would require:
- Comprehensive testing (routes, components, E2E)
- Peer code review and shared ownership
- Security audit (credentials, RLS)
- Load and stress testing

TypeScript strict mode, selective testing, and live production validation created a working system. Future development should invest in rigor before scaling beyond the pilot.
