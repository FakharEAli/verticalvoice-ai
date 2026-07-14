import { describe, expect, it } from "vitest";
import {
  evaluatePolicy,
  evaluateAllPolicies,
  canStartOutboundCall,
  canRecordCall,
  canDisclosePatientInformation,
  canProvideAllergenStatement,
  canAnswerListingQuestion,
  canCreateBooking,
  canTransferToHuman,
  type PolicyContext,
} from "@/industries/core/policies";
import type { PolicyDefinition } from "@/industries/core/industry-pack";

function makeContext(overrides: Partial<PolicyContext> = {}): PolicyContext {
  return {
    industryId: "healthcare",
    tenantId: "tenant-1",
    callId: "call-1",
    intentId: "book_appointment",
    callerVerified: false,
    currentTime: new Date("2024-06-10T14:00:00Z"), // Monday, 14:00 UTC
    customFields: {},
    ...overrides,
  };
}

function makePolicy(overrides: Partial<PolicyDefinition> = {}): PolicyDefinition {
  return {
    id: "test_policy",
    name: "Test Policy",
    description: "A policy used for testing",
    category: "compliance",
    severity: "block",
    conditions: [],
    action: "allow",
    reason: "test_reason",
    overridable: false,
    ...overrides,
  };
}

describe("evaluatePolicy", () => {
  it("allows when an 'allow' action policy's conditions are met", () => {
    const policy = makePolicy({
      action: "allow",
      conditions: [{ field: "callerVerified", operator: "eq", value: true }],
    });
    const context = makeContext({ callerVerified: true });

    const decision = evaluatePolicy(context, policy);

    expect(decision.allowed).toBe(true);
    expect(decision.policyId).toBe("test_policy");
    expect(decision.severity).toBe("block");
  });

  it("denies when an 'allow' action policy's conditions are NOT met", () => {
    const policy = makePolicy({
      action: "allow",
      conditions: [{ field: "callerVerified", operator: "eq", value: true }],
    });
    const context = makeContext({ callerVerified: false });

    const decision = evaluatePolicy(context, policy);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("required_conditions_not_met");
  });

  it("denies when a 'deny' action policy's conditions are met", () => {
    const policy = makePolicy({
      action: "deny",
      conditions: [{ field: "region", operator: "eq", value: "CA-DNC" }],
      reason: "region_blocked",
    });
    const context = makeContext({ region: "CA-DNC" });

    const decision = evaluatePolicy(context, policy);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("region_blocked");
  });

  it("allows when a 'deny' action policy's conditions are NOT met", () => {
    const policy = makePolicy({
      action: "deny",
      conditions: [{ field: "region", operator: "eq", value: "CA-DNC" }],
    });
    const context = makeContext({ region: "NY" });

    const decision = evaluatePolicy(context, policy);

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toContain("policy_conditions_not_met");
  });

  it("requires ALL conditions to pass (AND semantics)", () => {
    const policy = makePolicy({
      action: "allow",
      conditions: [
        { field: "callerVerified", operator: "eq", value: true },
        { field: "region", operator: "eq", value: "NY" },
      ],
    });

    const partiallyMatching = makeContext({ callerVerified: true, region: "CA" });
    const decision = evaluatePolicy(partiallyMatching, policy);
    expect(decision.allowed).toBe(false);

    const fullyMatching = makeContext({ callerVerified: true, region: "NY" });
    const decision2 = evaluatePolicy(fullyMatching, policy);
    expect(decision2.allowed).toBe(true);
  });

  it("evaluates derived time fields (currentTime.hour, currentTime.dayOfWeek)", () => {
    const businessHoursPolicy = makePolicy({
      id: "outbound_call_hours",
      action: "deny",
      conditions: [{ field: "currentTime.hour", operator: "lt", value: 9 }],
      reason: "before_business_hours",
    });

    // Use explicit local-time constructors so the test is stable regardless
    // of the runner's timezone.
    const earlyMorning = makeContext({ currentTime: new Date(2024, 5, 10, 3, 0, 0) });
    const decision = evaluatePolicy(earlyMorning, businessHoursPolicy);
    expect(decision.allowed).toBe(false);

    const midday = makeContext({ currentTime: new Date(2024, 5, 10, 14, 0, 0) });
    const decision2 = evaluatePolicy(midday, businessHoursPolicy);
    expect(decision2.allowed).toBe(true);
  });

  it("evaluates customFields.* namespaced conditions", () => {
    const policy = makePolicy({
      action: "allow",
      conditions: [{ field: "customFields.insurance_verified", operator: "eq", value: true }],
    });

    const verified = makeContext({ customFields: { insurance_verified: true } });
    expect(evaluatePolicy(verified, policy).allowed).toBe(true);

    const unverified = makeContext({ customFields: { insurance_verified: false } });
    expect(evaluatePolicy(unverified, policy).allowed).toBe(false);
  });

  it("supports 'in' / 'not_in' / 'matches' operators", () => {
    const inPolicy = makePolicy({
      action: "allow",
      conditions: [{ field: "region", operator: "in", value: ["NY", "NJ", "CT"] }],
    });
    expect(evaluatePolicy(makeContext({ region: "NJ" }), inPolicy).allowed).toBe(true);
    expect(evaluatePolicy(makeContext({ region: "TX" }), inPolicy).allowed).toBe(false);

    const notInPolicy = makePolicy({
      action: "deny",
      conditions: [{ field: "region", operator: "not_in", value: ["NY", "NJ", "CT"] }],
    });
    expect(evaluatePolicy(makeContext({ region: "TX" }), notInPolicy).allowed).toBe(false);
    expect(evaluatePolicy(makeContext({ region: "NY" }), notInPolicy).allowed).toBe(true);

    const matchesPolicy = makePolicy({
      action: "deny",
      conditions: [{ field: "callerPhone", operator: "matches", value: "^\\+1900" }],
      reason: "premium_rate_number",
    });
    expect(
      evaluatePolicy(makeContext({ callerPhone: "+19005551234" }), matchesPolicy).allowed,
    ).toBe(false);
    expect(
      evaluatePolicy(makeContext({ callerPhone: "+15551234567" }), matchesPolicy).allowed,
    ).toBe(true);
  });
});

describe("evaluateAllPolicies", () => {
  it("returns one decision per policy, preserving order", () => {
    const policies = [
      makePolicy({ id: "p1", action: "allow", conditions: [] }),
      makePolicy({ id: "p2", action: "deny", conditions: [] }),
    ];
    const decisions = evaluateAllPolicies(makeContext(), policies);
    expect(decisions).toHaveLength(2);
    expect(decisions[0].policyId).toBe("p1");
    expect(decisions[1].policyId).toBe("p2");
  });
});

describe("domain-specific policy checks", () => {
  it("canStartOutboundCall: default-allows when no matching policy exists", () => {
    const decision = canStartOutboundCall(makeContext(), []);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("no_policy_defined");
  });

  it("canStartOutboundCall: denies when a matching outbound_call policy denies (most restrictive wins)", () => {
    const policies = [
      makePolicy({
        id: "outbound_call_tcpa",
        action: "deny",
        conditions: [{ field: "customFields.consent_on_file", operator: "eq", value: false }],
        reason: "no_tcpa_consent",
      }),
    ];
    const context = makeContext({ customFields: { consent_on_file: false } });
    const decision = canStartOutboundCall(context, policies);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("no_tcpa_consent");
  });

  it("canStartOutboundCall: allows when the matching policy's conditions are satisfied", () => {
    const policies = [
      makePolicy({
        id: "outbound_call_tcpa",
        action: "deny",
        conditions: [{ field: "customFields.consent_on_file", operator: "eq", value: false }],
      }),
    ];
    const context = makeContext({ customFields: { consent_on_file: true } });
    const decision = canStartOutboundCall(context, policies);
    expect(decision.allowed).toBe(true);
  });

  it("canRecordCall: denies without recording consent in two-party-consent regions", () => {
    const policies = [
      makePolicy({
        id: "call_recording_two_party",
        action: "deny",
        conditions: [{ field: "callRecordingConsent", operator: "neq", value: true }],
        reason: "two_party_consent_required",
      }),
    ];
    const noConsent = canRecordCall(makeContext({ callRecordingConsent: false }), policies);
    expect(noConsent.allowed).toBe(false);

    const withConsent = canRecordCall(makeContext({ callRecordingConsent: true }), policies);
    expect(withConsent.allowed).toBe(true);
  });

  it("canDisclosePatientInformation: denies when caller is not verified (HIPAA)", () => {
    const policies = [
      makePolicy({
        id: "patient_disclosure_hipaa",
        action: "deny",
        conditions: [{ field: "callerVerified", operator: "eq", value: false }],
        reason: "identity_not_verified",
        regulation: "HIPAA",
      }),
    ];
    const decision = canDisclosePatientInformation(
      makeContext({ callerVerified: false }),
      policies,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.regulation).toBe("HIPAA");

    const decisionVerified = canDisclosePatientInformation(
      makeContext({ callerVerified: true }),
      policies,
    );
    expect(decisionVerified.allowed).toBe(true);
  });

  it("canProvideAllergenStatement: denies when allergen data is stale/unavailable", () => {
    const policies = [
      makePolicy({
        id: "allergen_statement_freshness",
        action: "deny",
        conditions: [{ field: "customFields.allergen_data_current", operator: "eq", value: false }],
        reason: "allergen_data_stale",
      }),
    ];
    const stale = canProvideAllergenStatement(
      makeContext({ customFields: { allergen_data_current: false } }),
      policies,
    );
    expect(stale.allowed).toBe(false);

    const fresh = canProvideAllergenStatement(
      makeContext({ customFields: { allergen_data_current: true } }),
      policies,
    );
    expect(fresh.allowed).toBe(true);
  });

  it("canAnswerListingQuestion: denies fair-housing-risky questions", () => {
    const policies = [
      makePolicy({
        id: "listing_question_fair_housing",
        action: "deny",
        conditions: [{ field: "customFields.contains_protected_class_query", operator: "eq", value: true }],
        reason: "fair_housing_risk",
        regulation: "FHA",
      }),
    ];
    const risky = canAnswerListingQuestion(
      makeContext({ customFields: { contains_protected_class_query: true } }),
      policies,
    );
    expect(risky.allowed).toBe(false);

    const safe = canAnswerListingQuestion(
      makeContext({ customFields: { contains_protected_class_query: false } }),
      policies,
    );
    expect(safe.allowed).toBe(true);
  });

  it("canCreateBooking: denies bookings outside business hours", () => {
    const policies = [
      makePolicy({
        id: "create_booking_hours",
        action: "deny",
        conditions: [{ field: "customFields.within_business_hours", operator: "eq", value: false }],
        reason: "outside_business_hours",
      }),
    ];
    const outside = canCreateBooking(
      makeContext({ customFields: { within_business_hours: false } }),
      policies,
    );
    expect(outside.allowed).toBe(false);

    const inside = canCreateBooking(
      makeContext({ customFields: { within_business_hours: true } }),
      policies,
    );
    expect(inside.allowed).toBe(true);
  });

  it("canTransferToHuman: denies when transfer limit for the call has been exceeded", () => {
    const policies = [
      makePolicy({
        id: "transfer_human_limit",
        action: "deny",
        conditions: [{ field: "customFields.transfer_count", operator: "gte", value: 3 }],
        reason: "transfer_limit_exceeded",
      }),
    ];
    const overLimit = canTransferToHuman(
      makeContext({ customFields: { transfer_count: 3 } }),
      policies,
    );
    expect(overLimit.allowed).toBe(false);

    const underLimit = canTransferToHuman(
      makeContext({ customFields: { transfer_count: 1 } }),
      policies,
    );
    expect(underLimit.allowed).toBe(true);
  });

  it("most-restrictive-wins: if any matching policy denies, the overall decision denies", () => {
    const policies = [
      makePolicy({
        id: "create_booking_capacity",
        action: "allow",
        conditions: [],
      }),
      makePolicy({
        id: "create_booking_hours",
        action: "deny",
        conditions: [{ field: "customFields.within_business_hours", operator: "eq", value: false }],
        reason: "outside_business_hours",
      }),
    ];
    const decision = canCreateBooking(
      makeContext({ customFields: { within_business_hours: false } }),
      policies,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("outside_business_hours");
  });
});
