import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { getCurrentTenantId } from "@/domain/tenants/current";

// ─────────────────────────────────────────────────────────────────────────
// Returns the current user's tenant, its members, and its pending
// invitations for the Team dashboard page.
//
// Membership is verified with the cookie-scoped client (RLS-safe) via
// getCurrentTenantId. The actual reads then use the admin client: the
// `users_select` RLS policy only allows `auth_id = auth.uid()`, so a
// cookie-scoped client can never see teammates' email/full_name — only the
// caller's own row. Bypassing RLS here is safe because we've already
// confirmed the caller belongs to `tenantId` above.
// ─────────────────────────────────────────────────────────────────────────

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

    const { data: memberRows, error: membersError } = await admin
      .from("tenant_members")
      .select("id, user_id, role, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const userIds = Array.from(new Set((memberRows ?? []).map((m) => m.user_id)));

    const { data: userRows, error: usersError } =
      userIds.length > 0
        ? await admin
            .from("users")
            .select("id, auth_id, email, full_name, avatar_url")
            .in("id", userIds)
        : { data: [], error: null };

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const userMap = new Map((userRows ?? []).map((u) => [u.id, u]));
    const selfUser = (userRows ?? []).find((u) => u.auth_id === user.id);

    const members = (memberRows ?? []).map((member) => {
      const profile = userMap.get(member.user_id);
      return {
        id: member.id,
        userId: member.user_id,
        role: member.role,
        joinedAt: member.created_at,
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        isSelf: profile?.auth_id === user.id,
      };
    });

    const currentUserRole = members.find((m) => m.isSelf)?.role ?? null;

    const { data: invitationRows, error: invitationsError } = await admin
      .from("invitations")
      .select("id, email, role, expires_at, accepted_at, created_at")
      .eq("tenant_id", tenantId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (invitationsError) {
      return NextResponse.json({ error: invitationsError.message }, { status: 500 });
    }

    const now = Date.now();
    const invitations = (invitationRows ?? []).map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.created_at,
      expiresAt: invite.expires_at,
      isExpired: new Date(invite.expires_at).getTime() < now,
    }));

    return NextResponse.json({
      tenantId,
      currentUserId: selfUser?.id ?? null,
      currentUserRole,
      members,
      invitations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
