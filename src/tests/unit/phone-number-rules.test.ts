import { describe, expect, it } from "vitest";
import {
  evaluateReleaseGuard,
  isValidAreaCode,
  isValidCountry,
  normalizeAreaCode,
  normalizeCountry,
} from "@/lib/telephony/phone-number-rules";

/**
 * The phone-number feature has exactly two pieces of pure logic that MUST be
 * right: the search-input validation (so we never send garbage to Twilio) and
 * the release guard (so a running campaign is never left with no number to
 * dial from). Both are tested here without any network or database.
 */

describe("normalizeCountry / isValidCountry", () => {
  it("uppercases and trims a country code", () => {
    expect(normalizeCountry("  us ")).toBe("US");
  });

  it("accepts a two-letter code", () => {
    expect(isValidCountry("us")).toBe(true);
    expect(isValidCountry("CA")).toBe(true);
  });

  it("rejects anything that isn't two letters", () => {
    expect(isValidCountry("")).toBe(false);
    expect(isValidCountry("USA")).toBe(false);
    expect(isValidCountry("U1")).toBe(false);
    expect(isValidCountry(null)).toBe(false);
  });
});

describe("normalizeAreaCode / isValidAreaCode", () => {
  it("strips formatting a user might paste", () => {
    expect(normalizeAreaCode("(361)")).toBe("361");
    expect(normalizeAreaCode("3-6-1")).toBe("361");
  });

  it("treats a blank area code as valid (country-wide search)", () => {
    expect(isValidAreaCode("")).toBe(true);
    expect(isValidAreaCode(null)).toBe(true);
    expect(isValidAreaCode("   ")).toBe(true);
  });

  it("accepts a plausible area code", () => {
    expect(isValidAreaCode("361")).toBe(true);
    expect(isValidAreaCode("20")).toBe(true);
  });

  it("rejects a full phone number pasted into the area-code box", () => {
    expect(isValidAreaCode("13615548879")).toBe(false);
  });

  it("rejects a single lone digit as too short", () => {
    expect(isValidAreaCode("3")).toBe(false);
  });

  it("treats pure non-digit input as a blank (country-wide) search", () => {
    // Non-digits are stripped, so "abc" collapses to "" — harmless, not an error.
    expect(isValidAreaCode("abc")).toBe(true);
  });
});

describe("evaluateReleaseGuard", () => {
  it("refuses to release the last active number while a campaign runs", () => {
    const result = evaluateReleaseGuard({
      numberIsActive: true,
      otherActiveNumbersCount: 0,
      hasRunningCampaign: true,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toMatch(/campaign/i);
    }
  });

  it("allows releasing the active number when no campaign is running", () => {
    expect(
      evaluateReleaseGuard({
        numberIsActive: true,
        otherActiveNumbersCount: 0,
        hasRunningCampaign: false,
      }).allowed,
    ).toBe(true);
  });

  it("allows releasing the active number when another active number exists", () => {
    expect(
      evaluateReleaseGuard({
        numberIsActive: true,
        otherActiveNumbersCount: 1,
        hasRunningCampaign: true,
      }).allowed,
    ).toBe(true);
  });

  it("allows releasing an inactive spare even during a running campaign", () => {
    expect(
      evaluateReleaseGuard({
        numberIsActive: false,
        otherActiveNumbersCount: 1,
        hasRunningCampaign: true,
      }).allowed,
    ).toBe(true);
  });
});
