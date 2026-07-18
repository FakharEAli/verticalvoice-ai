# Testing and Evaluation

## Current Testing Status

**9 test files** (1,710 lines) exercising four critical areas of a codebase of **263 TypeScript source files** (~61,300 lines), of which 249 are non-test files.

> **On coverage figures**: no line-coverage instrumentation is configured for this project. `@vitest/coverage-v8` is not installed and `npm test` produces no coverage report. This document therefore reports *which modules have tests*, not a percentage of lines or branches executed. A ratio of test files to source files is not a coverage metric and is not used here.

---

## Test Suite Inventory

Files are grouped below by their actual location in `src/tests/`.

### Unit Tests — `src/tests/unit/` (7 files)

**compiler.test.ts**: Agent config compilation (pack → prompt)  
**policies.test.ts**: Compliance guardrails (DNC, fair-housing, recording consent)  
**redaction.test.ts**: PII/PHI masking in transcripts  
**token.test.ts**: Call token JWT signing and validation  
**scenarios.test.ts**: Call workflow evaluation (inbound booking, outbound reminders)  
**fair-housing.test.ts**: Real-estate fair-housing compliance (steering prevention)  
**tmp-prompt-check.test.ts**: Ad-hoc prompt assertion retained from development; not part of the intended regression suite and should be removed or renamed

### Integration Tests — `src/tests/integration/` (1 file)

**rls.test.ts**: Row-Level Security prevents cross-tenant access

### Contract Tests — `src/tests/contract/` (1 file)

**tool-gateway.test.ts**: Tool API schema validation

---

## Test Execution

**Local**: `npm test` (watch mode: `npm run test:watch`)  
**CI**: GitHub Actions runs typecheck + lint + tests on every push  
**Providers**: CI forces `VOICE_PROVIDER=mock` and `TELEPHONY_PROVIDER=mock` (no credentials)

---

## Coverage Analysis

### Modules with automated tests

The table below lists the modules that have a dedicated test file. It does not express a proportion of the codebase; no line-coverage measurement exists (see note above).

| Module | Status | Test |
|---|---|---|
| Agent compilation | ✓ | compiler.test.ts |
| Policies | ✓ | policies.test.ts |
| Redaction | ✓ | redaction.test.ts |
| Token signing | ✓ | token.test.ts |
| RLS isolation | ✓ | rls.test.ts |
| Fair housing | ✓ | fair-housing.test.ts |
| Tool gateway | ✓ | tool-gateway.test.ts |
| Scenarios | ✓ | scenarios.test.ts |

### Manual Testing

**Test Center** (`api/v1/test-center/`):
- Place live test calls
- Review transcripts and outcomes
- Analyze call quality
- Clear test data

**Healthcare scenario**:  
Patient → Agent books appointment → SMS confirmation → Outcome: "resolved"

**Restaurant scenario**:  
Caller → Agent reserves table → Confirmation → Outcome: "resolved"

**Real-estate scenario**:  
Caller → Agent qualifies lead → Showing scheduled → Outcome: "resolved"

---

## Gaps and Recommendations

| Gap | Impact | Effort | Priority |
|---|---|---|---|
| No component tests | Medium — UI untested | 2–4w | Medium |
| No route handler tests | High — API validation untested | 1–2w | HIGH |
| No E2E automation | Medium — Manual only | 2–4w | HIGH |
| No load testing | High — Scaling unknown | 3–5w | HIGH |
| No error scenario tests | High — Failure behavior unknown | 1–2w | HIGH |

---

## Quality Observations

### Strengths

- Critical paths covered (compiler, compliance, RLS)
- TypeScript strict mode enforced
- Live production testing catches real bugs
- Honest coverage reporting

### Weaknesses

- Selective coverage: eight modules have tests; the large majority of routes, workers, and UI components have none
- No coverage instrumentation, so the untested proportion is unquantified
- No regression suite
- No performance benchmarks
- No formal peer-review process; changes were merged without a required second reviewer

---

## Evaluation Results

| Criterion | Result |
|---|---|
| Functional correctness | Yes (tested + live verified) |
| Latency (P95) | NOT MEASURED — no timing instrumentation exists on the bridge path; see note below |
| Multi-tenant isolation | ✓ Verified (RLS + audit logs) |
| Compliance (PHI/consent/FH) | ✓ Implemented and tested |
| Scalability (100+ calls) | ? Unknown (not stress-tested) |
| Availability (99% uptime) | ? Not measured |

---

> **On latency**: the figure of roughly 1–2 seconds quoted elsewhere in this documentation is an informal impression from manual test calls, not a measurement. The codebase records tool-call durations (`src/lib/tools/gateway.ts`) and defines a `response_time` p95 metric in the industry-pack schema, but nothing instruments the end-to-end path from Twilio webhook to first agent utterance, and no percentile has been computed from call data. Establishing a real P50/P95 baseline is outstanding work.

---

## Conclusion

Test suite is appropriate for a pilot: critical compliance paths covered, most edge cases not. For production scale at 10,000+ concurrent calls, component/route/E2E/load testing is required. Current testing has prevented major bugs; comprehensive suite would prevent regressions and establish performance baselines.
