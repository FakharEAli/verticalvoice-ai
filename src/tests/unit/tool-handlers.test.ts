import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { healthcareToolHandlers } from "@/lib/tools/healthcare";
import { realEstateToolHandlers } from "@/lib/tools/real-estate";

/**
 * Behavioural regression tests for the tool handlers that run mid-call.
 *
 * The contract tests in tool-contracts.test.ts prove the pack and the handler
 * agree on parameter NAMES. These prove the handlers actually behave: that PHI
 * needs a matching date of birth, that a valuation request is not filed as a
 * confirmed appointment, and that a raw Postgres error never reaches the model.
 */

// ─── Supabase test double ────────────────────────────────────────────────────

interface RecordedQuery {
  table: string;
  op: "select" | "insert" | "update";
  payload?: Record<string, unknown>;
  /** [method, column, value] — e.g. ["ilike", "patient_name", "Ann"]. */
  filters: Array<[string, string, unknown]>;
}

type Responder = (q: RecordedQuery) => { data: unknown; error: unknown };

const FILTER_METHODS = ["eq", "neq", "ilike", "gte", "lte", "in", "is"] as const;
const PASSTHROUGH_METHODS = ["select", "order", "limit"] as const;

/**
 * A minimal stand-in for the PostgREST query builder: chainable, awaitable,
 * and it records every filter so a test can assert on what was actually asked
 * of the database — which is the whole point for the identity-match fix.
 */
function makeSupabase(respond: Responder) {
  const queries: RecordedQuery[] = [];

  function builder(q: RecordedQuery) {
    const settle = () => respond(q);
    const chain: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(settle()).then(resolve),
      single: () => Promise.resolve(settle()),
      maybeSingle: () => Promise.resolve(settle()),
    };
    for (const m of FILTER_METHODS) {
      chain[m] = (column: string, value: unknown) => {
        q.filters.push([m, column, value]);
        return chain;
      };
    }
    for (const m of PASSTHROUGH_METHODS) {
      chain[m] = () => chain;
    }
    return chain;
  }

  const client = {
    from(table: string) {
      return {
        select() {
          const q: RecordedQuery = { table, op: "select", filters: [] };
          queries.push(q);
          return builder(q);
        },
        insert(payload: Record<string, unknown>) {
          const q: RecordedQuery = { table, op: "insert", payload, filters: [] };
          queries.push(q);
          return builder(q);
        },
        update(payload: Record<string, unknown>) {
          const q: RecordedQuery = { table, op: "update", payload, filters: [] };
          queries.push(q);
          return builder(q);
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, queries };
}

const TENANT = "11111111-1111-1111-1111-111111111111";
const CALL = "22222222-2222-2222-2222-222222222222";

function ctx(client: SupabaseClient<Database>, input: Record<string, unknown>) {
  return { supabase: client, tenantId: TENANT, callId: CALL, input, isTest: false };
}

// ─── get_patient_info: HIPAA identity verification ───────────────────────────

describe("get_patient_info enforces the identity check the hipaa_verification policy advertises", () => {
  const PHI_ROW = {
    id: "a1",
    scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
    duration_minutes: 30,
    status: "scheduled",
    reason: "Annual physical",
    provider_id: null,
  };

  it("returns no PHI when the caller supplies a name but no date of birth", async () => {
    const { client, queries } = makeSupabase(() => ({ data: [PHI_ROW], error: null }));

    const result = await healthcareToolHandlers.get_patient_info(
      ctx(client, { patient_name: "Ann Delgado" })
    );

    expect(result.verified).toBe(false);
    expect(result.reason).toBe("missing_date_of_birth");
    expect(result.upcoming_appointments).toEqual([]);
    // It must not even ask the database for the record.
    expect(queries).toHaveLength(0);
  });

  it("filters on patient_dob so an unverified name match cannot return PHI", async () => {
    const { client, queries } = makeSupabase(() => ({ data: [PHI_ROW], error: null }));

    await healthcareToolHandlers.get_patient_info(
      ctx(client, { patient_name: "Ann Delgado", date_of_birth: "1980-04-02" })
    );

    expect(queries[0].filters).toContainEqual(["eq", "patient_dob", "1980-04-02"]);
  });

  it("matches the name exactly rather than as a substring", async () => {
    const { client, queries } = makeSupabase(() => ({ data: [], error: null }));

    await healthcareToolHandlers.get_patient_info(
      ctx(client, { patient_name: "Ann", date_of_birth: "1980-04-02" })
    );

    const nameFilter = queries[0].filters.find(([, column]) => column === "patient_name");
    // `%Ann%` would also match "Ann Marie Delgado" and "Joanne Baxter" —
    // returning a different patient's appointments to whoever is on the line.
    expect(nameFilter).toEqual(["ilike", "patient_name", "Ann"]);
  });

  it("accepts a full ISO timestamp as the date of birth", async () => {
    const { client, queries } = makeSupabase(() => ({ data: [], error: null }));

    await healthcareToolHandlers.get_patient_info(
      ctx(client, { patient_name: "Ann Delgado", date_of_birth: "1980-04-02T00:00:00.000Z" })
    );

    expect(queries[0].filters).toContainEqual(["eq", "patient_dob", "1980-04-02"]);
  });

  it("rejects an unparseable date of birth instead of matching on name alone", async () => {
    const { client, queries } = makeSupabase(() => ({ data: [PHI_ROW], error: null }));

    const result = await healthcareToolHandlers.get_patient_info(
      ctx(client, { patient_name: "Ann Delgado", date_of_birth: "sometime in April" })
    );

    expect(result.verified).toBe(false);
    expect(queries).toHaveLength(0);
  });
});

// ─── book_appointment_slot / submit_refill_request: real names, not IDs ──────

describe("book_appointment_slot writes the caller's actual name and DOB", () => {
  it("stores patient_name and patient_dob from the renamed parameters", async () => {
    const { client, queries } = makeSupabase(() => ({
      data: { id: "appt-1", scheduled_at: "2026-02-02T15:00:00.000Z" },
      error: null,
    }));

    const result = await healthcareToolHandlers.book_appointment_slot(
      ctx(client, {
        patient_name: "Ann Delgado",
        date_of_birth: "1980-04-02",
        slot_id: "2026-02-02T15:00:00.000Z",
        appointment_type: "annual_physical",
        patient_phone: "+15550001234",
      })
    );

    expect(result.booked).toBe(true);
    expect(queries[0].payload).toMatchObject({
      patient_name: "Ann Delgado",
      patient_dob: "1980-04-02",
      patient_phone: "+15550001234",
    });
  });

  it("refuses to book an unverifiable record with no date of birth", async () => {
    const { client, queries } = makeSupabase(() => ({ data: null, error: null }));

    const result = await healthcareToolHandlers.book_appointment_slot(
      ctx(client, {
        patient_name: "Ann Delgado",
        slot_id: "2026-02-02T15:00:00.000Z",
        appointment_type: "annual_physical",
      })
    );

    expect(result).toEqual({ booked: false, reason: "missing_date_of_birth" });
    expect(queries).toHaveLength(0);
  });
});

describe("submit_refill_request writes a pharmacy name, not an ID", () => {
  it("maps pharmacy_name straight through to the pharmacy_name column", async () => {
    const { client, queries } = makeSupabase(() => ({ data: { id: "refill-1" }, error: null }));

    const result = await healthcareToolHandlers.submit_refill_request(
      ctx(client, {
        patient_name: "Ann Delgado",
        medication_name: "Lisinopril",
        pharmacy_name: "Walgreens on Oak Street",
        patient_phone: "+15550001234",
      })
    );

    expect(result.submitted).toBe(true);
    expect(queries[0].payload).toMatchObject({
      patient_name: "Ann Delgado",
      pharmacy_name: "Walgreens on Oak Street",
    });
  });
});

// ─── reschedule_appointment ──────────────────────────────────────────────────

describe("reschedule_appointment", () => {
  it("moves an appointment found by phone to the new time", async () => {
    const { client, queries } = makeSupabase((q) => {
      if (q.op === "select" && q.filters.some(([m, c]) => m === "eq" && c === "patient_phone")) {
        return { data: { id: "appt-1", scheduled_at: "2026-02-02T15:00:00.000Z" }, error: null };
      }
      if (q.op === "select") return { data: [], error: null }; // no clashing neighbours
      return { data: { id: "appt-1", scheduled_at: "2026-02-09T15:00:00.000Z" }, error: null };
    });

    const result = await healthcareToolHandlers.reschedule_appointment(
      ctx(client, { patient_phone: "+15550001234", new_datetime: "2026-02-09T15:00:00.000Z" })
    );

    expect(result).toMatchObject({
      rescheduled: true,
      appointment_id: "appt-1",
      old_date: "2026-02-02T15:00:00.000Z",
      new_date: "2026-02-09T15:00:00.000Z",
    });
    expect(queries.at(-1)?.payload).toMatchObject({ scheduled_at: "2026-02-09T15:00:00.000Z" });
  });

  it("does not double-book a slot another appointment already holds", async () => {
    const { client } = makeSupabase((q) => {
      if (q.op === "select" && q.filters.some(([m, c]) => m === "eq" && c === "patient_phone")) {
        return { data: { id: "appt-1", scheduled_at: "2026-02-02T15:00:00.000Z" }, error: null };
      }
      if (q.op === "select") {
        return {
          data: [{ id: "appt-2", scheduled_at: "2026-02-09T15:00:00.000Z", duration_minutes: 30 }],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const result = await healthcareToolHandlers.reschedule_appointment(
      ctx(client, { patient_phone: "+15550001234", new_datetime: "2026-02-09T15:00:00.000Z" })
    );

    expect(result).toMatchObject({ rescheduled: false, reason: "no_availability" });
  });

  it("reports not-found rather than inventing an appointment", async () => {
    const { client } = makeSupabase(() => ({ data: null, error: null }));

    const result = await healthcareToolHandlers.reschedule_appointment(
      ctx(client, { patient_name: "Nobody Here", new_datetime: "2026-02-09T15:00:00.000Z" })
    );

    expect(result).toMatchObject({ rescheduled: false, reason: "appointment_not_found" });
  });

  it("needs both a new time and some way to identify the appointment", async () => {
    const { client } = makeSupabase(() => ({ data: null, error: null }));

    expect(
      await healthcareToolHandlers.reschedule_appointment(ctx(client, { patient_phone: "+15550001234" }))
    ).toMatchObject({ reason: "missing_new_datetime" });

    expect(
      await healthcareToolHandlers.reschedule_appointment(
        ctx(client, { new_datetime: "2026-02-09T15:00:00.000Z" })
      )
    ).toMatchObject({ reason: "missing_identifier" });
  });
});

// ─── submit_valuation_request: a request, not a fabricated appointment ───────

describe("submit_valuation_request records a request, not a confirmed booking", () => {
  it("leaves scheduled_at null and files the row as requested", async () => {
    const { client, queries } = makeSupabase(() => ({ data: { id: "val-1" }, error: null }));

    const result = await realEstateToolHandlers.submit_valuation_request(
      ctx(client, {
        property_address: "742 Evergreen Terrace",
        owner_name: "Ann Delgado",
        owner_phone: "+15550001234",
        purpose: "thinking of selling",
      })
    );

    expect(result.submitted).toBe(true);
    // The old code invented "now + 3 business days at 10:00" and called it
    // scheduled — a calendar commitment nobody had agreed to.
    expect(queries[0].payload?.scheduled_at).toBeNull();
    expect(queries[0].payload?.status).toBe("requested");
  });

  it("keeps the caller's stated purpose and urgency as readable notes", async () => {
    const { client, queries } = makeSupabase(() => ({ data: { id: "val-1" }, error: null }));

    await realEstateToolHandlers.submit_valuation_request(
      ctx(client, {
        property_address: "742 Evergreen Terrace",
        owner_name: "Ann Delgado",
        purpose: "refinancing",
        urgency: "this month",
      })
    );

    expect(queries[0].payload?.notes).toBe("Purpose: refinancing. Urgency: this month");
  });
});

// ─── dispatcher: no raw database error reaches the caller ────────────────────

vi.mock("@/lib/telephony/tool-token", () => ({
  verifyToolToken: () => ({
    tenant_id: "11111111-1111-1111-1111-111111111111",
    call_id: "22222222-2222-2222-2222-222222222222",
    industry: "healthcare",
    is_test: false,
  }),
}));

const insertedToolRuns: Array<Record<string, unknown>> = [];
vi.mock("@/lib/database/supabase-admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        insertedToolRuns.push(payload);
        return Promise.resolve({ data: null, error: null });
      },
    }),
  }),
}));

const RAW_PG_ERROR =
  'duplicate key value violates unique constraint "appointments_pkey" (SQLSTATE 23505)';

vi.mock("@/lib/tools/registry", () => ({
  getToolHandler: () => async () => {
    throw new Error(RAW_PG_ERROR);
  },
}));

vi.mock("@/lib/notifications/dispatch", () => ({ notifyStaff: async () => undefined }));

describe("tool dispatcher never hands a raw database error to the model", () => {
  beforeEach(() => {
    insertedToolRuns.length = 0;
  });

  it("returns a caller-safe message while logging and persisting the real one", async () => {
    const { POST, CALLER_SAFE_TOOL_ERROR } = await import(
      "@/app/api/v1/tools/execute/[toolId]/route"
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new Request("https://example.test/api/v1/tools/execute/book_appointment_slot", {
      method: "POST",
      body: JSON.stringify({ patient_name: "Ann Delgado" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request as unknown as Parameters<typeof POST>[0], {
      params: Promise.resolve({ toolId: "book_appointment_slot" }),
    });
    const body = (await response.json()) as { error: string };

    // Status semantics are unchanged — only the body is sanitized.
    expect(response.status).toBe(500);
    expect(body.error).toBe(CALLER_SAFE_TOOL_ERROR);

    // Nothing a caller should ever hear read aloud.
    expect(body.error).not.toContain("constraint");
    expect(body.error).not.toContain("appointments_pkey");
    expect(body.error).not.toContain("SQLSTATE");
    expect(body.error).not.toContain(RAW_PG_ERROR);

    // ...but staff lose nothing: the real message is logged and stored.
    expect(errorSpy).toHaveBeenCalled();
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("appointments_pkey");
    expect(insertedToolRuns[0]).toMatchObject({
      status: "error",
      error_message: RAW_PG_ERROR,
    });

    errorSpy.mockRestore();
  });
});
