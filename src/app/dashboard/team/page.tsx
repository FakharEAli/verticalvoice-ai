"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/database/supabase-client";

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isSelf: boolean;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
};

function initialsFor(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && name) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [sending, setSending] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Pure fetch helper — no setState calls, so it's safe to call from both
  // the mount effect and the post-invite refresh in the event handler below.
  async function fetchTeamData() {
    const res = await fetch("/api/v1/team/current");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load team data.");
    }
    return data;
  }

  // Reusable refresh used after sending an invite (called from an event
  // handler, not an effect, so setState here is not restricted).
  async function loadTeam() {
    try {
      const data = await fetchTeamData();
      setLoadError(null);
      setTenantId(data.tenantId ?? null);
      setCurrentUserRole(data.currentUserRole ?? null);
      setMembers(data.members ?? []);
      setInvitations(data.invitations ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load team data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch defined and invoked entirely within this effect (rather than
    // calling the outer `loadTeam`) so the initial load doesn't trip
    // react-hooks/set-state-in-effect.
    async function loadInitialTeam() {
      try {
        const data = await fetchTeamData();
        setLoadError(null);
        setTenantId(data.tenantId ?? null);
        setCurrentUserRole(data.currentUserRole ?? null);
        setMembers(data.members ?? []);
        setInvitations(data.invitations ?? []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load team data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    loadInitialTeam();
  }, []);

  const canInvite = currentUserRole === "admin" || currentUserRole === "owner";

  async function handleSendInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Enter an email address to invite.");
      return;
    }
    if (!tenantId) {
      toast.error("No tenant available to invite into.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/v1/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          email,
          role: inviteRole.toLowerCase(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to send invitation.");
        return;
      }

      toast.success(`Invitation sent to ${email}.`);
      setInviteEmail("");
      await loadTeam();
    } catch {
      toast.error("Failed to send invitation. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setCancelingId(inviteId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("invitations").delete().eq("id", inviteId);
      if (error) {
        toast.error(`Failed to cancel invitation: ${error.message}`);
        return;
      }
      setInvitations((prev) => prev.filter((invite) => invite.id !== inviteId));
      toast.success("Invitation canceled.");
    } catch {
      toast.error("Failed to cancel invitation. Please try again.");
    } finally {
      setCancelingId(null);
    }
  }

  function focusInviteForm() {
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    emailInputRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage team members and permissions.
          </p>
        </div>
        <Button onClick={focusInviteForm}>
          <UserPlus className="mr-2 size-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People who have access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading team members…</p>
          ) : loadError ? (
            <p className="py-4 text-sm text-destructive">{loadError}</p>
          ) : members.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No team members found.</p>
          ) : (
            <div className="space-y-0 divide-y">
              {members.map((member) => {
                const displayName = member.fullName || member.email || "Unknown";
                const role = member.role.toLowerCase();
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
                        {initialsFor(member.fullName, member.email)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {displayName}
                          {member.isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.email ?? "No email on file"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <Badge variant={roleBadgeVariant[role] ?? "outline"}>
                        {capitalize(role)}
                      </Badge>

                      <span className="hidden text-sm text-muted-foreground md:inline">
                        Joined {formatDate(member.joinedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Invite New Member</CardTitle>
          <CardDescription>
            Send an invitation to join your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                ref={emailInputRef}
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) {
                    handleSendInvite();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v ?? "Member")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSendInvite} disabled={sending || !tenantId}>
              {sending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send Invite
            </Button>
          </div>
          {!loading && !canInvite && (
            <p className="text-xs text-muted-foreground">
              Only admins and owners can invite new members. You can still try —
              you&apos;ll see an error if you don&apos;t have permission.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invites</CardTitle>
          <CardDescription>
            Invitations that haven&apos;t been accepted yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading invitations…</p>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <div className="space-y-0 divide-y">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
                      {initialsFor(null, invite.email)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Sent {formatRelative(invite.createdAt)}
                        {invite.isExpired && " · Expired"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{capitalize(invite.role)}</Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelInvite(invite.id)}
                        disabled={cancelingId === invite.id}
                      >
                        {cancelingId === invite.id ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <X className="mr-1 size-3" />
                        )}
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
