import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import type { Database } from "@/lib/database/types";

const CONTACT_FIELDS =
  "id, name, phone, email, company, notes, tags, source, first_contacted_at, last_contacted_at, call_count, do_not_call, created_at";

// `phone` is intentionally absent: it's the contact's identity (the unique key
// the call-capture upsert matches on), so changing it would silently detach the
// row from its own call history. Delete and re-add instead.
const updateContactSchema = z
  .object({
    name: z.string().trim().max(200).nullable(),
    email: z.union([z.string().trim().email("Enter a valid email address").max(200), z.literal("")]).nullable(),
    company: z.string().trim().max(200).nullable(),
    notes: z.string().trim().max(2000).nullable(),
    tags: z.array(z.string().trim().min(1).max(50)).max(25).nullable(),
    do_not_call: z.boolean(),
  })
  .partial();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const patch: Database["public"]["Tables"]["contacts"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if ("name" in input) patch.name = input.name || null;
  if ("email" in input) patch.email = input.email || null;
  if ("company" in input) patch.company = input.company || null;
  if ("notes" in input) patch.notes = input.notes || null;
  if ("tags" in input) patch.tags = input.tags && input.tags.length > 0 ? input.tags : null;
  if ("do_not_call" in input) patch.do_not_call = input.do_not_call;

  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select(CONTACT_FIELDS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({ data: { id: data.id } });
}
