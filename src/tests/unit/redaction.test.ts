import { describe, expect, it } from "vitest";
import {
  redactOutput,
  redactCardNumbers,
  redactSSN,
  redactPHI,
  buildRedactionRules,
} from "@/lib/tools/redaction";

describe("redactCardNumbers", () => {
  it("redacts a 16-digit card number with no separators", () => {
    const result = redactCardNumbers("Card on file: 4111111111111111");
    expect(result).toBe("Card on file: [CARD REDACTED]");
  });

  it("redacts card numbers with spaces or dashes", () => {
    expect(redactCardNumbers("4111 1111 1111 1111")).toBe("[CARD REDACTED]");
    expect(redactCardNumbers("4111-1111-1111-1111")).toBe("[CARD REDACTED]");
  });

  it("redacts a 13-digit (minimum) and 19-digit (maximum) card-like sequence", () => {
    expect(redactCardNumbers("1234567890123")).toBe("[CARD REDACTED]");
    expect(redactCardNumbers("1234567890123456789")).toBe("[CARD REDACTED]");
  });

  it("does not redact short numeric sequences like a 4-digit PIN or a zip code", () => {
    expect(redactCardNumbers("My zip code is 10001")).toBe("My zip code is 10001");
    expect(redactCardNumbers("PIN: 1234")).toBe("PIN: 1234");
  });

  it("does not over-redact normal conversational text", () => {
    const text = "I'd like to book an appointment for 3 people at 5pm.";
    expect(redactCardNumbers(text)).toBe(text);
  });
});

describe("redactSSN", () => {
  it("redacts a standard SSN pattern", () => {
    expect(redactSSN("My SSN is 123-45-6789.")).toBe("My SSN is [SSN REDACTED].");
  });

  it("redacts multiple SSNs in the same text", () => {
    const text = "First: 123-45-6789 Second: 987-65-4321";
    expect(redactSSN(text)).toBe("First: [SSN REDACTED] Second: [SSN REDACTED]");
  });

  it("does not redact non-SSN-shaped numbers", () => {
    expect(redactSSN("Order number 123-45-678")).toBe("Order number 123-45-678");
    expect(redactSSN("Phone: 555-123-4567")).toBe("Phone: 555-123-4567");
  });

  it("does not redact plain conversational text", () => {
    const text = "Can you confirm the appointment for tomorrow at noon?";
    expect(redactSSN(text)).toBe(text);
  });
});

describe("redactPHI", () => {
  it("minimal level redacts only card numbers and SSNs", () => {
    const text = "SSN 123-45-6789, DOB 01/02/1990, MRN 445566, card 4111111111111111";
    const result = redactPHI(text, "minimal");
    expect(result).toContain("[SSN REDACTED]");
    expect(result).toContain("[CARD REDACTED]");
    expect(result).not.toContain("[DOB REDACTED]");
    expect(result).not.toContain("[MRN REDACTED]");
  });

  it("standard level additionally redacts DOB and MRN", () => {
    const text = "DOB 01/02/1990, MRN: 445566";
    const result = redactPHI(text, "standard");
    expect(result).toContain("[DOB REDACTED]");
    expect(result).toContain("[MRN REDACTED]");
  });

  it("standard is the default level", () => {
    const text = "DOB 1990-01-02";
    expect(redactPHI(text)).toBe(redactPHI(text, "standard"));
  });

  it("strict level additionally redacts patient/doctor names, phone, and email", () => {
    const text = "Patient Sarah Johnson called, ask Dr. Martinez, reach me at (555) 123-4567 or jane@example.com";
    const result = redactPHI(text, "strict");
    expect(result).toContain("patient [NAME REDACTED]");
    expect(result).toContain("Dr. [NAME REDACTED]");
    expect(result).toContain("[PHONE REDACTED]");
    expect(result).toContain("[EMAIL REDACTED]");
  });

  it("does not redact ordinary text at any level", () => {
    const text = "I would like to reschedule my checkup for next week.";
    expect(redactPHI(text, "minimal")).toBe(text);
    expect(redactPHI(text, "standard")).toBe(text);
    expect(redactPHI(text, "strict")).toBe(text);
  });
});

describe("buildRedactionRules", () => {
  it("returns an increasing number of rules for minimal -> standard -> strict", () => {
    const minimal = buildRedactionRules("minimal");
    const standard = buildRedactionRules("standard");
    const strict = buildRedactionRules("strict");

    expect(minimal.length).toBeLessThan(standard.length);
    expect(standard.length).toBeLessThan(strict.length);
  });
});

describe("redactOutput (deep object traversal)", () => {
  it("redacts string values nested inside objects and arrays", () => {
    const rules = buildRedactionRules("standard");
    const input = {
      patient: {
        ssn: "123-45-6789",
        notes: ["card ending seen: 4111111111111111", "no issues"],
      },
      count: 3,
      active: true,
    };

    const result = redactOutput(input, rules) as typeof input;

    expect(result.patient.ssn).toBe("[SSN REDACTED]");
    expect(result.patient.notes[0]).toBe("card ending seen: [CARD REDACTED]");
    expect(result.patient.notes[1]).toBe("no issues");
  });

  it("passes through numbers, booleans, null, and undefined unchanged", () => {
    const rules = buildRedactionRules("standard");
    expect(redactOutput(42, rules)).toBe(42);
    expect(redactOutput(true, rules)).toBe(true);
    expect(redactOutput(null, rules)).toBe(null);
    expect(redactOutput(undefined, rules)).toBe(undefined);
  });

  it("does not mutate the original input object", () => {
    const rules = buildRedactionRules("standard");
    const input = { ssn: "123-45-6789" };
    const result = redactOutput(input, rules) as typeof input;

    expect(input.ssn).toBe("123-45-6789");
    expect(result.ssn).toBe("[SSN REDACTED]");
    expect(result).not.toBe(input);
  });

  it("returns unmodified strings when they contain no PII", () => {
    const rules = buildRedactionRules("strict");
    const input = { greeting: "Thanks for calling Acme Clinic!" };
    const result = redactOutput(input, rules) as typeof input;
    expect(result.greeting).toBe("Thanks for calling Acme Clinic!");
  });

  it("applies rules with the empty rule set as a no-op", () => {
    const input = { ssn: "123-45-6789" };
    const result = redactOutput(input, []) as typeof input;
    expect(result.ssn).toBe("123-45-6789");
  });
});
