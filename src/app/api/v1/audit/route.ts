import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";

// ─────────────────────────────────────────────────────────────────────────
// Returns the current tenant's real audit_events for the Audit Log
// dashboard page, most recent first.
//
// Membership is verified with the cookie-scoped client via
// getCurrentTenantId, then reads run on the admin client. audit_events
// itself has a tenant-scoped SELECT RLS policy the cookie client could
// satisfy, but `actor_id` stores the Supabase auth UID (not the internal
// users.id) and resolving it to a display name requires reading other
// members' `users` rows, which `users_select` RLS (auth_id = auth.uid())
// blocks for anyone but the caller. Admin client is safe here because
// tenant membership was already confirmed above.
// ─────────────────────────────────────────────────────────────────────────

const EVENT_LIMIT = 300;

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant configured for this account" },
        { status: 404 },
      );
    }

    const admin = createAdminClient();

    const { data: eventRows, error: eventsError } = await admin
      .from("audit_events")
      .select("id, actor_id, action, resource_type, resource_id, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT);

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    const actorIds = Array.from(
      new Set((eventRows ?? []).map((e) => e.actor_id).filter((id): id is string => !!id)),
    );

    const { data: actorRows, error: actorsError } =
      actorIds.length > 0
        ? await admin.from("users").select("auth_id, email, full_name").in("auth_id", actorIds)
        : { data: [], error: null };

    if (actorsError) {
      return NextResponse.json({ error: actorsError.message }, { status: 500 });
    }

    const actorMap = new Map((actorRows ?? []).map((a) => [a.auth_id, a]));

    const events = (eventRows ?? []).map((event) => {
      const actor = event.actor_id ? actorMap.get(event.actor_id) : null;
      return {
        id: event.id,
        action: event.action,
        resourceType: event.resource_type,
        resourceId: event.resource_id,
        metadata: event.metadata,
        createdAt: event.created_at,
        actorId: event.actor_id,
        actorEmail: actor?.email ?? null,
        actorName: actor?.full_name ?? actor?.email ?? null,
      };
    });

    return NextResponse.json({
      tenantId,
      events,
      truncated: (eventRows ?? []).length >= EVENT_LIMIT,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
