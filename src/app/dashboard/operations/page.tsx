import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  UtensilsCrossed,
  Building2,
  CalendarCheck,
  Clock,
  Pill,
  ShieldCheck,
  Users,
  ChefHat,
  ClipboardList,
  Megaphone,
  Home,
  Eye,
  Wrench,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";

/**
 * Test Center's Live Test Call runs through this exact same pipeline as a
 * real customer call, so anything it books (appointments, reservations,
 * leads...) would otherwise show up here indistinguishable from real
 * business data. Filter it out by call_id rather than a per-table flag,
 * since calls.is_test is the single source of truth.
 */
async function getTestCallIds(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string
): Promise<Set<string>> {
  const { data } = await supabase.from("calls").select("id").eq("tenant_id", tenantId).eq("is_test", true);
  return new Set((data ?? []).map((c) => c.id));
}

function excludeTestCalls<T extends { call_id: string | null }>(rows: T[] | null, testCallIds: Set<string>): T[] {
  return (rows ?? []).filter((r) => !r.call_id || !testCallIds.has(r.call_id));
}

type BadgeVariant = "success" | "warning" | "destructive" | "outline";

const STATUS_SUCCESS = ["confirmed", "verified", "approved", "active", "ready", "delivered", "resolved", "completed"];
const STATUS_WARNING = ["pending", "waiting", "waitlisted", "in_progress", "scheduled", "preparing", "open", "new"];
const STATUS_DESTRUCTIVE = ["cancelled", "denied", "failed", "no_show"];

function statusBadge(status: string | null | undefined) {
  const s = (status ?? "unknown").toLowerCase();
  const variant: BadgeVariant = STATUS_SUCCESS.includes(s)
    ? "success"
    : STATUS_WARNING.includes(s)
      ? "warning"
      : STATUS_DESTRUCTIVE.includes(s)
        ? "destructive"
        : "outline";
  return <Badge variant={variant}>{status ?? "Unknown"}</Badge>;
}

function priorityBadge(priority: string | null | undefined) {
  const p = (priority ?? "").toLowerCase();
  const variant: BadgeVariant = p === "high" || p === "emergency" ? "destructive" : p === "medium" || p === "urgent" ? "warning" : "outline";
  return <Badge variant={variant}>{priority ?? "—"}</Badge>;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function CallLink({ callId, children }: { callId: string | null; children: React.ReactNode }) {
  if (!callId) return <>{children}</>;
  return (
    <Link href={`/dashboard/calls/${callId}`} className="hover:underline">
      {children}
    </Link>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}

const VERTICAL_TINT = {
  healthcare: { icon: "text-vertical-healthcare", border: "border-t-vertical-healthcare/40" },
  restaurant: { icon: "text-vertical-restaurant", border: "border-t-vertical-restaurant/40" },
  realestate: { icon: "text-vertical-realestate", border: "border-t-vertical-realestate/40" },
} as const;

// ─── Healthcare ──────────────────────────────────────────────────────

async function HealthcarePanel({ supabase, tenantId }: { supabase: Awaited<ReturnType<typeof createServerClient>>; tenantId: string }) {
  const t = VERTICAL_TINT.healthcare;
  const nowIso = new Date().toISOString();

  const [testCallIds, { data: appointmentRows }, { data: waitlistRows }, { data: refillRows }, { data: insuranceRows }] =
    await Promise.all([
      getTestCallIds(supabase, tenantId),
      supabase
        .from("appointments")
        .select("id, call_id, patient_name, scheduled_at, reason, status")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(20),
      supabase
        .from("waitlist_entries")
        .select("id, call_id, patient_name, status, priority, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "waiting")
        .order("priority", { ascending: false })
        .limit(20),
      supabase
        .from("refill_requests")
        .select("id, call_id, patient_name, medication_name, status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("insurance_intakes")
        .select("id, call_id, patient_name, insurance_provider, status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const appointments = excludeTestCalls(appointmentRows, testCallIds).slice(0, 10);
  const waitlist = excludeTestCalls(waitlistRows, testCallIds).slice(0, 10);
  const refills = excludeTestCalls(refillRows, testCallIds).slice(0, 10);
  const insurance = excludeTestCalls(insuranceRows, testCallIds).slice(0, 10);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className={`size-5 ${t.icon}`} />
            Appointments
          </CardTitle>
          <CardDescription>Upcoming scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {!appointments?.length ? (
            <EmptyRow label="No upcoming appointments yet — booked calls will show up here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Patient</th>
                    <th className="pb-2 font-medium">When</th>
                    <th className="pb-2 font-medium">Reason</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">
                        <CallLink callId={a.call_id}>{a.patient_name}</CallLink>
                      </td>
                      <td className="py-2 font-mono text-muted-foreground">{formatDateTime(a.scheduled_at)}</td>
                      <td className="py-2 text-muted-foreground">{a.reason || "—"}</td>
                      <td className="py-2">{statusBadge(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className={`size-5 ${t.icon}`} />
            Waitlist
          </CardTitle>
          <CardDescription>Patients waiting for openings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!waitlist?.length ? (
            <EmptyRow label="No one on the waitlist right now." />
          ) : (
            waitlist.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{w.patient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Added: <span className="font-mono">{formatDateTime(w.created_at)}</span>
                  </p>
                </div>
                {priorityBadge(w.priority != null ? String(w.priority) : null)}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className={`size-5 ${t.icon}`} />
            Refill Requests
          </CardTitle>
          <CardDescription>Prescription refill queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!refills?.length ? (
            <EmptyRow label="No refill requests yet." />
          ) : (
            refills.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    <CallLink callId={r.call_id}>{r.patient_name}</CallLink>
                  </p>
                  <p className="text-xs text-muted-foreground">{r.medication_name}</p>
                </div>
                {statusBadge(r.status)}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className={`size-5 ${t.icon}`} />
            Insurance Queue
          </CardTitle>
          <CardDescription>Verification requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!insurance?.length ? (
            <EmptyRow label="No insurance verifications pending." />
          ) : (
            insurance.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    <CallLink callId={q.call_id}>{q.patient_name}</CallLink>
                  </p>
                  <p className="text-xs text-muted-foreground">{q.insurance_provider}</p>
                </div>
                {statusBadge(q.status)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Restaurant ──────────────────────────────────────────────────────

async function RestaurantPanel({ supabase, tenantId }: { supabase: Awaited<ReturnType<typeof createServerClient>>; tenantId: string }) {
  const t = VERTICAL_TINT.restaurant;
  const nowIso = new Date().toISOString();

  const [testCallIds, { data: reservationRows }, { data: orderRows }, { data: menuItems }, { data: cateringLeadRows }] =
    await Promise.all([
      getTestCallIds(supabase, tenantId),
      supabase
        .from("reservations")
        .select("id, call_id, guest_name, party_size, scheduled_at, status, special_requests")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(20),
      supabase
        .from("orders")
        .select("id, call_id, order_number, order_type, status, total_cents, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("menu_items")
        .select("id, updated_at")
        .eq("tenant_id", tenantId),
      supabase
        .from("catering_leads")
        .select("id, call_id, contact_name, event_date, guest_count, status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const reservations = excludeTestCalls(reservationRows, testCallIds).slice(0, 10);
  const orders = excludeTestCalls(orderRows, testCallIds).slice(0, 10);
  const cateringLeads = excludeTestCalls(cateringLeadRows, testCallIds).slice(0, 10);

  const menuCount = menuItems?.length ?? 0;
  const lastMenuUpdate = menuItems?.length
    ? menuItems.reduce((latest, m) => (m.updated_at && m.updated_at > latest ? m.updated_at : latest), menuItems[0].updated_at ?? "")
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={`border-t-2 ${t.border} lg:col-span-2`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className={`size-5 ${t.icon}`} />
            Reservations
          </CardTitle>
          <CardDescription>Upcoming table reservations</CardDescription>
        </CardHeader>
        <CardContent>
          {!reservations?.length ? (
            <EmptyRow label="No upcoming reservations yet — booked calls will show up here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Party Size</th>
                    <th className="pb-2 font-medium">Date/Time</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">
                        <CallLink callId={r.call_id}>{r.guest_name}</CallLink>
                      </td>
                      <td className="py-2 font-mono text-muted-foreground">{r.party_size}</td>
                      <td className="py-2 font-mono text-muted-foreground">{formatDateTime(r.scheduled_at)}</td>
                      <td className="py-2">{statusBadge(r.status)}</td>
                      <td className="py-2 text-muted-foreground">
                        {r.special_requests || <span className="text-muted-foreground/50">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className={`size-5 ${t.icon}`} />
            Recent Orders
          </CardTitle>
          <CardDescription>Latest order activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!orders?.length ? (
            <EmptyRow label="No orders yet." />
          ) : (
            orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-mono font-medium">
                    <CallLink callId={o.call_id}>{o.order_number}</CallLink>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.order_type} &middot; {formatMoney(o.total_cents)}
                  </p>
                </div>
                {statusBadge(o.status)}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className={`border-t-2 ${t.border}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className={`size-5 ${t.icon}`} />
              Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-2xl font-bold">{menuCount}</p>
                <p className="text-xs text-muted-foreground">Menu items on file</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last updated</p>
                <p className="font-mono text-sm font-medium">{lastMenuUpdate ? formatDateTime(lastMenuUpdate) : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-t-2 ${t.border}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className={`size-5 ${t.icon}`} />
              Catering Leads
            </CardTitle>
            <CardDescription>Incoming catering inquiries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!cateringLeads?.length ? (
              <EmptyRow label="No catering inquiries yet." />
            ) : (
              cateringLeads.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">
                      <CallLink callId={c.call_id}>{c.contact_name}</CallLink>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.event_date ? formatDateTime(c.event_date) : "Date TBD"} &middot;{" "}
                      <span className="font-mono">{c.guest_count ?? "?"}</span> guests
                    </p>
                  </div>
                  {statusBadge(c.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Real Estate ─────────────────────────────────────────────────────

function fullAddress(listing: { address_line1: string; city: string; state: string } | null) {
  if (!listing) return "Unknown listing";
  return `${listing.address_line1}, ${listing.city}, ${listing.state}`;
}

async function RealEstatePanel({ supabase, tenantId }: { supabase: Awaited<ReturnType<typeof createServerClient>>; tenantId: string }) {
  const t = VERTICAL_TINT.realestate;
  const nowIso = new Date().toISOString();

  const [testCallIds, { data: leadRows }, { data: showingRows }, { data: listings }, { data: maintenanceRows }] =
    await Promise.all([
      getTestCallIds(supabase, tenantId),
      supabase
        .from("real_estate_leads")
        .select("id, call_id, first_name, last_name, lead_type, budget_min_cents, budget_max_cents, source, status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("showings")
        .select("id, call_id, scheduled_at, status, listing_id, agent_id")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(20),
      supabase
        .from("listings")
        .select("id, address_line1, city, state, price_cents, status")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(6),
      supabase
        .from("maintenance_requests")
        .select("id, call_id, category, priority, status, unit_id")
        .eq("tenant_id", tenantId)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Embedded foreign-table selects (showings->listings/re_agents,
  // maintenance_requests->property_management_units) don't type-check
  // cleanly against the generated Database types at this join depth, so
  // resolve the small number of referenced rows separately and join in JS.
  const leads = excludeTestCalls(leadRows, testCallIds).slice(0, 10);
  const showings = excludeTestCalls(showingRows, testCallIds).slice(0, 10);
  const maintenance = excludeTestCalls(maintenanceRows, testCallIds).slice(0, 10);

  const listingIds = [...new Set(showings.map((s) => s.listing_id).filter(Boolean))];
  const agentIds = [...new Set(showings.map((s) => s.agent_id).filter((id): id is string => !!id))];
  const unitIds = [...new Set(maintenance.map((m) => m.unit_id).filter(Boolean))];

  const [{ data: showingListings }, { data: showingAgents }, { data: units }] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("id, address_line1, city, state").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; address_line1: string; city: string; state: string }[] }),
    agentIds.length
      ? supabase.from("re_agents").select("id, first_name, last_name").in("id", agentIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
    unitIds.length
      ? supabase.from("property_management_units").select("id, address").in("id", unitIds)
      : Promise.resolve({ data: [] as { id: string; address: string }[] }),
  ]);

  const listingById = new Map((showingListings ?? []).map((l) => [l.id, l]));
  const agentById = new Map((showingAgents ?? []).map((a) => [a.id, a]));
  const unitById = new Map((units ?? []).map((u) => [u.id, u]));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={`border-t-2 ${t.border} lg:col-span-2`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className={`size-5 ${t.icon}`} />
            Leads
          </CardTitle>
          <CardDescription>Incoming buyer and seller leads</CardDescription>
        </CardHeader>
        <CardContent>
          {!leads?.length ? (
            <EmptyRow label="No leads yet — calls that capture buyer/seller info will show up here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Budget</th>
                    <th className="pb-2 font-medium">Source</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">
                        <CallLink callId={l.call_id}>
                          {l.first_name} {l.last_name}
                        </CallLink>
                      </td>
                      <td className="py-2 capitalize">{l.lead_type}</td>
                      <td className="py-2 font-mono text-muted-foreground">
                        {l.budget_max_cents ? formatMoney(l.budget_max_cents) : "—"}
                      </td>
                      <td className="py-2">{l.source || "—"}</td>
                      <td className="py-2">{statusBadge(l.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className={`size-5 ${t.icon}`} />
            Upcoming Showings
          </CardTitle>
          <CardDescription>Scheduled property viewings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showings.length ? (
            <EmptyRow label="No showings scheduled." />
          ) : (
            showings.map((s) => {
              const listing = listingById.get(s.listing_id) ?? null;
              const agent = s.agent_id ? (agentById.get(s.agent_id) ?? null) : null;
              return (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      <CallLink callId={s.call_id}>{fullAddress(listing)}</CallLink>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agent ? `${agent.first_name} ${agent.last_name[0]}.` : "Unassigned"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{formatDateTime(s.scheduled_at)}</span>
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className={`border-t-2 ${t.border}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className={`size-5 ${t.icon}`} />
              Active Listings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!listings?.length ? (
              <EmptyRow label="No active listings on file." />
            ) : (
              listings.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{fullAddress(l)}</p>
                    <p className="font-mono text-sm text-muted-foreground">{formatMoney(l.price_cents)}</p>
                  </div>
                  {statusBadge(l.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={`border-t-2 ${t.border}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className={`size-5 ${t.icon}`} />
              Maintenance Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!maintenance.length ? (
              <EmptyRow label="No open maintenance requests." />
            ) : (
              maintenance.map((m) => {
                const unit = unitById.get(m.unit_id) ?? null;
                return (
                  <div key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        <CallLink callId={m.call_id}>{unit?.address ?? "Unknown property"}</CallLink>
                      </p>
                      {priorityBadge(m.priority)}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{m.category}</p>
                      {statusBadge(m.status)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

function NoTenantState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No tenant configured for this account</CardTitle>
        <CardDescription>
          Your account isn&apos;t linked to any tenant yet, so there&apos;s nothing to show here.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

const INDUSTRY_META = {
  healthcare: { label: "Healthcare", icon: Heart, tint: VERTICAL_TINT.healthcare.icon },
  restaurant: { label: "Restaurant", icon: UtensilsCrossed, tint: VERTICAL_TINT.restaurant.icon },
  real_estate: { label: "Real Estate", icon: Building2, tint: VERTICAL_TINT.realestate.icon },
} as const;

export default async function OperationsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <NoTenantState />;

  const tenantId = await getCurrentTenantId(user.id);
  if (!tenantId) return <NoTenantState />;

  const { data: tenant } = await supabase.from("tenants").select("industry").eq("id", tenantId).single();
  const industry = (tenant?.industry ?? "healthcare") as keyof typeof INDUSTRY_META;
  const meta = INDUSTRY_META[industry] ?? INDUSTRY_META.healthcare;
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Icon className={`size-7 ${meta.tint}`} />
          {meta.label} Operations
        </h1>
        <p className="text-muted-foreground">
          Real bookings, queries, and outcomes captured by your AI agent — every row links back to the call it came from.
        </p>
      </div>

      {industry === "healthcare" && <HealthcarePanel supabase={supabase} tenantId={tenantId} />}
      {industry === "restaurant" && <RestaurantPanel supabase={supabase} tenantId={tenantId} />}
      {industry === "real_estate" && <RealEstatePanel supabase={supabase} tenantId={tenantId} />}
    </div>
  );
}
