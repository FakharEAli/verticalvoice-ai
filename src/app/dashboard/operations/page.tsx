import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BadgeDollarSign,
} from "lucide-react";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import {
  formatDateTime,
  formatMoneyFromCents,
  formatPhoneNumber,
  humanize,
} from "@/lib/calls/display";
import {
  OperationsItem,
  type DetailField,
  type DetailLineItem,
} from "./operations-item";

/**
 * Test Center's Live Test Call runs through this exact same pipeline as a
 * real customer call, so anything it books (appointments, reservations,
 * leads...) lands in these same tables. We show it here alongside real data
 * — tagged with a Test badge inside its detail sheet rather than hidden —
 * resolved by call_id since calls.is_test is the single source of truth.
 */
async function getTestCallIds(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string
): Promise<Set<string>> {
  const { data } = await supabase.from("calls").select("id").eq("tenant_id", tenantId).eq("is_test", true);
  return new Set((data ?? []).map((c) => c.id));
}

type BadgeVariant = "success" | "warning" | "destructive" | "outline";

const STATUS_SUCCESS = ["confirmed", "verified", "approved", "active", "ready", "delivered", "resolved", "completed"];
const STATUS_WARNING = ["pending", "waiting", "waitlisted", "in_progress", "scheduled", "preparing", "open", "new", "requested"];
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
  const label = humanize(status);
  return <Badge variant={variant}>{label === "—" ? "Unknown" : label}</Badge>;
}

function priorityBadge(priority: string | null | undefined) {
  const p = (priority ?? "").toLowerCase();
  const variant: BadgeVariant = p === "high" || p === "emergency" ? "destructive" : p === "medium" || p === "urgent" ? "warning" : "outline";
  return <Badge variant={variant}>{humanize(priority)}</Badge>;
}

/** waitlist_entries.priority is a raw number; nobody reads "3" as urgency. */
function waitlistPriorityLabel(priority: number | null | undefined): string {
  if (priority == null) return "Normal";
  if (priority >= 3) return "High";
  if (priority === 2) return "Medium";
  return "Normal";
}

/**
 * Builds the detail list for a sheet, dropping anything the record doesn't
 * actually have — a wall of em-dashes tells the user nothing.
 */
function fields(entries: (readonly [string, string | null | undefined])[]): DetailField[] {
  return entries
    .filter((e): e is readonly [string, string] => {
      const v = e[1];
      if (typeof v !== "string" || v.trim() === "") return false;
      // Placeholder values the pipeline uses when a field wasn't captured —
      // showing "Customer: unknown" is worse than showing nothing.
      const placeholder = ["—", "unknown", "n/a", "na", "null", "undefined"];
      return !placeholder.includes(v.trim().toLowerCase());
    })
    .map(([label, value]) => ({ label, value }));
}

function EmptyRow({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}

const VERTICAL_TINT = {
  healthcare: {
    icon: "text-vertical-healthcare",
    border: "border-t-vertical-healthcare/40",
    // `!` forces these to win over the base TabsTrigger's unconditional
    // `text-foreground/60`, which otherwise ties on cascade order with the
    // plain (non-`!`) `data-active:` variant and can render as muted ink
    // instead of the vertical jewel on the active tab.
    tab: "data-active:!text-vertical-healthcare data-active:after:!bg-vertical-healthcare",
  },
  restaurant: {
    icon: "text-vertical-restaurant",
    border: "border-t-vertical-restaurant/40",
    tab: "data-active:!text-vertical-restaurant data-active:after:!bg-vertical-restaurant",
  },
  realestate: {
    icon: "text-vertical-realestate",
    border: "border-t-vertical-realestate/40",
    tab: "data-active:!text-vertical-realestate data-active:after:!bg-vertical-realestate",
  },
} as const;

// ─── Healthcare ──────────────────────────────────────────────────────

async function HealthcarePanel({ supabase, tenantId }: { supabase: Awaited<ReturnType<typeof createServerClient>>; tenantId: string }) {
  const t = VERTICAL_TINT.healthcare;
  // "Upcoming" window starts 12h in the past so a booking made for a time
  // that has just passed today still shows here (and covers timezone skew).
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - 12);
  const sinceIso = windowStart.toISOString();

  const [testCallIds, { data: appointmentRows }, { data: waitlistRows }, { data: refillRows }, { data: insuranceRows }] =
    await Promise.all([
      getTestCallIds(supabase, tenantId),
      supabase
        .from("appointments")
        .select("id, call_id, patient_name, patient_phone, scheduled_at, duration_minutes, reason, notes, status, created_at")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("scheduled_at", sinceIso)
        .order("scheduled_at", { ascending: true })
        .limit(20),
      supabase
        .from("waitlist_entries")
        .select("id, call_id, patient_name, patient_phone, status, priority, notes, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "waiting")
        .order("priority", { ascending: false })
        .limit(20),
      supabase
        .from("refill_requests")
        .select("id, call_id, patient_name, patient_phone, medication_name, medication_dosage, pharmacy_name, pharmacy_phone, status, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("insurance_intakes")
        .select("id, call_id, patient_name, patient_phone, insurance_provider, policy_number, group_number, subscriber_name, status, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const appointments = (appointmentRows ?? []).slice(0, 10);
  const waitlist = (waitlistRows ?? []).slice(0, 10);
  const refills = (refillRows ?? []).slice(0, 10);
  const insurance = (insuranceRows ?? []).slice(0, 10);

  return (
    <Tabs defaultValue="appointments">
      <TabsList variant="line">
        <TabsTrigger value="appointments" className={t.tab}>
          <CalendarCheck className="mr-1.5 size-4" />
          Appointments
        </TabsTrigger>
        <TabsTrigger value="waitlist" className={t.tab}>
          <Clock className="mr-1.5 size-4" />
          Waitlist
        </TabsTrigger>
        <TabsTrigger value="refills" className={t.tab}>
          <Pill className="mr-1.5 size-4" />
          Refill Requests
        </TabsTrigger>
        <TabsTrigger value="insurance" className={t.tab}>
          <ShieldCheck className="mr-1.5 size-4" />
          Insurance Queue
        </TabsTrigger>
      </TabsList>

      <TabsContent value="appointments" className="mt-4">
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
            <EmptyRow label="No upcoming appointments yet. Booked calls will show up here." />
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
                        <OperationsItem
                          callId={a.call_id}
                          isTest={!!a.call_id && testCallIds.has(a.call_id)}
                          triggerContent={a.patient_name}
                          title={a.patient_name}
                          subtitle={`Appointment · ${formatDateTime(a.scheduled_at)}`}
                          fields={fields([
                            ["Patient", a.patient_name],
                            ["Scheduled for", formatDateTime(a.scheduled_at)],
                            ["Duration", a.duration_minutes ? `${a.duration_minutes} minutes` : null],
                            ["Reason for visit", a.reason],
                            ["Status", humanize(a.status)],
                            ["Phone", formatPhoneNumber(a.patient_phone)],
                            ["Notes", a.notes],
                            ["Booked", formatDateTime(a.created_at)],
                          ])}
                        />
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
      </TabsContent>

      <TabsContent value="waitlist" className="mt-4">
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
                <OperationsItem
                  callId={w.call_id}
                  isTest={!!w.call_id && testCallIds.has(w.call_id)}
                  triggerContent={
                    <>
                      <span className="font-medium">{w.patient_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        Added {formatDateTime(w.created_at)}
                      </span>
                    </>
                  }
                  title={w.patient_name}
                  subtitle={`Waitlist · Added ${formatDateTime(w.created_at)}`}
                  fields={fields([
                    ["Patient", w.patient_name],
                    ["Phone", formatPhoneNumber(w.patient_phone)],
                    ["Priority", waitlistPriorityLabel(w.priority)],
                    ["Status", humanize(w.status)],
                    ["Notes", w.notes],
                    ["Added", formatDateTime(w.created_at)],
                  ])}
                />
                {priorityBadge(waitlistPriorityLabel(w.priority))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="refills" className="mt-4">
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
                <OperationsItem
                  callId={r.call_id}
                  isTest={!!r.call_id && testCallIds.has(r.call_id)}
                  triggerContent={
                    <>
                      <span className="font-medium">{r.patient_name}</span>
                      <span className="block text-xs text-muted-foreground">{r.medication_name}</span>
                    </>
                  }
                  title={r.patient_name}
                  subtitle={`Refill request · ${r.medication_name}`}
                  fields={fields([
                    ["Patient", r.patient_name],
                    ["Phone", formatPhoneNumber(r.patient_phone)],
                    [
                      "Medication",
                      r.medication_dosage ? `${r.medication_name} (${r.medication_dosage})` : r.medication_name,
                    ],
                    ["Pharmacy", r.pharmacy_name],
                    ["Pharmacy phone", r.pharmacy_phone ? formatPhoneNumber(r.pharmacy_phone) : null],
                    ["Status", humanize(r.status)],
                    ["Requested", formatDateTime(r.created_at)],
                  ])}
                />
                {statusBadge(r.status)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="insurance" className="mt-4">
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
                <OperationsItem
                  callId={q.call_id}
                  isTest={!!q.call_id && testCallIds.has(q.call_id)}
                  triggerContent={
                    <>
                      <span className="font-medium">{q.patient_name}</span>
                      <span className="block text-xs text-muted-foreground">{q.insurance_provider}</span>
                    </>
                  }
                  title={q.patient_name}
                  subtitle={`Insurance verification · ${q.insurance_provider}`}
                  fields={fields([
                    ["Patient", q.patient_name],
                    ["Phone", formatPhoneNumber(q.patient_phone)],
                    ["Insurance provider", q.insurance_provider],
                    ["Policy number", q.policy_number],
                    ["Group number", q.group_number],
                    ["Subscriber", q.subscriber_name],
                    ["Status", humanize(q.status)],
                    ["Submitted", formatDateTime(q.created_at)],
                  ])}
                />
                {statusBadge(q.status)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
  );
}

// ─── Restaurant ──────────────────────────────────────────────────────

async function RestaurantPanel({ supabase, tenantId }: { supabase: Awaited<ReturnType<typeof createServerClient>>; tenantId: string }) {
  const t = VERTICAL_TINT.restaurant;
  // "Upcoming" window starts 12h in the past so a booking made for a time
  // that has just passed today still shows here (and covers timezone skew).
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - 12);
  const sinceIso = windowStart.toISOString();

  const [testCallIds, { data: reservationRows }, { data: orderRows }, { data: menuItems }, { data: cateringLeadRows }] =
    await Promise.all([
      getTestCallIds(supabase, tenantId),
      supabase
        .from("reservations")
        .select("id, call_id, guest_name, guest_phone, guest_email, party_size, scheduled_at, status, special_requests, created_at")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("scheduled_at", sinceIso)
        .order("scheduled_at", { ascending: true })
        .limit(20),
      supabase
        .from("orders")
        .select(
          "id, call_id, order_number, order_type, status, customer_name, customer_phone, subtotal_cents, tax_cents, tip_cents, total_cents, special_instructions, estimated_ready_at, created_at"
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("menu_items")
        .select("id, updated_at")
        .eq("tenant_id", tenantId),
      supabase
        .from("catering_leads")
        .select(
          "id, call_id, contact_name, contact_phone, contact_email, event_date, event_type, guest_count, budget_cents, dietary_requirements, venue_address, notes, status, created_at"
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const reservations = (reservationRows ?? []).slice(0, 10);
  const orders = (orderRows ?? []).slice(0, 10);
  const cateringLeads = (cateringLeadRows ?? []).slice(0, 10);

  // The whole point of Recent Orders is *what was ordered*, so pull each
  // order's own line items and show them in the drawer.
  const orderIds = orders.map((o) => o.id);
  const { data: orderItemRows } = orderIds.length
    ? await supabase
        .from("order_items")
        .select("id, order_id, name, quantity, unit_price_cents, special_instructions")
        .in("order_id", orderIds)
    : {
        data: [] as {
          id: string;
          order_id: string;
          name: string;
          quantity: number;
          unit_price_cents: number;
          special_instructions: string | null;
        }[],
      };

  const itemsByOrder = new Map<string, DetailLineItem[]>();
  for (const item of orderItemRows ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({
      name: item.name,
      quantity: item.quantity,
      price: formatMoneyFromCents(item.unit_price_cents * item.quantity),
      note: item.special_instructions ?? undefined,
    });
    itemsByOrder.set(item.order_id, list);
  }

  const menuCount = menuItems?.length ?? 0;
  const lastMenuUpdate = menuItems?.length
    ? menuItems.reduce((latest, m) => (m.updated_at && m.updated_at > latest ? m.updated_at : latest), menuItems[0].updated_at ?? "")
    : null;

  return (
    <div className="space-y-4">
      {/* At-a-glance strip: the menu is a glanceable stat, not a workflow
          queue, so it stays visible regardless of which tab is active
          rather than being buried behind a "Menu" tab. */}
      <Card className={`border-t-2 ${t.border}`}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className={`size-5 ${t.icon}`} />
            <div>
              <p className="font-mono text-2xl font-bold leading-tight">{menuCount}</p>
              <p className="text-xs text-muted-foreground">Menu items on file</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Last updated</p>
            <p className="font-mono text-sm font-medium">{lastMenuUpdate ? formatDateTime(lastMenuUpdate) : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="reservations">
        <TabsList variant="line">
          <TabsTrigger value="reservations" className={t.tab}>
            <Users className="mr-1.5 size-4" />
            Reservations
          </TabsTrigger>
          <TabsTrigger value="orders" className={t.tab}>
            <ChefHat className="mr-1.5 size-4" />
            Recent Orders
          </TabsTrigger>
          <TabsTrigger value="catering" className={t.tab}>
            <Megaphone className="mr-1.5 size-4" />
            Catering Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="mt-4">
      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className={`size-5 ${t.icon}`} />
            Reservations
          </CardTitle>
          <CardDescription>Upcoming table reservations</CardDescription>
        </CardHeader>
        <CardContent>
          {!reservations?.length ? (
            <EmptyRow label="No upcoming reservations yet. Booked calls will show up here." />
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
                        <OperationsItem
                          callId={r.call_id}
                          isTest={!!r.call_id && testCallIds.has(r.call_id)}
                          triggerContent={r.guest_name}
                          title={`${r.guest_name} (party of ${r.party_size})`}
                          subtitle={`Reservation · ${formatDateTime(r.scheduled_at)}`}
                          fields={fields([
                            ["Guest", r.guest_name],
                            ["Party size", `${r.party_size} ${r.party_size === 1 ? "guest" : "guests"}`],
                            ["Booked for", formatDateTime(r.scheduled_at)],
                            ["Phone", formatPhoneNumber(r.guest_phone)],
                            ["Email", r.guest_email],
                            ["Status", humanize(r.status)],
                            ["Special requests", r.special_requests],
                            ["Created", formatDateTime(r.created_at)],
                          ])}
                        />
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
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
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
            orders.map((o) => {
              const lineItems = itemsByOrder.get(o.id) ?? [];
              const itemCount = lineItems.reduce((sum, i) => sum + i.quantity, 0);
              return (
                <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                  <OperationsItem
                    callId={o.call_id}
                    isTest={!!o.call_id && testCallIds.has(o.call_id)}
                    lineItems={lineItems}
                    triggerContent={
                      <>
                        <span className="font-mono font-medium">Order {o.order_number}</span>
                        <span className="block text-xs text-muted-foreground">
                          {humanize(o.order_type)}
                          {itemCount > 0 ? ` · ${itemCount} ${itemCount === 1 ? "item" : "items"}` : ""} ·{" "}
                          {formatMoneyFromCents(o.total_cents)}
                        </span>
                      </>
                    }
                    title={`Order ${o.order_number}`}
                    subtitle={`${humanize(o.order_type)} · Placed ${formatDateTime(o.created_at)}`}
                    fields={fields([
                      ["Order number", o.order_number],
                      ["Type", humanize(o.order_type)],
                      ["Status", humanize(o.status)],
                      ["Customer", o.customer_name],
                      ["Phone", formatPhoneNumber(o.customer_phone)],
                      ["Subtotal", formatMoneyFromCents(o.subtotal_cents)],
                      ["Tax", formatMoneyFromCents(o.tax_cents)],
                      ["Tip", o.tip_cents ? formatMoneyFromCents(o.tip_cents) : null],
                      ["Total", formatMoneyFromCents(o.total_cents)],
                      ["Special instructions", o.special_instructions],
                      ["Ready by", o.estimated_ready_at ? formatDateTime(o.estimated_ready_at) : null],
                      ["Placed", formatDateTime(o.created_at)],
                    ])}
                  />
                  {statusBadge(o.status)}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="catering" className="mt-4">
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
                  <OperationsItem
                    callId={c.call_id}
                    isTest={!!c.call_id && testCallIds.has(c.call_id)}
                    triggerContent={
                      <>
                        <span className="font-medium">{c.contact_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.event_date ? formatDateTime(c.event_date) : "Date to be confirmed"} ·{" "}
                          {c.guest_count ?? "?"} guests
                        </span>
                      </>
                    }
                    title={c.contact_name}
                    subtitle={`Catering inquiry · ${c.event_date ? formatDateTime(c.event_date) : "date to be confirmed"}`}
                    fields={fields([
                      ["Contact", c.contact_name],
                      ["Phone", formatPhoneNumber(c.contact_phone)],
                      ["Email", c.contact_email],
                      ["Event date", c.event_date ? formatDateTime(c.event_date) : null],
                      ["Event type", c.event_type ? humanize(c.event_type) : null],
                      ["Guests", c.guest_count != null ? `${c.guest_count}` : null],
                      ["Budget", c.budget_cents != null ? formatMoneyFromCents(c.budget_cents) : null],
                      ["Venue", c.venue_address],
                      ["Dietary requirements", c.dietary_requirements],
                      ["Status", humanize(c.status)],
                      ["Notes", c.notes],
                      ["Received", formatDateTime(c.created_at)],
                    ])}
                  />
                  {statusBadge(c.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Real Estate ─────────────────────────────────────────────────────

function fullAddress(listing: { address_line1: string; city: string; state: string } | null) {
  if (!listing) return "Unknown listing";
  return `${listing.address_line1}, ${listing.city}, ${listing.state}`;
}

/** "$400,000.00 to $650,000.00", or whichever half of the range we have. */
function budgetRange(minCents: number | null, maxCents: number | null): string | null {
  if (minCents == null && maxCents == null) return null;
  if (minCents != null && maxCents != null) {
    return `${formatMoneyFromCents(minCents)} to ${formatMoneyFromCents(maxCents)}`;
  }
  if (maxCents != null) return `Up to ${formatMoneyFromCents(maxCents)}`;
  return `From ${formatMoneyFromCents(minCents)}`;
}

async function RealEstatePanel({ supabase, tenantId }: { supabase: Awaited<ReturnType<typeof createServerClient>>; tenantId: string }) {
  const t = VERTICAL_TINT.realestate;
  // "Upcoming" window starts 12h in the past so a booking made for a time
  // that has just passed today still shows here (and covers timezone skew).
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - 12);
  const sinceIso = windowStart.toISOString();

  const [
    testCallIds,
    { data: leadRows },
    { data: showingRows },
    { data: listings },
    { data: maintenanceRows },
    { data: valuationRows },
  ] =
    await Promise.all([
      getTestCallIds(supabase, tenantId),
      supabase
        .from("real_estate_leads")
        .select(
          "id, call_id, first_name, last_name, email, phone, lead_type, budget_min_cents, budget_max_cents, timeline, notes, source, status, created_at"
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("showings")
        .select("id, call_id, scheduled_at, duration_minutes, status, feedback, interest_level, listing_id, agent_id, created_at")
        .eq("tenant_id", tenantId)
        // A cancelled showing is not upcoming. The parallel healthcare
        // appointments query has always filtered these out; this one didn't,
        // so cancelled viewings kept sitting in "Upcoming Showings".
        .neq("status", "cancelled")
        .gte("scheduled_at", sinceIso)
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
        .select("id, call_id, category, priority, status, unit_id, reporter_name, reporter_phone, description, notes, created_at")
        .eq("tenant_id", tenantId)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20),
      // Valuation/CMA requests the agent takes on calls. Until now nothing in
      // this dashboard read this table, so every seller lead the agent
      // captured was invisible to staff and the business simply never learned
      // about it. Ordered by capture time, not scheduled_at — a fresh request
      // has no agreed time yet.
      supabase
        .from("valuation_appointments")
        .select(
          "id, call_id, owner_name, owner_phone, owner_email, property_address, property_type, scheduled_at, status, estimated_value_cents, notes, created_at"
        )
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Embedded foreign-table selects (showings->listings/re_agents,
  // maintenance_requests->property_management_units) don't type-check
  // cleanly against the generated Database types at this join depth, so
  // resolve the small number of referenced rows separately and join in JS.
  const leads = (leadRows ?? []).slice(0, 10);
  const showings = (showingRows ?? []).slice(0, 10);
  const maintenance = (maintenanceRows ?? []).slice(0, 10);
  const valuations = (valuationRows ?? []).slice(0, 10);

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
    <Tabs defaultValue="leads">
      <TabsList variant="line">
        <TabsTrigger value="leads" className={t.tab}>
          <Users className="mr-1.5 size-4" />
          Leads
        </TabsTrigger>
        <TabsTrigger value="showings" className={t.tab}>
          <Eye className="mr-1.5 size-4" />
          Upcoming Showings
        </TabsTrigger>
        <TabsTrigger value="valuations" className={t.tab}>
          <BadgeDollarSign className="mr-1.5 size-4" />
          Valuation Requests
        </TabsTrigger>
        <TabsTrigger value="listings" className={t.tab}>
          <Home className="mr-1.5 size-4" />
          Active Listings
        </TabsTrigger>
        <TabsTrigger value="maintenance" className={t.tab}>
          <Wrench className="mr-1.5 size-4" />
          Maintenance Requests
        </TabsTrigger>
      </TabsList>

      <TabsContent value="leads" className="mt-4">
      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className={`size-5 ${t.icon}`} />
            Leads
          </CardTitle>
          <CardDescription>Incoming buyer and seller leads</CardDescription>
        </CardHeader>
        <CardContent>
          {!leads?.length ? (
            <EmptyRow label="No leads yet. Calls that capture buyer/seller info will show up here." />
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
                  {leads.map((l) => {
                    const name = `${l.first_name} ${l.last_name}`;
                    return (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">
                          <OperationsItem
                            callId={l.call_id}
                            isTest={!!l.call_id && testCallIds.has(l.call_id)}
                            triggerContent={name}
                            title={name}
                            subtitle={`${humanize(l.lead_type)} lead · ${formatDateTime(l.created_at)}`}
                            fields={fields([
                              ["Name", name],
                              ["Type", humanize(l.lead_type)],
                              ["Phone", formatPhoneNumber(l.phone)],
                              ["Email", l.email],
                              ["Budget", budgetRange(l.budget_min_cents, l.budget_max_cents)],
                              ["Timeline", l.timeline ? humanize(l.timeline) : null],
                              ["Source", l.source ? humanize(l.source) : null],
                              ["Status", humanize(l.status)],
                              ["Notes", l.notes],
                              ["Captured", formatDateTime(l.created_at)],
                            ])}
                          />
                        </td>
                        <td className="py-2">{humanize(l.lead_type)}</td>
                        <td className="py-2 font-mono text-muted-foreground">
                          {l.budget_max_cents ? formatMoneyFromCents(l.budget_max_cents) : "—"}
                        </td>
                        <td className="py-2">{l.source ? humanize(l.source) : "—"}</td>
                        <td className="py-2">{statusBadge(l.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="showings" className="mt-4">
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
              const address = fullAddress(listing);
              return (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <OperationsItem
                    callId={s.call_id}
                    isTest={!!s.call_id && testCallIds.has(s.call_id)}
                    triggerContent={
                      <>
                        <span className="font-medium">{address}</span>
                        <span className="block text-xs text-muted-foreground">{formatDateTime(s.scheduled_at)}</span>
                      </>
                    }
                    title={address}
                    subtitle={`Showing · ${formatDateTime(s.scheduled_at)}`}
                    fields={fields([
                      ["Property", address],
                      ["Scheduled for", formatDateTime(s.scheduled_at)],
                      ["Duration", s.duration_minutes ? `${s.duration_minutes} minutes` : null],
                      ["Agent", agent ? `${agent.first_name} ${agent.last_name}` : "Unassigned"],
                      ["Status", humanize(s.status)],
                      ["Interest level", s.interest_level ? humanize(s.interest_level) : null],
                      ["Feedback", s.feedback],
                      ["Booked", formatDateTime(s.created_at)],
                    ])}
                  />
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {agent ? `${agent.first_name} ${agent.last_name[0]}.` : "Unassigned"}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="valuations" className="mt-4">
      <Card className={`border-t-2 ${t.border}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeDollarSign className={`size-5 ${t.icon}`} />
            Valuation Requests
          </CardTitle>
          <CardDescription>Owners asking what their property is worth. Call them back to agree a time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!valuations.length ? (
            <EmptyRow label="No valuation requests yet. Calls asking for a home valuation will show up here." />
          ) : (
            valuations.map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <OperationsItem
                  callId={v.call_id}
                  isTest={!!v.call_id && testCallIds.has(v.call_id)}
                  triggerContent={
                    <>
                      <span className="font-medium">{v.property_address}</span>
                      <span className="block text-xs text-muted-foreground">
                        {v.owner_name} · {formatDateTime(v.created_at)}
                      </span>
                    </>
                  }
                  title={v.property_address}
                  subtitle={`Valuation request · ${formatDateTime(v.created_at)}`}
                  fields={fields([
                    ["Property", v.property_address],
                    ["Property type", v.property_type ? humanize(v.property_type) : null],
                    ["Owner", v.owner_name],
                    ["Phone", formatPhoneNumber(v.owner_phone)],
                    ["Email", v.owner_email],
                    // Deliberately reads as "not yet booked" rather than
                    // showing a blank date: the request is real, the
                    // appointment isn't one until a human agrees it.
                    [
                      "Visit scheduled",
                      v.scheduled_at ? formatDateTime(v.scheduled_at) : "Not booked yet, needs a callback",
                    ],
                    [
                      "Estimated value",
                      v.estimated_value_cents != null ? formatMoneyFromCents(v.estimated_value_cents) : null,
                    ],
                    ["Status", humanize(v.status)],
                    ["Notes", v.notes],
                    ["Requested", formatDateTime(v.created_at)],
                  ])}
                />
                {statusBadge(v.status)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="listings" className="mt-4">
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
                    <p className="font-mono text-sm text-muted-foreground">{formatMoneyFromCents(l.price_cents)}</p>
                  </div>
                  {statusBadge(l.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="maintenance" className="mt-4">

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
                const property = unit?.address ?? "Unknown property";
                return (
                  <div key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <OperationsItem
                        callId={m.call_id}
                        isTest={!!m.call_id && testCallIds.has(m.call_id)}
                        triggerContent={<span className="font-medium">{property}</span>}
                        title={property}
                        subtitle={`Maintenance request · ${humanize(m.category)}`}
                        fields={fields([
                          ["Property", property],
                          ["Category", humanize(m.category)],
                          ["Priority", humanize(m.priority)],
                          ["Status", humanize(m.status)],
                          ["Reported by", m.reporter_name],
                          ["Phone", formatPhoneNumber(m.reporter_phone)],
                          ["Description", m.description],
                          ["Notes", m.notes],
                          ["Reported", formatDateTime(m.created_at)],
                        ])}
                      />
                      {priorityBadge(m.priority)}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{humanize(m.category)}</p>
                      {statusBadge(m.status)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
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
          Real bookings, orders, and outcomes captured by your AI agent. Click any item to see its full details.
        </p>
      </div>

      {industry === "healthcare" && <HealthcarePanel supabase={supabase} tenantId={tenantId} />}
      {industry === "restaurant" && <RestaurantPanel supabase={supabase} tenantId={tenantId} />}
      {industry === "real_estate" && <RealEstatePanel supabase={supabase} tenantId={tenantId} />}
    </div>
  );
}
