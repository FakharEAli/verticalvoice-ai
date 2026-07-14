import { describe, expect, it, beforeEach, vi } from "vitest";

// ─── Mock the Supabase server client (pure-logic test, no live DB) ─────────

const mockCreateClient = vi.fn();

vi.mock("@/lib/database/supabase-server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

interface SupabaseMockConfig {
  call: { data: unknown; error: unknown };
  tenant: { data: unknown; error: unknown };
  policySettings: { data: unknown; error: unknown };
}

function makeSupabaseMock(config: SupabaseMockConfig) {
  const insertMock = vi.fn(() => Promise.resolve({ error: null }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "calls":
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve(config.call) }),
          }),
        };
      case "tenants":
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve(config.tenant) }),
          }),
        };
      case "policy_settings":
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve(config.policySettings) }),
          }),
        };
      case "audit_events":
        return { insert: insertMock };
      default:
        throw new Error(`Unexpected table in test mock: ${table}`);
    }
  });

  return { client: { from }, insertMock };
}

const CALL_ID = "11111111-1111-1111-1111-111111111111";
const TENANT_ID = "22222222-2222-2222-2222-222222222222";

function defaultSupabaseConfig(): SupabaseMockConfig {
  return {
    call: { data: { id: CALL_ID, tenant_id: TENANT_ID }, error: null },
    tenant: {
      data: { id: TENANT_ID, name: "Acme Clinic", industry: "healthcare", status: "active" },
      error: null,
    },
    policySettings: {
      data: { pii_redaction_enabled: false, hipaa_mode: false },
      error: null,
    },
  };
}

// Import after mocks are registered.
import { handleToolCall, type ToolCallRequest } from "@/lib/tools/gateway";
import { createCallToken } from "@/lib/tools/token";

function makeRequest(overrides: Partial<ToolCallRequest> = {}, token?: string): ToolCallRequest {
  return {
    headers: { authorization: token ? `Bearer ${token}` : undefined },
    body: {},
    ...overrides,
  };
}

describe("handleToolCall (tool gateway contract)", () => {
  beforeEach(() => {
    vi.stubEnv("CALL_TOKEN_SECRET", "contract-test-secret");
    mockCreateClient.mockReset();
  });

  describe("token authentication", () => {
    it("rejects a request with a missing Authorization header", async () => {
      const result = await handleToolCall(makeRequest({ headers: {} }), "check-availability");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Missing or invalid Authorization header/);
    });

    it("rejects a request with a malformed (non-Bearer) Authorization header", async () => {
      const result = await handleToolCall(
        makeRequest({ headers: { authorization: "Basic abc123" } }),
        "check-availability",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Missing or invalid Authorization header/);
    });

    it("rejects a request with an invalid/tampered token", async () => {
      const token = createCallToken(CALL_ID, TENANT_ID, ["check-availability"]);
      const tamperedToken = token.slice(0, -3) + "xyz";

      const result = await handleToolCall(makeRequest({}, tamperedToken), "check-availability");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Token verification failed/);
    });

    it("rejects a request with an expired token", async () => {
      const token = createCallToken(CALL_ID, TENANT_ID, ["check-availability"], -60);
      const result = await handleToolCall(makeRequest({}, token), "check-availability");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Token verification failed: expired/);
    });

    it("never touches the database when the token is invalid", async () => {
      await handleToolCall(makeRequest({ headers: {} }), "check-availability");
      expect(mockCreateClient).not.toHaveBeenCalled();
    });
  });

  describe("disabled tools", () => {
    it("rejects a tool call for a tool not present in the token's enabled_tools list", async () => {
      const { client } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["check-availability"]);
      const result = await handleToolCall(
        makeRequest({ body: { date: "menu" } }, token),
        "create-booking",
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not enabled for this call/);
    });

    it("allows a tool call for a tool present in the token's enabled_tools list", async () => {
      const { client } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["check-availability"]);
      const result = await handleToolCall(
        makeRequest({ body: { date: "2024-07-01" } }, token),
        "check-availability",
      );

      expect(result.success).toBe(true);
    });

    it("allows any registered tool when enabled_tools is empty (no restriction configured)", async () => {
      const { client } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, []);
      const result = await handleToolCall(
        makeRequest({ body: { date: "2024-07-01" } }, token),
        "check-availability",
      );

      expect(result.success).toBe(true);
    });

    it("rejects a tool name with no registered schema", async () => {
      const { client } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, []);
      const result = await handleToolCall(makeRequest({ body: {} }, token), "not-a-real-tool");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No schema registered/);
    });
  });

  describe("idempotency", () => {
    it("returns the cached result on retry with the same idempotency key without re-executing", async () => {
      const { client, insertMock } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["create-booking"]);
      const body = {
        date: "2024-07-01",
        time: "10:00",
        name: "Jane Doe",
        phone: "+15551234567",
      };

      const first = await handleToolCall(
        makeRequest({ body, idempotencyKey: "idem-key-1" }, token),
        "create-booking",
      );
      expect(first.success).toBe(true);

      // A real (non-cached) execution logs an audit event; confirm exactly
      // one was recorded after the first call.
      expect(insertMock).toHaveBeenCalledTimes(1);

      const second = await handleToolCall(
        makeRequest({ body, idempotencyKey: "idem-key-1" }, token),
        "create-booking",
      );
      expect(second.success).toBe(true);

      // Cached path returns the exact same payload and does not append a
      // new audit log entry (Step 8-10 are skipped entirely on cache hit).
      expect(second.data).toEqual(first.data);
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    it("executes independently (no cross-contamination) for different idempotency keys", async () => {
      const { client, insertMock } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["create-booking"]);
      const body = {
        date: "2024-07-01",
        time: "10:00",
        name: "Jane Doe",
        phone: "+15551234567",
      };

      await handleToolCall(makeRequest({ body, idempotencyKey: "key-a" }, token), "create-booking");
      await handleToolCall(makeRequest({ body, idempotencyKey: "key-b" }, token), "create-booking");

      expect(insertMock).toHaveBeenCalledTimes(2);
    });

    it("does not cache/dedupe when no idempotency key is supplied", async () => {
      const { client, insertMock } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["create-booking"]);
      const body = {
        date: "2024-07-01",
        time: "10:00",
        name: "Jane Doe",
        phone: "+15551234567",
      };

      await handleToolCall(makeRequest({ body }, token), "create-booking");
      await handleToolCall(makeRequest({ body }, token), "create-booking");

      expect(insertMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("input validation and tenant checks", () => {
    it("rejects a call whose input fails schema validation", async () => {
      const { client } = makeSupabaseMock(defaultSupabaseConfig());
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["create-booking"]);
      const result = await handleToolCall(
        makeRequest({ body: { date: "2024-07-01" } }, token), // missing required fields
        "create-booking",
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Input validation failed/);
    });

    it("rejects when the call does not belong to the authenticated tenant", async () => {
      const config = defaultSupabaseConfig();
      config.call = { data: { id: CALL_ID, tenant_id: "some-other-tenant" }, error: null };
      const { client } = makeSupabaseMock(config);
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["check-availability"]);
      const result = await handleToolCall(
        makeRequest({ body: { date: "2024-07-01" } }, token),
        "check-availability",
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/does not belong to the authenticated tenant/);
    });

    it("rejects when the tenant account is not active", async () => {
      const config = defaultSupabaseConfig();
      config.tenant = {
        data: { id: TENANT_ID, name: "Acme Clinic", industry: "healthcare", status: "suspended" },
        error: null,
      };
      const { client } = makeSupabaseMock(config);
      mockCreateClient.mockResolvedValue(client);

      const token = createCallToken(CALL_ID, TENANT_ID, ["check-availability"]);
      const result = await handleToolCall(
        makeRequest({ body: { date: "2024-07-01" } }, token),
        "check-availability",
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Tenant account is not active/);
    });
  });
});
