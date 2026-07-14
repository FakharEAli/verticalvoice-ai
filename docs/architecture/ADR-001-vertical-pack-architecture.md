# ADR-001: Vertical Pack Architecture

**Status**: Accepted
**Date**: 2026-07-14
**Deciders**: Engineering team

## Context

VerticalVoice AI serves three distinct industries -- healthcare, restaurant, and
real estate -- each with fundamentally different intents, compliance requirements,
tool integrations, and conversational patterns. We needed to decide how to
structure the codebase to support these verticals.

### Options Considered

1. **Three separate applications** -- one Next.js app per vertical, each deployed
   independently with its own codebase.

2. **Single monolith with conditionals** -- one app with `if/else` branches
   throughout the codebase switching on industry type.

3. **Pluggable IndustryPack interface** -- a shared platform core with
   industry-specific behavior encapsulated in self-contained pack modules that
   conform to a common contract.

### Forces

- Healthcare requires HIPAA-compliant data handling and emergency detection;
  restaurants require allergen tracking and POS integration; real estate requires
  Fair Housing Act compliance and outbound call regulation. These are not minor
  config differences -- they are distinct domain models.

- Despite domain differences, all three verticals share the same fundamental
  architecture: voice runtime, telephony, tenant management, call lifecycle,
  evaluation framework, analytics, and dashboard shell.

- The team is small and cannot maintain three separate apps with duplicated
  infrastructure code.

- New verticals (legal, dental, automotive) are on the roadmap and must be
  addable without forking the platform.

## Decision

Adopt the **pluggable IndustryPack interface** (option 3).

Each vertical implements a single `IndustryPack` object that conforms to the
interface defined in `src/industries/core/industry-pack.ts`. The pack contains:

- **Onboarding schema** -- tenant setup wizard fields and validation
- **Intent catalog** -- the set of caller intents the agent can handle
- **Outcome schemas** -- structured results per intent
- **Tool bindings** -- external actions the agent can invoke
- **Knowledge schema** -- RAG document structure for the vertical
- **Policy pack** -- compliance rules (HIPAA, Fair Housing, PCI, etc.)
- **Escalation rules** -- when and how to transfer to humans
- **Analytics definition** -- vertical-specific metrics
- **Dashboard modules** -- UI widgets for the vertical's dashboard
- **Evaluation suite** -- test scenarios for automated QA
- **Demo fixtures** -- sample data for onboarding and demos
- **Prompt fragments** -- system prompt building blocks

The platform core loads the appropriate pack at runtime based on the tenant's
`industry_id` and delegates all industry-specific behavior through the pack
interface.

## Consequences

### Positive

- **Shared improvements propagate automatically.** A fix to the call lifecycle,
  evaluation runner, or dashboard shell benefits all verticals without per-vertical
  patches.

- **Differences are explicit.** Each vertical's unique behavior is concentrated
  in its pack module rather than scattered across the codebase in conditional
  branches. This makes compliance auditing straightforward -- a healthcare
  compliance reviewer only needs to read the healthcare pack.

- **Testable in isolation.** Each pack's evaluation suite (40 scenarios per
  vertical + 20 shared adversarial) runs against the pack's declared intents,
  policies, and tools. The evaluation framework is industry-agnostic.

- **Versionable.** Packs carry a `version` field. Schema migrations and
  behavioral changes can be rolled out per-vertical without cross-vertical risk.

- **New verticals are additive.** Adding a fourth vertical means implementing a
  new `IndustryPack` object and registering it -- no changes to the platform core.

### Negative

- **Interface rigidity.** The `IndustryPack` interface must be general enough to
  accommodate all verticals. If a vertical needs a capability the interface does
  not model, the interface must be extended (which touches all packs).

- **Abstraction cost.** Developers must understand the pack interface before
  contributing to any vertical. The learning curve is steeper than a simple
  conditional branch.

- **Testing surface.** With 140 evaluation scenarios across verticals, the full
  test suite takes longer to run than a single-vertical app would.

### Mitigations

- The interface is designed with extension points (`Record<string, unknown>`
  escape hatches in key positions) so vertical-specific data can flow through
  without interface changes for minor additions.

- Evaluation scenarios are tagged and filterable, allowing developers to run only
  their vertical's suite during development (`tags: ["healthcare"]`).

- A shared adversarial suite (20 scenarios) tests cross-cutting concerns like
  prompt injection, data exfiltration, and system resilience, so these do not
  need to be duplicated per vertical.

## References

- `src/industries/core/industry-pack.ts` -- the IndustryPack interface (418 lines)
- `src/industries/core/evaluations.ts` -- evaluation runner framework
- `src/tests/scenarios/` -- 140 evaluation scenarios (40 HC + 40 RST + 40 RE + 20 ADV)
- `src/config/features.ts` -- feature flags per vertical
