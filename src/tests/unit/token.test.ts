import { describe, expect, it, beforeEach, vi } from "vitest";
import { createCallToken, verifyCallToken, TokenError } from "@/lib/tools/token";

describe("call token round-trip", () => {
  beforeEach(() => {
    vi.stubEnv("CALL_TOKEN_SECRET", "test-secret-value-do-not-use-in-prod");
  });

  it("creates a token and verifies it back to the original payload", () => {
    const token = createCallToken("call-123", "tenant-abc", ["check-availability", "create-booking"]);
    const payload = verifyCallToken(token);

    expect(payload.call_id).toBe("call-123");
    expect(payload.tenant_id).toBe("tenant-abc");
    expect(payload.enabled_tools).toEqual(["check-availability", "create-booking"]);
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("produces a three-part dot-separated JWT-shaped string", () => {
    const token = createCallToken("call-1", "tenant-1", []);
    expect(token.split(".")).toHaveLength(3);
  });

  it("respects a custom expiry window", () => {
    const token = createCallToken("call-1", "tenant-1", [], 60);
    const payload = verifyCallToken(token);
    expect(payload.exp - payload.iat).toBe(60);
  });

  it("rejects a token that has expired", () => {
    const token = createCallToken("call-1", "tenant-1", [], -10); // already expired
    expect(() => verifyCallToken(token)).toThrow(TokenError);
    try {
      verifyCallToken(token);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TokenError);
      expect((err as TokenError).code).toBe("expired");
    }
  });

  it("rejects a token with a tampered payload", () => {
    const token = createCallToken("call-1", "tenant-1", ["check-availability"]);
    const [header, , signature] = token.split(".");

    const tamperedPayloadJson = JSON.stringify({
      call_id: "call-1",
      tenant_id: "someone-elses-tenant",
      enabled_tools: ["check-availability"],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const tamperedPayload = Buffer.from(tamperedPayloadJson)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

    expect(() => verifyCallToken(tamperedToken)).toThrow(TokenError);
    try {
      verifyCallToken(tamperedToken);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as TokenError).code).toBe("invalid_signature");
    }
  });

  it("rejects a token with a tampered signature", () => {
    const token = createCallToken("call-1", "tenant-1", []);
    const parts = token.split(".");
    const firstChar = parts[2][0];
    const replacementChar = firstChar === "A" ? "B" : "A";
    const tamperedSignature = replacementChar + parts[2].slice(1);
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

    expect(tamperedSignature).not.toBe(parts[2]);
    expect(() => verifyCallToken(tamperedToken)).toThrow(TokenError);
  });

  it("rejects a malformed token (wrong number of segments)", () => {
    expect(() => verifyCallToken("not-a-valid-token")).toThrow(TokenError);
    try {
      verifyCallToken("only.two");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as TokenError).code).toBe("invalid_format");
    }
  });

  it("rejects a token signed with a different secret", () => {
    const token = createCallToken("call-1", "tenant-1", []);

    vi.stubEnv("CALL_TOKEN_SECRET", "a-completely-different-secret");
    expect(() => verifyCallToken(token)).toThrow(TokenError);
  });

  it("throws when CALL_TOKEN_SECRET is not set", () => {
    vi.stubEnv("CALL_TOKEN_SECRET", "");
    expect(() => createCallToken("call-1", "tenant-1", [])).toThrow(
      "CALL_TOKEN_SECRET environment variable is not set",
    );
  });
});
