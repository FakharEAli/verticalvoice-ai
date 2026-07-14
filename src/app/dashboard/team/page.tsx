"use client";

import { useState } from "react";
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
import { UserPlus, RotateCw, X } from "lucide-react";

const members = [
  {
    name: "Sarah Chen",
    email: "sarah@acme.com",
    role: "Owner" as const,
    joined: "Jan 15, 2025",
    active: true,
    initials: "SC",
  },
  {
    name: "Mike Johnson",
    email: "mike@acme.com",
    role: "Admin" as const,
    joined: "Feb 3, 2025",
    active: true,
    initials: "MJ",
  },
  {
    name: "Emily Davis",
    email: "emily@acme.com",
    role: "Member" as const,
    joined: "Mar 10, 2025",
    active: true,
    initials: "ED",
  },
  {
    name: "Alex Kim",
    email: "alex@acme.com",
    role: "Member" as const,
    joined: "Apr 1, 2025",
    active: false,
    initials: "AK",
  },
];

const roleBadgeVariant = {
  Owner: "default" as const,
  Admin: "secondary" as const,
  Member: "outline" as const,
};

export default function TeamPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage team members and permissions.
          </p>
        </div>
        <Button>
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
          <div className="space-y-0 divide-y">
            {members.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
                    {member.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <Badge variant={roleBadgeVariant[member.role]}>
                    {member.role}
                  </Badge>

                  <span className="hidden text-sm text-muted-foreground md:inline">
                    Joined {member.joined}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block size-2 rounded-full ${
                        member.active ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {member.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={member.role === "Owner"}
                    >
                      Change Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={member.role === "Owner"}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
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
            <Button>Send Invite</Button>
          </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
                JD
              </div>
              <div>
                <p className="text-sm font-medium">john@acme.com</p>
                <p className="text-sm text-muted-foreground">
                  Sent 2 days ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">Member</Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <RotateCw className="mr-1 size-3" />
                  Resend
                </Button>
                <Button variant="outline" size="sm">
                  <X className="mr-1 size-3" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
