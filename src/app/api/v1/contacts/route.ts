import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";

const CONTACT_FIELDS =
  "id, name, phone, email, company, notes, tags, source, first_contacted_at, last_contacted_at, call_count, do_not_call, created_at";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * Lists this tenant's contact book, newest first.
 *
 * `search` matches name, phone, or email at once — a user looking someone up
 * has one box and doesn't know (or care) which column their memory of the
 * person lives in.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });

  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT)
  );

  let query = supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) {
    // Commas and parens are the PostgREST `or` filter's own delimiters, so a
    // pasted number like "+1 (555) 000-1234" would corrupt the expression.
    const safe = search.replace(/[,()]/g, " ").trim();
    if (safe) {
      query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

const createContactSchema = z.object({
  // Deliberately looser than the E.164 `phoneSchema` used for placing calls:
  // a contact book has to accept a number as the user has it written down.
  phone: z.string().trim().min(7, "Enter a valid phone number").max(32),
  name: z.string().trim().max(200).optional().nullable(),
  email: z.union([z.string().trim().email("Enter a valid email address").max(200), z.literal("")]).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(25).optional(),
  do_not_call: z.boolean().optional(),
});

/** Adds one contact by hand. */
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

  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      tenant_id: tenantId,
      phone: input.phone,
      name: input.name || null,
      email: input.email || null,
      company: input.company || null,
      notes: input.notes || null,
      tags: input.tags && input.tags.length > 0 ? input.tags : null,
      do_not_call: input.do_not_call ?? false,
      source: "manual",
    })
    .select(CONTACT_FIELDS)
    .single();

  if (error) {
    // 23505 = unique_violation on idx_contacts_tenant_phone. The raw Postgres
    // text ("duplicate key value violates unique constraint...") means nothing
    // to someone typing a phone number into a form.
    if (error.code === "23505") {
      return NextResponse.json({ error: "This phone number is already in your contacts" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
