"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Upload,
  Trash2,
  PhoneOutgoing,
  Loader2,
  BookUser,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhoneNumber, formatDateTime, humanize } from "@/lib/calls/display";

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  tags: string[] | null;
  source: string;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  call_count: number;
  do_not_call: boolean;
  created_at: string;
}

const TH =
  "px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

/** Where the number came from, in words rather than a raw enum value. */
function SourceBadge({ source }: { source: string }) {
  const variant: "secondary" | "outline" =
    source === "inbound_call" || source === "outbound_call" ? "secondary" : "outline";
  const label =
    source === "inbound_call"
      ? "Called us"
      : source === "outbound_call"
        ? "We called"
        : humanize(source);
  return <Badge variant={variant}>{label}</Badge>;
}

const EMPTY_FORM = { name: "", phone: "", email: "", company: "", notes: "" };

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pure fetch helper — no setState, so both the mount effect and the event
  // handlers below can reuse it without tripping the effect-purity rule.
  async function fetchContacts(query: string): Promise<Contact[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    const res = await fetch(`/api/v1/contacts?${params.toString()}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Failed to load contacts.");
    return body.data ?? [];
  }

  async function reload(query = search) {
    try {
      setContacts(await fetchContacts(query));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load contacts.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    // Debounced so typing in the search box doesn't fire a request per
    // keystroke; the same effect covers the initial load (empty query).
    const timer = setTimeout(
      async () => {
        try {
          const data = await fetchContacts(search);
          if (!cancelled) setContacts(data);
        } catch (err) {
          if (!cancelled) {
            toast.error(err instanceof Error ? err.message : "Failed to load contacts.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      search ? 250 : 0
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  async function handleAdd() {
    if (!form.phone.trim()) {
      toast.error("A phone number is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || null,
          phone: form.phone,
          email: form.email || null,
          company: form.company || null,
          notes: form.notes || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't add that contact.");
        return;
      }
      toast.success("Contact added.");
      setForm(EMPTY_FORM);
      setAddOpen(false);
      await reload();
    } catch {
      toast.error("Couldn't add that contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const csv = await file.text();
      const res = await fetch("/api/v1/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't import that file.");
        return;
      }
      const { imported, skipped, duplicates } = body.data;
      const parts = [`${imported} added`];
      if (duplicates) parts.push(`${duplicates} already on file`);
      if (skipped) parts.push(`${skipped} skipped (no usable phone number)`);
      toast.success(parts.join(", ") + ".");
      await reload();
    } catch {
      toast.error("Couldn't read that file.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(contact: Contact) {
    const who = contact.name || formatPhoneNumber(contact.phone);
    if (!confirm(`Remove ${who} from your contacts? This can't be undone.`)) return;

    // Optimistic: the row disappears immediately and is restored on failure,
    // so a delete never feels like it did nothing.
    const previous = contacts;
    setContacts((rows) => rows.filter((r) => r.id !== contact.id));
    try {
      const res = await fetch(`/api/v1/contacts/${contact.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setContacts(previous);
        toast.error(body.error ?? "Couldn't remove that contact.");
        return;
      }
      toast.success("Contact removed.");
    } catch {
      setContacts(previous);
      toast.error("Couldn't remove that contact.");
    }
  }

  async function handleDoNotCall(contact: Contact, value: boolean) {
    const previous = contacts;
    setContacts((rows) => rows.map((r) => (r.id === contact.id ? { ...r, do_not_call: value } : r)));
    try {
      const res = await fetch(`/api/v1/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ do_not_call: value }),
      });
      if (!res.ok) {
        const body = await res.json();
        setContacts(previous);
        toast.error(body.error ?? "Couldn't update that contact.");
        return;
      }
      toast.success(value ? "Marked do not call." : "Do-not-call removed.");
    } catch {
      setContacts(previous);
      toast.error("Couldn't update that contact.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search name, number, or email..."
            className="w-72 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search contacts"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="Choose a CSV file to import"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="mr-2 size-4" aria-hidden="true" />
            )}
            {importing ? "Importing..." : "Import CSV"}
          </Button>

          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 size-4" aria-hidden="true" />
            Add contact
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className={TH}>Name</th>
                  <th className={TH}>Phone</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Source</th>
                  <th className={TH}>Calls</th>
                  <th className={TH}>Last contacted</th>
                  <th className={TH}>Do not call</th>
                  <th className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 size-5 animate-spin" aria-hidden="true" />
                      Loading contacts...
                    </td>
                  </tr>
                )}

                {!loading && contacts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <BookUser
                        className="mx-auto mb-3 size-8 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <p className="font-medium">
                        {search ? "No contacts match that search." : "No contacts yet."}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {search
                          ? "Try a different name, number, or email."
                          : "Numbers are added automatically as calls come in — or add one by hand, or import a CSV."}
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  contacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        {contact.name || <span className="text-muted-foreground">Unnamed</span>}
                        {contact.company && (
                          <div className="text-xs text-muted-foreground">{contact.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {formatPhoneNumber(contact.phone)}
                      </td>
                      <td className="px-4 py-3">
                        {contact.email || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <SourceBadge source={contact.source} />
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">{contact.call_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(contact.last_contacted_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={contact.do_not_call}
                          onCheckedChange={(checked: boolean) => handleDoNotCall(contact, checked)}
                          aria-label={`Do not call ${contact.name || contact.phone}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Hands the number to the outbound page so it can be
                              dialed by an agent without retyping it. */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={contact.do_not_call}
                            render={
                              <Link
                                href={`/dashboard/outbound?to=${encodeURIComponent(contact.phone)}`}
                              />
                            }
                          >
                            <PhoneOutgoing className="mr-1.5 size-4" aria-hidden="true" />
                            Call with agent
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(contact)}
                            aria-label={`Remove ${contact.name || contact.phone}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!loading && contacts.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"}
        </p>
      )}

      {/* Add contact */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Only a phone number is required — everything else can be filled in later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone number</Label>
              <Input
                id="contact-phone"
                placeholder="+1 555 000 1234"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Company</Label>
              <Input
                id="contact-company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Add contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
