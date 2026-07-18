import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { isRealPhoneNumber } from "@/lib/calls/display";

const MAX_ROWS = 10_000;

const importSchema = z.object({
  csv: z.string().min(1, "Paste or upload a CSV first").max(5_000_000),
});

/**
 * Minimal RFC-4180-ish CSV parser.
 *
 * Written by hand rather than pulled from npm because the requirement is
 * narrow (one flat table of contacts) and the one thing a naive `split(",")`
 * gets wrong is exactly the thing real exports contain: quoted fields holding
 * commas — `"Doe, Jane",+15550001234`. Handles quoted fields, escaped quotes
 * (`""`), and CRLF/LF line endings.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Swallow the LF of a CRLF pair so it doesn't open an empty row.
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop rows that are entirely empty (trailing newline, blank separator lines).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Maps a header cell to one of our columns. Exports in the wild label the same
 * column a dozen ways ("Phone Number", "Mobile", "Cell"), and making the user
 * rename their headers before uploading is a pointless chore.
 */
function columnFor(header: string): "name" | "phone" | "email" | "company" | "notes" | null {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (["name", "full name", "fullname", "contact", "contact name", "first name"].includes(key)) return "name";
  if (
    [
      "phone",
      "phone number",
      "phonenumber",
      "mobile",
      "mobile number",
      "cell",
      "cell phone",
      "number",
      "telephone",
      "tel",
    ].includes(key)
  ) {
    return "phone";
  }
  if (["email", "e mail", "email address"].includes(key)) return "email";
  if (["company", "organization", "organisation", "business", "account"].includes(key)) return "company";
  if (["notes", "note", "comment", "comments", "description"].includes(key)) return "notes";
  return null;
}

/**
 * Bulk-loads a contact list from CSV text.
 *
 * Upserts rather than inserts: a list re-uploaded (or overlapping an earlier
 * one) must not fail wholesale on the first number already in the book — the
 * user's intent is "make sure these people are in there", not "insert exactly
 * these rows". Duplicates are counted and reported instead of erroring.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const rows = parseCsv(parsed.data.csv);
  if (rows.length < 2) {
    return NextResponse.json({ error: "That CSV needs a header row and at least one contact row." }, { status: 400 });
  }

  const headers = rows[0].map(columnFor);
  if (!headers.includes("phone")) {
    return NextResponse.json(
      { error: 'No phone column found. Add a header named "phone", "phone number", or "mobile".' },
      { status: 400 }
    );
  }

  const dataRows = rows.slice(1, 1 + MAX_ROWS);
  let skipped = rows.length - 1 - dataRows.length;

  // Collapse duplicates *within the file* first: Postgres rejects an upsert
  // whose payload hits the same conflict target twice ("ON CONFLICT DO UPDATE
  // command cannot affect row a second time"), which would fail the batch.
  const byPhone = new Map<
    string,
    { name: string | null; email: string | null; company: string | null; notes: string | null }
  >();

  for (const row of dataRows) {
    const record: Record<string, string> = {};
    headers.forEach((column, index) => {
      if (column) record[column] = (row[index] ?? "").trim();
    });

    const phone = record.phone ?? "";
    if (!isRealPhoneNumber(phone)) {
      skipped++;
      continue;
    }

    byPhone.set(phone, {
      name: record.name || null,
      email: record.email || null,
      company: record.company || null,
      notes: record.notes || null,
    });
  }

  if (byPhone.size === 0) {
    return NextResponse.json({ data: { imported: 0, skipped, duplicates: 0 } });
  }

  const phones = Array.from(byPhone.keys());

  // Counted before writing so the summary can distinguish "added" from
  // "already had" — the user wants to know what actually changed.
  const { data: existing } = await supabase
    .from("contacts")
    .select("phone")
    .eq("tenant_id", tenantId)
    .in("phone", phones);

  const duplicates = existing?.length ?? 0;

  const payload = phones.map((phone) => {
    const fields = byPhone.get(phone)!;
    return {
      tenant_id: tenantId,
      phone,
      name: fields.name,
      email: fields.email,
      company: fields.company,
      notes: fields.notes,
      source: "uploaded",
    };
  });

  const { error } = await supabase.from("contacts").upsert(payload, { onConflict: "tenant_id,phone" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: { imported: payload.length - duplicates, skipped, duplicates },
  });
}
